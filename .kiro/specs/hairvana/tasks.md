# Implementation Plan: HAIRVANA

## Overview

Build HAIRVANA as a mobile-first PWA using React + TypeScript (frontend) and Node.js + Express + TypeScript (backend), backed by PostgreSQL, Redis, and AWS S3/CloudFront. The implementation follows the layered architecture defined in the design: database schema → service layer → API routes → frontend screens → PWA/offline support → admin tools. Property-based tests (fast-check) are included alongside each major component to verify the correctness properties from the design.

---

## Tasks

- [-] 1. Project setup and shared foundations
  - Initialise monorepo (or separate `client/` and `server/` directories) with TypeScript, ESLint, Prettier, and Vitest configured for both packages
  - Create `server/src/db/schema.sql` with all PostgreSQL table definitions from the ERD: `users`, `stylist_profiles`, `vendor_profiles`, `hairstyles`, `products`, `hairstyle_products`, `bookings`, `payments`, `reviews`, `portfolio_photos`, `notifications`
  - Add database migration tooling (e.g., `node-postgres` + `db-migrate` or `Drizzle` migrations) and seed script for local dev data
  - Configure Redis connection and base cache utility (`server/src/cache/redis.ts`)
  - Define shared TypeScript types/interfaces for all domain entities and API response shapes (`shared/types.ts`)
  - Set up Vite + React PWA scaffold with Tailwind CSS, Workbox plugin, and manifest for the client
  - _Requirements: 12.1, 12.3_

- [ ] 2. Authentication and authorisation
  - [-] 2.1 Implement auth routes and JWT middleware
    - Create `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` in `server/src/routes/auth.ts`
    - Implement role-based JWT middleware (`client | stylist | vendor | admin`) that guards all protected routes
    - Hash passwords with bcrypt; store only the hash; never store M-Pesa PINs or raw credentials
    - Validate E.164 phone number format on registration
    - _Requirements: 8.1, 9.1, 7.7_

  - [ ]* 2.2 Write property test for registration validation (Property 13)
    - **Property 13: Registration validation rejects payloads with missing required fields**
    - **Validates: Requirements 8.1, 9.1**

  - [~] 2.3 Write unit tests for auth edge cases
    - Test: duplicate email/phone returns 409; expired JWT returns 401; wrong role returns 403; valid full payload creates account with status `pending`
    - _Requirements: 8.1, 8.2, 9.1, 9.2_

- [ ] 3. Hairstyle service and API
  - [-] 3.1 Implement hairstyle data layer and service
    - Create `server/src/services/hairstyleService.ts` with list/filter/search and detail queries
    - Implement keyword search against `name` and `description` (case-insensitive, indexed)
    - Apply all filter predicates (category, price range, hair length) in a single query so results satisfy every active filter simultaneously
    - Cache first-page hairstyle gallery in Redis (TTL 5 min); invalidate on Admin update
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [-] 3.2 Implement bundle cost calculator
    - Create `server/src/services/bundleCost.ts` implementing `BundleCostCalculator.calculate(hairstyleId, stylistId?)`
    - Formula: `SUM(product.price × quantity_required) + stylist.service_fee + hairstyle.platform_fee`
    - Each component is returned itemised; cache result for 1 hr (Redis); invalidate on price/fee change
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.5_

  - [ ]* 3.3 Write property test for bundle cost arithmetic (Property 4)
    - **Property 4: Bundle cost arithmetic is always correct**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 8.5**

  - [~] 3.4 Expose hairstyle API endpoints
    - Wire `GET /hairstyles`, `GET /hairstyles/:id`, `POST /hairstyles` (Admin), `PATCH /hairstyles/:id` (Admin) in `server/src/routes/hairstyles.ts`
    - Ensure `GET /hairstyles/:id` response includes: name, photos, description, estimated duration, bundle cost, recommended products list with quantities and prices
    - Return `"no results"` message body when filters/search yield zero records
    - _Requirements: 1.1, 1.4, 2.1_

  - [ ]* 3.5 Write property test for required fields in entity responses (Property 3)
    - **Property 3: Required fields are always present in entity responses**
    - **Validates: Requirements 1.1, 1.4, 2.1, 2.3, 4.1, 4.3, 4.4, 5.1, 5.2**

  - [ ]* 3.6 Write property test for filter predicate correctness (Property 1)
    - **Property 1: Filter results always satisfy all active filter predicates**
    - **Validates: Requirements 1.2, 3.5, 4.2, 5.3**

  - [ ]* 3.7 Write property test for keyword search (Property 2)
    - **Property 2: Search results always contain the search keyword**
    - **Validates: Requirements 1.3**

