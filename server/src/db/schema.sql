-- HAIRVANA PostgreSQL Schema
-- All tables follow the ERD defined in the design document.
-- Run migrations via Drizzle ORM; this file is the canonical reference.

-- Enable uuid-ossp extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── users ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) NOT NULL UNIQUE,
  phone_number    VARCHAR(20)  NOT NULL UNIQUE,
  password_hash   TEXT         NOT NULL,
  role            VARCHAR(10)  NOT NULL CHECK (role IN ('client', 'stylist', 'vendor', 'admin')),
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email   ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role    ON users (role);

-- ─── stylist_profiles ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stylist_profiles (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  full_name           VARCHAR(255)  NOT NULL,
  bio                 TEXT          NOT NULL DEFAULT '',
  location            VARCHAR(255)  NOT NULL DEFAULT '',
  house_call_offered  BOOLEAN       NOT NULL DEFAULT FALSE,
  status              VARCHAR(10)   NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'suspended')),
  base_price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  average_rating      REAL          NOT NULL DEFAULT 0,
  review_count        INTEGER       NOT NULL DEFAULT 0,
  service_types       TEXT[]        NOT NULL DEFAULT '{}',
  photo_url           TEXT,
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stylist_profiles_status   ON stylist_profiles (status);
CREATE INDEX IF NOT EXISTS idx_stylist_profiles_location ON stylist_profiles (location);

-- ─── vendor_profiles ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vendor_profiles (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  business_name       VARCHAR(255)  NOT NULL,
  owner_name          VARCHAR(255)  NOT NULL,
  location            VARCHAR(255)  NOT NULL DEFAULT '',
  mpesa_paybill       VARCHAR(20)   NOT NULL,
  status              VARCHAR(10)   NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'suspended')),
  average_rating      REAL          NOT NULL DEFAULT 0,
  logo_url            TEXT,
  product_categories  TEXT[]        NOT NULL DEFAULT '{}',
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_profiles_status   ON vendor_profiles (status);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_location ON vendor_profiles (location);

-- ─── hairstyles ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hairstyles (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    VARCHAR(255)  NOT NULL,
  description             TEXT          NOT NULL DEFAULT '',
  category                VARCHAR(100)  NOT NULL,
  estimated_duration_mins INTEGER       NOT NULL DEFAULT 0,
  platform_fee            NUMERIC(10,2) NOT NULL DEFAULT 0,
  photo_urls              TEXT[]        NOT NULL DEFAULT '{}',
  hair_lengths            TEXT[]        NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hairstyles_category   ON hairstyles (category);
CREATE INDEX IF NOT EXISTS idx_hairstyles_name_desc  ON hairstyles USING gin(to_tsvector('english', name || ' ' || description));

-- ─── products ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id       UUID          NOT NULL REFERENCES vendor_profiles (id) ON DELETE CASCADE,
  name            VARCHAR(255)  NOT NULL,
  description     TEXT          NOT NULL DEFAULT '',
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_quantity  INTEGER       NOT NULL DEFAULT 0,
  is_out_of_stock BOOLEAN       NOT NULL DEFAULT FALSE,
  photo_urls      TEXT[]        NOT NULL DEFAULT '{}',
  category        VARCHAR(100),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_vendor_id      ON products (vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_out_of_stock   ON products (is_out_of_stock);

-- ─── hairstyle_products (join table) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hairstyle_products (
  hairstyle_id      UUID    NOT NULL REFERENCES hairstyles (id) ON DELETE CASCADE,
  product_id        UUID    NOT NULL REFERENCES products (id)   ON DELETE CASCADE,
  quantity_required INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (hairstyle_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_hairstyle_products_hairstyle ON hairstyle_products (hairstyle_id);
CREATE INDEX IF NOT EXISTS idx_hairstyle_products_product   ON hairstyle_products (product_id);

-- ─── bookings ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bookings (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID          NOT NULL REFERENCES users (id),
  stylist_id       UUID          NOT NULL REFERENCES stylist_profiles (id),
  hairstyle_id     UUID          NOT NULL REFERENCES hairstyles (id),
  status           VARCHAR(12)   NOT NULL DEFAULT 'Pending'
                     CHECK (status IN ('Pending', 'Confirmed', 'Declined', 'Completed', 'Cancelled')),
  is_house_call    BOOLEAN       NOT NULL DEFAULT FALSE,
  delivery_address TEXT,
  total_cost       NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  appointment_at   TIMESTAMPTZ   NOT NULL,
  confirmed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_client_id   ON bookings (client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_stylist_id  ON bookings (stylist_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status      ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at  ON bookings (created_at);

-- Constraint: house-call bookings must have a delivery address
ALTER TABLE bookings
  ADD CONSTRAINT chk_house_call_address
    CHECK (is_house_call = FALSE OR (delivery_address IS NOT NULL AND delivery_address <> ''));

-- ─── payments ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID          NOT NULL UNIQUE REFERENCES bookings (id),
  amount           NUMERIC(10,2) NOT NULL,
  mpesa_reference  VARCHAR(50),
  phone_number     VARCHAR(20)   NOT NULL,
  status           VARCHAR(8)    NOT NULL DEFAULT 'Pending'
                     CHECK (status IN ('Pending', 'Paid', 'Failed')),
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status     ON payments (status);

-- ─── reviews ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID        NOT NULL UNIQUE REFERENCES bookings (id),
  client_id   UUID        NOT NULL REFERENCES users (id),
  stylist_id  UUID        NOT NULL REFERENCES stylist_profiles (id),
  star_rating SMALLINT    NOT NULL CHECK (star_rating BETWEEN 1 AND 5),
  comment     TEXT,
  is_flagged  BOOLEAN     NOT NULL DEFAULT FALSE,
  is_hidden   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_stylist_id ON reviews (stylist_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id  ON reviews (client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_hidden  ON reviews (is_hidden);

-- ─── portfolio_photos ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS portfolio_photos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  stylist_id  UUID        NOT NULL REFERENCES stylist_profiles (id) ON DELETE CASCADE,
  image_url   TEXT        NOT NULL,
  caption     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_photos_stylist ON portfolio_photos (stylist_id);

-- ─── notifications ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  event_type  VARCHAR(50) NOT NULL,
  message     TEXT        NOT NULL,
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read  ON notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created  ON notifications (created_at);
