/**
 * HAIRVANA — Bundle Cost Calculator
 *
 * Calculates the itemised bundle cost for a hairstyle, with or without a
 * specific stylist.
 *
 * Formula:
 *   products_subtotal = SUM(product.price × quantity_required)
 *   service_fee       = stylist.base_price  (0 when no stylist selected)
 *   platform_fee      = hairstyle.platform_fee
 *   total             = products_subtotal + service_fee + platform_fee
 *
 * Results are cached in Redis for 1 hour (TTL.BUNDLE_COST).
 * Cache is invalidated by calling:
 *   - invalidateBundleCostForHairstyle(hairstyleId)   — on product price change
 *   - invalidateBundleCostForStylist(stylistId)        — on stylist fee change
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 8.5
 */

import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { hairstyles, hairstyleProducts, products, stylistProfiles } from '../db/schema.js';
import { getOrSet, invalidate, invalidatePattern, CacheKey, TTL } from '../cache/redis.js';
import type { BundleCost, BundleCostLineItem } from '@hairvana/shared';

// ─── Public interface ─────────────────────────────────────────────────────────

export interface BundleCostCalculator {
  calculate(hairstyleId: string, stylistId?: string): Promise<BundleCost>;
}

// ─── Pure calculation helpers (exported for unit / property tests) ────────────

export interface ProductInput {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity_required: number;
}

/**
 * Pure function: build an itemised BundleCost from raw inputs.
 * No I/O — safe to call in property-based tests without mocking.
 */
export function calculateBundleCost(
  hairstyleId: string,
  stylistId: string | null,
  productInputs: ProductInput[],
  stylistServiceFee: number,
  platformFee: number
): BundleCost {
  const line_items: BundleCostLineItem[] = productInputs.map(p => ({
    product_id: p.product_id,
    product_name: p.product_name,
    unit_price: p.unit_price,
    quantity_required: p.quantity_required,
    subtotal: p.unit_price * p.quantity_required,
  }));

  const products_subtotal = line_items.reduce((sum, item) => sum + item.subtotal, 0);
  const service_fee = stylistServiceFee;
  const platform_fee = platformFee;
  const total = products_subtotal + service_fee + platform_fee;

  return {
    hairstyle_id: hairstyleId,
    stylist_id: stylistId,
    line_items,
    products_subtotal,
    service_fee,
    platform_fee,
    total,
  };
}

// ─── Database-backed calculator ───────────────────────────────────────────────

/**
 * Fetches hairstyle, required products, and (optionally) stylist data from
 * the database, computes the bundle cost, and caches the result.
 *
 * Throws if the hairstyle is not found.
 * Throws if a non-null stylistId resolves to no profile.
 */
async function fetchAndCalculate(
  hairstyleId: string,
  stylistId: string | undefined
): Promise<BundleCost> {
  // 1. Fetch the hairstyle
  const [hairstyle] = await db
    .select()
    .from(hairstyles)
    .where(eq(hairstyles.id, hairstyleId))
    .limit(1);

  if (!hairstyle) {
    throw new Error(`Hairstyle not found: ${hairstyleId}`);
  }

  // 2. Fetch required products via hairstyle_products join
  const rows = await db
    .select({
      product_id: products.id,
      product_name: products.name,
      unit_price: products.price,
      quantity_required: hairstyleProducts.quantity_required,
    })
    .from(hairstyleProducts)
    .innerJoin(products, eq(hairstyleProducts.product_id, products.id))
    .where(eq(hairstyleProducts.hairstyle_id, hairstyleId));

  const productInputs: ProductInput[] = rows.map(r => ({
    product_id: r.product_id,
    product_name: r.product_name,
    // Drizzle returns numeric columns as strings from pg driver; coerce to number
    unit_price: Number(r.unit_price),
    quantity_required: r.quantity_required,
  }));

  // 3. Fetch stylist fee if a stylist is specified
  let stylistServiceFee = 0;
  let resolvedStylistId: string | null = stylistId ?? null;

  if (stylistId) {
    const [stylist] = await db
      .select({ id: stylistProfiles.id, base_price: stylistProfiles.base_price })
      .from(stylistProfiles)
      .where(eq(stylistProfiles.id, stylistId))
      .limit(1);

    if (!stylist) {
      throw new Error(`Stylist not found: ${stylistId}`);
    }
    stylistServiceFee = Number(stylist.base_price);
    resolvedStylistId = stylist.id;
  }

  const platformFee = Number(hairstyle.platform_fee);

  return calculateBundleCost(
    hairstyleId,
    resolvedStylistId,
    productInputs,
    stylistServiceFee,
    platformFee
  );
}

// ─── Exported calculator instance ────────────────────────────────────────────

export const bundleCostCalculator: BundleCostCalculator = {
  /**
   * Returns the cached bundle cost if available, otherwise fetches from DB
   * and caches the result for TTL.BUNDLE_COST (1 hour).
   */
  async calculate(hairstyleId: string, stylistId?: string): Promise<BundleCost> {
    const key = CacheKey.bundleCost(hairstyleId, stylistId);
    return getOrSet(key, () => fetchAndCalculate(hairstyleId, stylistId), TTL.BUNDLE_COST);
  },
};

// ─── Cache invalidation helpers ───────────────────────────────────────────────

/**
 * Invalidate all cached bundle costs for a given hairstyle.
 * Call when any product price or quantity linked to this hairstyle changes.
 *
 * Requirements: 3.4
 */
export async function invalidateBundleCostForHairstyle(hairstyleId: string): Promise<void> {
  // Pattern covers both generic (no stylist) and all per-stylist variants
  await invalidatePattern(`hairvana:bundle:${hairstyleId}:*`);
}

/**
 * Invalidate all cached bundle costs that reference a specific stylist.
 * Call when a stylist updates their service fee.
 *
 * Requirements: 8.5
 */
export async function invalidateBundleCostForStylist(stylistId: string): Promise<void> {
  await invalidatePattern(`hairvana:bundle:*:${stylistId}`);
}

/**
 * Invalidate a single exact bundle cost cache entry.
 */
export async function invalidateBundleCostEntry(
  hairstyleId: string,
  stylistId?: string
): Promise<void> {
  await invalidate(CacheKey.bundleCost(hairstyleId, stylistId));
}
