/**
 * HAIRVANA — Drizzle ORM schema definitions.
 * Mirrors server/src/db/schema.sql exactly so Drizzle can generate migrations.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  numeric,
  integer,
  smallint,
  real,
  primaryKey,
  check,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    phone_number: varchar('phone_number', { length: 20 }).notNull().unique(),
    password_hash: text('password_hash').notNull(),
    role: varchar('role', { length: 10 })
      .notNull()
      .$type<'client' | 'stylist' | 'vendor' | 'admin'>(),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    emailIdx: index('idx_users_email').on(table.email),
    roleIdx: index('idx_users_role').on(table.role),
    roleCheck: check('chk_users_role', sql`role IN ('client', 'stylist', 'vendor', 'admin')`),
  })
);

// ─── stylist_profiles ─────────────────────────────────────────────────────────

export const stylistProfiles = pgTable(
  'stylist_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    full_name: varchar('full_name', { length: 255 }).notNull(),
    bio: text('bio').notNull().default(''),
    location: varchar('location', { length: 255 }).notNull().default(''),
    house_call_offered: boolean('house_call_offered').notNull().default(false),
    status: varchar('status', { length: 10 })
      .notNull()
      .default('pending')
      .$type<'pending' | 'approved' | 'suspended'>(),
    base_price: numeric('base_price', { precision: 10, scale: 2 }).notNull().default('0'),
    average_rating: real('average_rating').notNull().default(0),
    review_count: integer('review_count').notNull().default(0),
    service_types: text('service_types').array().notNull().default(sql`'{}'`),
    photo_url: text('photo_url'),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    statusIdx: index('idx_stylist_profiles_status').on(table.status),
    locationIdx: index('idx_stylist_profiles_location').on(table.location),
    statusCheck: check(
      'chk_stylist_status',
      sql`status IN ('pending', 'approved', 'suspended')`
    ),
  })
);

// ─── vendor_profiles ──────────────────────────────────────────────────────────

export const vendorProfiles = pgTable(
  'vendor_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    business_name: varchar('business_name', { length: 255 }).notNull(),
    owner_name: varchar('owner_name', { length: 255 }).notNull(),
    location: varchar('location', { length: 255 }).notNull().default(''),
    mpesa_paybill: varchar('mpesa_paybill', { length: 20 }).notNull(),
    status: varchar('status', { length: 10 })
      .notNull()
      .default('pending')
      .$type<'pending' | 'approved' | 'suspended'>(),
    average_rating: real('average_rating').notNull().default(0),
    logo_url: text('logo_url'),
    product_categories: text('product_categories').array().notNull().default(sql`'{}'`),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    statusIdx: index('idx_vendor_profiles_status').on(table.status),
    locationIdx: index('idx_vendor_profiles_location').on(table.location),
    statusCheck: check(
      'chk_vendor_status',
      sql`status IN ('pending', 'approved', 'suspended')`
    ),
  })
);

// ─── hairstyles ───────────────────────────────────────────────────────────────

export const hairstyles = pgTable(
  'hairstyles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').notNull().default(''),
    category: varchar('category', { length: 100 }).notNull(),
    estimated_duration_mins: integer('estimated_duration_mins').notNull().default(0),
    platform_fee: numeric('platform_fee', { precision: 10, scale: 2 }).notNull().default('0'),
    photo_urls: text('photo_urls').array().notNull().default(sql`'{}'`),
    hair_lengths: text('hair_lengths').array().notNull().default(sql`'{}'`),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    categoryIdx: index('idx_hairstyles_category').on(table.category),
  })
);

// ─── products ─────────────────────────────────────────────────────────────────

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    vendor_id: uuid('vendor_id')
      .notNull()
      .references(() => vendorProfiles.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').notNull().default(''),
    price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),
    stock_quantity: integer('stock_quantity').notNull().default(0),
    is_out_of_stock: boolean('is_out_of_stock').notNull().default(false),
    photo_urls: text('photo_urls').array().notNull().default(sql`'{}'`),
    category: varchar('category', { length: 100 }),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    vendorIdx: index('idx_products_vendor_id').on(table.vendor_id),
    outOfStockIdx: index('idx_products_out_of_stock').on(table.is_out_of_stock),
  })
);

// ─── hairstyle_products (join table) ─────────────────────────────────────────

export const hairstyleProducts = pgTable(
  'hairstyle_products',
  {
    hairstyle_id: uuid('hairstyle_id')
      .notNull()
      .references(() => hairstyles.id, { onDelete: 'cascade' }),
    product_id: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    quantity_required: integer('quantity_required').notNull().default(1),
  },
  table => ({
    pk: primaryKey({ columns: [table.hairstyle_id, table.product_id] }),
    hairstyleIdx: index('idx_hairstyle_products_hairstyle').on(table.hairstyle_id),
    productIdx: index('idx_hairstyle_products_product').on(table.product_id),
  })
);

// ─── bookings ─────────────────────────────────────────────────────────────────

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    client_id: uuid('client_id')
      .notNull()
      .references(() => users.id),
    stylist_id: uuid('stylist_id')
      .notNull()
      .references(() => stylistProfiles.id),
    hairstyle_id: uuid('hairstyle_id')
      .notNull()
      .references(() => hairstyles.id),
    status: varchar('status', { length: 12 })
      .notNull()
      .default('Pending')
      .$type<'Pending' | 'Confirmed' | 'Declined' | 'Completed' | 'Cancelled'>(),
    is_house_call: boolean('is_house_call').notNull().default(false),
    delivery_address: text('delivery_address'),
    total_cost: numeric('total_cost', { precision: 10, scale: 2 }).notNull().default('0'),
    deposit_amount: numeric('deposit_amount', { precision: 10, scale: 2 }).notNull().default('0'),
    appointment_at: timestamp('appointment_at', { withTimezone: true }).notNull(),
    confirmed_at: timestamp('confirmed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    clientIdx: index('idx_bookings_client_id').on(table.client_id),
    stylistIdx: index('idx_bookings_stylist_id').on(table.stylist_id),
    statusIdx: index('idx_bookings_status').on(table.status),
    createdIdx: index('idx_bookings_created_at').on(table.created_at),
    statusCheck: check(
      'chk_booking_status',
      sql`status IN ('Pending', 'Confirmed', 'Declined', 'Completed', 'Cancelled')`
    ),
    houseCallAddressCheck: check(
      'chk_house_call_address',
      sql`is_house_call = FALSE OR (delivery_address IS NOT NULL AND delivery_address <> '')`
    ),
  })
);

// ─── payments ─────────────────────────────────────────────────────────────────

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    booking_id: uuid('booking_id')
      .notNull()
      .unique()
      .references(() => bookings.id),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    mpesa_reference: varchar('mpesa_reference', { length: 50 }),
    phone_number: varchar('phone_number', { length: 20 }).notNull(),
    status: varchar('status', { length: 8 })
      .notNull()
      .default('Pending')
      .$type<'Pending' | 'Paid' | 'Failed'>(),
    paid_at: timestamp('paid_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    bookingIdx: index('idx_payments_booking_id').on(table.booking_id),
    statusIdx: index('idx_payments_status').on(table.status),
    statusCheck: check(
      'chk_payment_status',
      sql`status IN ('Pending', 'Paid', 'Failed')`
    ),
  })
);

// ─── reviews ──────────────────────────────────────────────────────────────────

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    booking_id: uuid('booking_id')
      .notNull()
      .unique()
      .references(() => bookings.id),
    client_id: uuid('client_id')
      .notNull()
      .references(() => users.id),
    stylist_id: uuid('stylist_id')
      .notNull()
      .references(() => stylistProfiles.id),
    star_rating: smallint('star_rating').notNull(),
    comment: text('comment'),
    is_flagged: boolean('is_flagged').notNull().default(false),
    is_hidden: boolean('is_hidden').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    stylistIdx: index('idx_reviews_stylist_id').on(table.stylist_id),
    clientIdx: index('idx_reviews_client_id').on(table.client_id),
    isHiddenIdx: index('idx_reviews_is_hidden').on(table.is_hidden),
    starRatingCheck: check('chk_star_rating', sql`star_rating BETWEEN 1 AND 5`),
  })
);

// ─── portfolio_photos ─────────────────────────────────────────────────────────

export const portfolioPhotos = pgTable(
  'portfolio_photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stylist_id: uuid('stylist_id')
      .notNull()
      .references(() => stylistProfiles.id, { onDelete: 'cascade' }),
    image_url: text('image_url').notNull(),
    caption: text('caption'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    stylistIdx: index('idx_portfolio_photos_stylist').on(table.stylist_id),
  })
);

// ─── notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    event_type: varchar('event_type', { length: 50 }).notNull(),
    message: text('message').notNull(),
    is_read: boolean('is_read').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => ({
    userIdx: index('idx_notifications_user_id').on(table.user_id),
    isReadIdx: index('idx_notifications_is_read').on(table.is_read),
    createdIdx: index('idx_notifications_created').on(table.created_at),
  })
);