- [ ] 4. Product, vendor, and stylist services
  - [-] 4.1 Implement vendor and product data layer
    - Create `server/src/services/vendorService.ts` and `server/src/services/productService.ts`
    - Visibility gate: only `approved` vendor profiles appear in client-facing queries
    - Propagate `is_out_of_stock` to all hairstyle pages within 1 hr (Redis cache invalidation + DB flag)
    - When a vendor is suspended, remove all their product listings from client-facing pages within 1 hr
    - Cache product stock status (TTL 1 hr); invalidate when vendor marks out-of-stock
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 9.3, 9.4, 9.5_

  - [ ]* 4.2 Write property test for visibility gate (Property 5)
    - **Property 5: Visibility gate — only approved accounts appear in client-facing results**
    - **Validates: Requirements 5.4, 5.5, 8.2, 8.6, 9.2, 9.5**

  - [ ]* 4.3 Write property test for product-vendor link invariant (Property 6)
    - **Property 6: Every recommended product has at least one verified vendor, or is marked out-of-stock**
    - **Validates: Requirements 2.2, 2.4**

  - [-] 4.4 Implement stylist data layer
    - Create `server/src/services/stylistService.ts`
    - Visibility gate: only `approved` stylists appear in client-facing queries
    - When a stylist fee changes, invalidate bundle cost cache entries referencing that stylist within 1 hr
    - When availability calendar updates, reflect changes on public profile within 5 min (short cache TTL)
    - _Requirements: 4.1, 4.2, 4.4, 8.2, 8.5, 8.6_

  - [~] 4.5 Expose vendor, product, and stylist API endpoints
    - Wire `GET /vendors`, `GET /vendors/:id`, `POST /vendors/:id/products`, `PATCH /vendors/:id/products/:pid`
    - Wire `GET /stylists`, `GET /stylists/:id`, `PATCH /stylists/:id`, `POST /stylists/:id/portfolio`
    - Ensure "Verified" badge is present on every `approved` vendor response and absent on all others
    - _Requirements: 2.1, 2.3, 4.1, 4.3, 5.1, 5.2, 5.4_

