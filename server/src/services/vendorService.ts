/**
 * HAIRVANA — Vendor Service
 *
 * Client-facing queries enforce the visibility gate: only `approved` vendor
 * profiles are returned.  When a vendor is suspended, their products are
 * excluded from all client-facing pages within 1 hour (achieved by
 * invalidating the relevant Redis cache keys).
 *
 * Requirements: 5.1, 5.2, 5.4, 5.5, 9.2, 9.5
 */

import { eq, and, ilike, or, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { vendorProfiles, products } from '../db/schema.js';
import {
  getOrSet,
  invalidate,
  invalidatePattern,
  TTL,
  CacheKey,
} from '../cache/redis.js';
import type {
  VendorFilterParams,
  VendorListItem,
  VendorDetail,
} from '@hairvana/shared/src/types.js';

// ─── Extra cache key helpers for vendor-scoped data ───────────────────────────

const VendorCacheKey = {
  /** Paginated vendor list with optional filters serialised into the key */
  vendorList: (page: number, pageSize: number, filters: string) =>
    `hairvana:vendors:list:${page}:${pageSize}:${filters}`,
  /** Full vendor profile + catalogue */
  vendorDetail: (id: string) => `hairvana:vendors:${id}`,
  /** All products belonging to a specific vendor */
  vendorProducts: (vendorId: string) => `hairvana:vendors:${vendorId}:products`,
} as const;

// TTL: vendor list / detail use the same 1-hr product-stock TTL so visibility
// changes propagate within 1 hour as required by 5.5 / 9.5.
const VENDOR_LIST_TTL = TTL.PRODUCT_STOCK; // 1 hr
const VENDOR_DETAIL_TTL = TTL.PRODUCT_STOCK; // 1 hr

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch a paginated, filtered list of vendors.
 *
 * VISIBILITY GATE (Req 5.4, 9.2): only `status = 'approved'` vendors are
 * returned.  The `is_verified` flag in the response is always `true` for
 * every item returned by this function (as the gate guarantees approval).
 */
export async function listVendors(params: VendorFilterParams = {}): Promise<VendorListItem[]> {
  const {
    keyword,
    location,
    product_category,
    page = 1,
    page_size = 20,
  } = params;

  const filterKey = JSON.stringify({ keyword, location, product_category });
  const cacheKey = VendorCacheKey.vendorList(page, page_size, filterKey);

  return getOrSet<VendorListItem[]>(
    cacheKey,
    async () => {
      const conditions = [
        // Visibility gate — only approved vendors
        eq(vendorProfiles.status, 'approved'),
      ];

      if (keyword) {
        conditions.push(
          or(
            ilike(vendorProfiles.business_name, `%${keyword}%`),
            ilike(vendorProfiles.owner_name, `%${keyword}%`)
          )!
        );
      }

      if (location) {
        conditions.push(ilike(vendorProfiles.location, `%${location}%`));
      }

      // Filter by product_category: check if the array column contains the value
      if (product_category) {
        conditions.push(
          sql`${vendorProfiles.product_categories} @> ARRAY[${product_category}]::text[]`
        );
      }

      const offset = (page - 1) * page_size;

      const rows = await db
        .select({
          id: vendorProfiles.id,
          business_name: vendorProfiles.business_name,
          logo_url: vendorProfiles.logo_url,
          location: vendorProfiles.location,
          average_rating: vendorProfiles.average_rating,
          product_categories: vendorProfiles.product_categories,
          status: vendorProfiles.status,
        })
        .from(vendorProfiles)
        .where(and(...conditions))
        .limit(page_size)
        .offset(offset);

      return rows.map(row => ({
        id: row.id,
        business_name: row.business_name,
        logo_url: row.logo_url,
        location: row.location,
        average_rating: row.average_rating,
        product_categories: row.product_categories,
        // Visibility gate guarantees every returned vendor is approved/verified
        is_verified: row.status === 'approved',
      }));
    },
    VENDOR_LIST_TTL
  );
}

/**
 * Fetch a single vendor's full profile including their product catalogue.
 *
 * VISIBILITY GATE (Req 5.4): returns null when the vendor is not `approved`
 * so suspended/pending vendors are never exposed to clients.
 */
export async function getVendorById(vendorId: string): Promise<VendorDetail | null> {
  const cacheKey = VendorCacheKey.vendorDetail(vendorId);

  return getOrSet<VendorDetail | null>(
    cacheKey,
    async () => {
      const [vendor] = await db
        .select()
        .from(vendorProfiles)
        .where(
          and(
            eq(vendorProfiles.id, vendorId),
            // Visibility gate — only expose approved vendors
            eq(vendorProfiles.status, 'approved')
          )
        )
        .limit(1);

      if (!vendor) return null;

      const vendorProducts = await db
        .select()
        .from(products)
        .where(eq(products.vendor_id, vendorId));

      return {
        id: vendor.id,
        user_id: vendor.user_id,
        business_name: vendor.business_name,
        owner_name: vendor.owner_name,
        location: vendor.location,
        mpesa_paybill: vendor.mpesa_paybill,
        status: vendor.status,
        average_rating: vendor.average_rating,
        logo_url: vendor.logo_url,
        product_categories: vendor.product_categories,
        updated_at: vendor.updated_at.toISOString(),
        // Verified badge: present only when status is 'approved'
        is_verified: vendor.status === 'approved',
        products: vendorProducts.map(p => ({
          id: p.id,
          vendor_id: p.vendor_id,
          name: p.name,
          description: p.description,
          price: Number(p.price),
          stock_quantity: p.stock_quantity,
          is_out_of_stock: p.is_out_of_stock,
          photo_urls: p.photo_urls,
          updated_at: p.updated_at.toISOString(),
        })),
      };
    },
    VENDOR_DETAIL_TTL
  );
}

/**
 * Retrieve a vendor profile regardless of status (used by admin and vendor-
 * facing routes that need to see pending/suspended profiles).
 */
export async function getVendorByIdInternal(
  vendorId: string
): Promise<typeof vendorProfiles.$inferSelect | null> {
  const [vendor] = await db
    .select()
    .from(vendorProfiles)
    .where(eq(vendorProfiles.id, vendorId))
    .limit(1);

  return vendor ?? null;
}

/**
 * Update vendor status (approve / suspend / reinstate).
 *
 * On status change, all cached data for this vendor is invalidated so that
 * client-facing pages reflect the change within the Redis TTL window (≤1 hr).
 *
 * Req 5.5 / 9.5: when suspended, vendor products disappear from client pages
 * within 1 hr.  Since we invalidate immediately, the change takes effect on
 * the next request, well within the 1-hr requirement.
 */
export async function updateVendorStatus(
  vendorId: string,
  status: 'pending' | 'approved' | 'suspended'
): Promise<void> {
  await db
    .update(vendorProfiles)
    .set({ status, updated_at: new Date() })
    .where(eq(vendorProfiles.id, vendorId));

  // Invalidate vendor detail and all vendor list pages
  await invalidate(VendorCacheKey.vendorDetail(vendorId));
  await invalidate(VendorCacheKey.vendorProducts(vendorId));
  await invalidatePattern('hairvana:vendors:list:*');

  // If suspended: also invalidate hairstyle detail pages so hairstyle
  // recommendation results no longer show this vendor's products (Req 5.5, 9.5)
  await invalidatePattern('hairvana:hairstyles:*');
  // Bundle costs referencing this vendor's products must also be refreshed
  await invalidatePattern('hairvana:bundle:*');
}

/**
 * Invalidate all client-facing caches for a specific vendor.
 * Called by the product service when product stock changes.
 */
export async function invalidateVendorCache(vendorId: string): Promise<void> {
  await invalidate(VendorCacheKey.vendorDetail(vendorId));
  await invalidate(VendorCacheKey.vendorProducts(vendorId));
  await invalidatePattern('hairvana:vendors:list:*');
}