- [~] 5. Checkpoint — core data layer
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Booking service and API
  - [-] 6.1 Implement booking state machine
    - Create `server/src/services/bookingService.ts` implementing all `BookingService` interface methods
    - Enforce valid state transitions: only `Pending → Confirmed`, `Pending → Declined`, `Confirmed → Completed`, `Pending → Cancelled` (auto-expire), `Confirmed → Cancelled` (within 24 h window)
    - For house-call bookings (`is_house_call = true`), require non-null, non-empty `delivery_address`
    - Store `total_cost` snapshot at booking creation time to prevent retroactive price changes
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 6.2 Write property test for booking state machine (Property 7)
    - **Property 7: Booking state machine transitions are valid and consistent**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.6, 6.7**

  - [ ]* 6.3 Write property test for cancellation eligibility (Property 8)
    - **Property 8: Cancellation eligibility is determined by time remaining before appointment**
    - **Validates: Requirements 6.5**

  - [~] 6.4 Implement booking auto-expiry cron job
    - Create `server/src/jobs/autoExpireBookings.ts` — runs every 15 min, selects `status = 'Pending' AND created_at < NOW() - INTERVAL '24 hours'`, sets status to `Cancelled`, emits `BOOKING_AUTO_CANCELLED` event
    - _Requirements: 6.7_

  - [~] 6.5 Expose booking API endpoints
    - Wire `POST /bookings`, `GET /bookings/:id`, `PATCH /bookings/:id/confirm`, `PATCH /bookings/:id/decline`, `PATCH /bookings/:id/cancel`, `PATCH /bookings/:id/complete`
    - Apply role guards: only the booking's Stylist may confirm/decline; only the booking's Client may cancel
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [ ] 7. M-Pesa payment service and API
  - [-] 7.1 Implement M-Pesa STK Push integration
    - Create `server/src/services/paymentService.ts` implementing `PaymentService` interface
    - `initiateSTKPush`: validate phone number (E.164), pass exact booking due-amount and client phone to Daraja; do not store PINs or raw credentials; only persist `mpesa_reference` from Daraja response
    - Implement `handleCallback`: on success set `payment.status = 'Paid'`, update booking payment status, emit `PAYMENT_RECEIVED`; on failure set `payment.status = 'Failed'`
    - Implement 60-second callback timeout fallback: poll Daraja Query API; if still pending, display "processing" state
    - Rate-limit payment initiation (max attempts per booking); return 429 with `retry-after` header
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.7_

  - [ ]* 7.2 Write property test for STK Push parameter correctness (Property 9)
    - **Property 9: M-Pesa STK Push always uses the correct amount and phone number**
    - **Validates: Requirements 7.2**

  - [ ]* 7.3 Write property test for payment callback transitions (Property 10)
    - **Property 10: Payment callback correctly transitions payment and booking status**
    - **Validates: Requirements 7.3, 7.5, 7.6**

  - [~] 7.4 Expose payment API endpoints and receipt
    - Wire `POST /payments/initiate`, `POST /payments/callback` (Daraja webhook — no auth), `GET /payments/:bookingId/receipt`
    - Receipt response must include: amount paid, M-Pesa reference number, date, time, booking details; if deposit paid, show remaining balance = `total_cost - amount_already_paid`
    - _Requirements: 7.3, 7.5, 7.6_

- [ ] 8. Reviews and ratings
  - [-] 8.1 Implement review service
    - Create `server/src/services/reviewService.ts`
    - Gate review creation: reject if `booking.status !== 'Completed'`; enforce one-per-booking uniqueness (409 on duplicate)
    - On new review: recalculate `stylist.average_rating = MEAN(star_rating WHERE is_hidden = false)` and update `STYLIST_PROFILE` within 5 min
    - Admin flag/removal: set `is_hidden = true`; immediately exclude from public queries and rating recalculation
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 8.2 Write property test for review gating (Property 11)
    - **Property 11: Review submission is gated on booking completion and one-per-booking uniqueness**
    - **Validates: Requirements 10.1, 10.3**

  - [ ]* 8.3 Write property test for rating arithmetic (Property 12)
    - **Property 12: Stylist average rating is always the arithmetic mean of all non-hidden reviews**
    - **Validates: Requirements 10.4, 10.5**

  - [~] 8.4 Expose review API endpoints
    - Wire `POST /reviews` (Client, auth required) and `GET /stylists/:id/reviews`
    - Return "No reviews yet" in stylist detail when review count is zero
    - _Requirements: 4.5, 10.1, 10.2_

- [ ] 9. Notification service
  - [-] 9.1 Implement notification service
    - Create `server/src/services/notificationService.ts` implementing `NotificationService` interface
    - Integrate Africa's Talking for SMS and Firebase Cloud Messaging (FCM) for push notifications
    - Emit and handle events: `BOOKING_CREATED`, `BOOKING_CONFIRMED`, `BOOKING_DECLINED`, `BOOKING_CANCELLED`, `BOOKING_AUTO_CANCELLED`, `PAYMENT_RECEIVED`, `PAYMENT_FAILED`, `BOOKING_REMINDER`
    - Schedule 24-hour-prior reminder notifications for all `Confirmed` bookings
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [~] 9.2 Persist notification records
    - Insert a `NOTIFICATION` row for every event dispatched; mark `is_read` when acknowledged
    - _Requirements: 11.1, 11.2_

- [ ] 10. Admin service and API
  - [-] 10.1 Implement admin service and routes
    - Create `server/src/services/adminService.ts` and wire all `/admin/*` endpoints
    - Approve/reject applications: on approval set `status = 'approved'` and make profile immediately visible; on rejection notify applicant with reason
    - Suspend/reinstate accounts: propagate status change to all client-facing queries within 1 hr (cache invalidation)
    - Remove/flag reviews: set `is_hidden = true` immediately; notify review author
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [~] 10.2 Protect admin routes
    - Apply `role = 'admin'` JWT guard to all `/admin/*` routes; return 403 for non-admin callers
    - _Requirements: 13.1_

- [~] 11. Checkpoint — backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Frontend: core screens and navigation
  - [~] 12.1 Implement app shell, routing, and reusable UI components
    - Set up React Router with all routes from the design (`/`, `/hairstyles`, `/hairstyles/:id`, `/stylists`, `/stylists/:id`, `/vendors`, `/vendors/:id`, `/book/:stylistId`, `/payments/:bookingId`, `/my-bookings`, `/stylist/dashboard`, `/vendor/dashboard`, `/admin`)
    - Build reusable components: `HairstyleCard`, `StylistCard`, `VendorCard`, `BundleCostSummary`, `StarRating` (interactive + display), `BookingStatusBadge`, `OfflineBanner`, `ImageGallery` (lazy-loaded), `FilterPanel`
    - Apply Tailwind CSS mobile-first responsive styles targeting Android 8+ WebView
    - _Requirements: 12.1, 12.3_

  - [~] 12.2 Implement Home / Discovery and Hairstyle Gallery screens
    - `/` — featured hairstyles, search bar, category filter quick-links
    - `/hairstyles` — `FilterPanel` (category, price range, hair length) + paginated grid of `HairstyleCard`; show "no results" message with "clear filters" CTA when zero results returned
    - Images lazy-loaded; compress via CDN params; verify ≤2 MB per 20 thumbnails
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 12.2_

  - [~] 12.3 Implement Hairstyle Detail screen
    - `/hairstyles/:id` — `ImageGallery`, style name, description, estimated duration, `BundleCostSummary`, recommended products list with product names/quantities/prices, "out of stock" indicator, link to vendor profile
    - Re-fetch bundle cost on mount to reflect any price changes since last view
    - _Requirements: 1.4, 2.1, 2.3, 2.4, 3.1, 3.4_

  - [~] 12.4 Implement Stylist List and Stylist Profile screens
    - `/stylists` — `FilterPanel` (location, service type, price range) + `StylistCard` grid; house-call badge visible
    - `/stylists/:id` — bio, portfolio `ImageGallery`, services with prices, availability calendar, `StarRating`, reviews list, "No reviews yet" fallback, house-call indicator
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [~] 12.5 Implement Vendor List and Vendor Profile screens
    - `/vendors` — filterable list of `VendorCard` with Verified badge; filter by product category and location
    - `/vendors/:id` — business description, full product catalogue with photos/names/prices/stock status
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 13. Frontend: booking and payment flows
  - [~] 13.1 Implement Booking Flow screen
    - `/book/:stylistId` — time slot picker from stylist availability calendar, house-call toggle (captures address when enabled), booking summary with `BundleCostSummary`, confirm button
    - On confirmation: `POST /bookings`; navigate to payment screen; show `BookingStatusBadge` (Pending)
    - _Requirements: 6.1, 6.4_

  - [~] 13.2 Implement Payment Screen
    - `/payments/:bookingId` — show itemised amount, Deposit vs Full payment toggle, M-Pesa phone number field (pre-filled from profile), "Pay with M-Pesa" button
    - On initiation: `POST /payments/initiate`; show "STK Push sent" state; poll or await callback result
    - On success: display receipt (`amount`, `mpesa_reference`, date/time, booking details, remaining balance if deposit)
    - On failure/timeout: display error message with retry button
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [~] 13.3 Implement My Bookings screen
    - `/my-bookings` — list of Client's bookings with `BookingStatusBadge`; cancel button visible for `Confirmed` bookings (hidden <24 h before appointment); "Leave Review" CTA on `Completed` bookings
    - _Requirements: 6.5, 6.6, 10.1_

- [ ] 14. Frontend: dashboards
  - [~] 14.1 Implement Stylist Dashboard
    - `/stylist/dashboard` — incoming booking requests with confirm/decline actions; availability calendar editor; portfolio photo upload (validates MIME type + ≤5 MB); service pricing editor
    - _Requirements: 6.2, 6.3, 8.3, 8.4, 8.5_

  - [~] 14.2 Implement Vendor Dashboard
    - `/vendor/dashboard` — product list with add/edit forms; stock quantity and out-of-stock toggle; product photo upload (validates MIME type + ≤5 MB)
    - _Requirements: 9.3, 9.4_

  - [~] 14.3 Implement Admin Dashboard
    - `/admin` — pending Stylist/Vendor application queue with approve/reject (reason required for rejection); account suspend/reinstate controls; flagged review moderation queue
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 15. PWA, offline support, and performance
  - [~] 15.1 Configure Workbox service worker caching strategies
    - Cache-first for hairstyle gallery (`/hairstyles`) and stylist list (`/stylists`) — cached until network available
    - Network-first for booking and payment endpoints — not served from cache
    - Show `OfflineBanner` whenever `navigator.onLine === false`
    - Display most-recently cached gallery/stylist list when offline rather than blank screen
    - _Requirements: 12.4, 12.5_

  - [ ]* 15.2 Write property test for offline cache invariant (Property 14)
    - **Property 14: Previously cached content is accessible when offline**
    - **Validates: Requirements 12.4**

  - [~] 15.3 Performance optimisation
    - Enable Vite bundle splitting and tree-shaking; verify JS bundle is minimal
    - Configure CloudFront to serve WebP/compressed images; audit 20-thumbnail payload ≤2 MB
    - Run Lighthouse CI against primary screens (Home, Gallery, Hairstyle Detail, Stylist List); verify TTI <5 s on simulated 3G
    - _Requirements: 12.1, 12.2, 12.3_

- [ ] 16. Integration tests and smoke tests
  - [ ]* 16.1 Write integration tests for core flows
    - Test end-to-end booking flow: create → confirm → pay → complete → review
    - Test M-Pesa callback round-trip using Daraja sandbox
    - Test notification delivery via Africa's Talking sandbox and FCM test project
    - Test cache invalidation: after vendor marks product out-of-stock, product detail reflects change within 1 hr
    - Test admin approval flow: pending → approved → profile visible in client search
    - _Requirements: 6.1–6.7, 7.1–7.7, 9.4, 13.1–13.2_

  - [ ]* 16.2 Write smoke tests for deployment health checks
    - `GET /health` returns 200; DB connection active; Redis connection active; Daraja credentials configured; FCM credentials configured; no raw credential columns (`password_pin`, `mpesa_pin`) in schema
    - _Requirements: 7.7_

- [~] 17. Final checkpoint — full test suite
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery.
- Every task references specific requirements for traceability.
- Property tests use **fast-check** with a minimum of 100 iterations each (see design §Testing Strategy).
- Unit tests target ~2–3 examples per endpoint for concrete happy-path and error cases.
- Checkpoints ensure incremental validation at the end of each major phase.
- M-Pesa credentials must never be persisted; only the Daraja-returned `mpesa_reference` is stored.
- All text inputs must be sanitised (whitelist HTML policy) before storage; phone numbers validated to E.164.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1", "3.2", "4.1", "4.4", "6.1", "7.1", "8.1", "9.1", "10.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.3", "3.5", "3.6", "3.7", "4.2", "4.3", "4.5", "6.2", "6.3", "6.4", "7.2", "7.3", "8.2", "8.3", "9.2", "10.2"] },
    { "id": 2, "tasks": ["3.4", "6.5", "7.4", "8.4"] },
    { "id": 3, "tasks": ["12.1"] },
    { "id": 4, "tasks": ["12.2", "12.3", "12.4", "12.5", "14.1", "14.2", "14.3"] },
    { "id": 5, "tasks": ["13.1", "13.2", "13.3"] },
    { "id": 6, "tasks": ["15.1", "15.3"] },
    { "id": 7, "tasks": ["15.2", "16.1", "16.2"] }
  ]
}
```
