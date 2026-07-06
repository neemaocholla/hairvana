# Requirements Document

## Introduction

HAIRVANA is a mobile-first web application targeting young women in Nairobi, Kenya (and broader Africa). The platform serves as a one-stop shop for hairstyle discovery, extension recommendations, bundled cost estimation, and connections to verified vendors and hairstylists — with secure M-Pesa payment support. Three distinct user personas interact with the platform: **Clients** (hairstyle seekers), **Stylists** (freelance braiders and salon professionals), and **Vendors** (hair product sellers).

The MVP focuses on delivering a lightweight, data-efficient experience optimised for lower-end Android devices and slower mobile networks.

---

## Glossary

- **Client**: An end user (persona: "Rubii") who browses hairstyles, gets recommendations, and books styling services.
- **Stylist**: A registered professional (persona: "Hana") who offers hairstyling services and manages bookings through the platform.
- **Vendor**: A registered business (persona: "Mary") who sells hair extensions and products on the platform.
- **Bundle**: A combined cost estimate that includes a hairstyle fee, required hair extensions/products, and the stylist's service fee.
- **House Call**: A booking where the Stylist travels to the Client's specified location to perform the service.
- **M-Pesa**: Kenya's dominant mobile money platform used for all in-app payments.
- **Deposit**: A partial upfront payment (percentage of total Bundle cost) made by a Client to confirm a booking.
- **Portfolio**: A collection of photos uploaded by a Stylist showcasing their past work.
- **Verified Vendor**: A Vendor whose products and business credentials have been reviewed and approved by the platform.
- **Admin**: The HAIRVANA platform operator responsible for verifying stylists and vendors, and moderating content.
- **System**: The HAIRVANA platform (frontend + backend services).
- **Booking**: A confirmed hairstyling appointment created by a Client for a specific Stylist.
- **Review**: A star rating and optional text comment left by a Client after a completed Booking.

---

## Requirements

### Requirement 1: Hairstyle Discovery and Browsing

**User Story:** As a Client, I want to browse and search hairstyles with visual examples, so that I can discover styles that suit my preferences and budget.

#### Acceptance Criteria

1. THE System SHALL display a browsable gallery of hairstyles, each represented by at least one photo, a style name, and a category tag (e.g., braids, weaves, natural).
2. WHEN a Client applies a filter by category, price range, or hair length, THE System SHALL return only hairstyles that match all selected filter criteria.
3. WHEN a Client searches by keyword, THE System SHALL return hairstyles whose name or description contains the keyword, within 3 seconds on a 3G connection.
4. WHEN a Client selects a hairstyle, THE System SHALL display a detail view showing the style name, photos, description, estimated duration, and the associated Bundle cost.
5. IF no hairstyles match the applied filters or search keyword, THEN THE System SHALL display a message indicating no results were found and suggest clearing filters.

---

### Requirement 2: Hair Extension and Product Recommendations

**User Story:** As a Client, I want to see which hair extensions and products are required for each hairstyle, so that I can make informed purchasing decisions before booking.

#### Acceptance Criteria

1. WHEN a Client views a hairstyle detail page, THE System SHALL display a list of recommended hair extensions and products required for that style, including product name, quantity, and unit price.
2. THE System SHALL link each recommended product to at least one Verified Vendor offering that product on the platform.
3. WHEN a Client selects a recommended product, THE System SHALL display the product detail page including product name, photos, description, price, and the Vendor's profile.
4. IF a recommended product is out of stock with all linked Vendors, THEN THE System SHALL display an "out of stock" indicator on that product within the hairstyle detail view.
5. THE System SHALL keep extension and product recommendations up to date, reflecting Vendor inventory changes within 24 hours.

---

### Requirement 3: Bundled Cost Estimation

**User Story:** As a Client, I want to see the total estimated cost of a hairstyle including extensions and the stylist's fee, so that I can plan my budget before committing.

#### Acceptance Criteria

1. WHEN a Client views a hairstyle detail page, THE System SHALL display a Bundle cost summary showing: extensions/products subtotal, stylist service fee range, and total estimated cost.
2. WHEN a Client selects a specific Stylist for a hairstyle, THE System SHALL recalculate the Bundle cost using that Stylist's exact service fee.
3. THE Bundle cost displayed to the Client SHALL include all mandatory components: product costs, service fee, and any platform fee, with each component itemised separately.
4. IF product prices or stylist fees change after a Client has viewed a Bundle cost, THEN THE System SHALL display an updated cost the next time the Client opens that hairstyle detail or booking page.
5. WHERE a Client specifies a maximum budget, THE System SHALL filter hairstyles and Stylists to show only those whose Bundle cost falls within that budget.

---

### Requirement 4: Stylist Discovery and Profiles

**User Story:** As a Client, I want to find and evaluate hairstylists near me, so that I can choose a reliable professional whose skills and prices match my needs.

#### Acceptance Criteria

1. THE System SHALL display a searchable and filterable list of Stylists, showing each Stylist's name, profile photo, service types offered, starting price, average rating, and review count.
2. WHEN a Client applies a filter by location, service type, or price range, THE System SHALL return only Stylists matching all selected criteria.
3. WHEN a Client selects a Stylist, THE System SHALL display the Stylist's full profile including: bio, Portfolio photos, offered services with prices, availability calendar, average rating, and all Reviews.
4. WHEN a Client views a Stylist's profile, THE System SHALL display whether the Stylist offers House Call services.
5. IF a Stylist has no Reviews, THEN THE System SHALL display "No reviews yet" in place of a rating score.

---

### Requirement 5: Vendor Discovery and Product Listings

**User Story:** As a Client, I want to browse verified hair product vendors, so that I can purchase the extensions I need from a trustworthy source.

#### Acceptance Criteria

1. THE System SHALL display a browsable list of Verified Vendors, showing each Vendor's name, logo, location (city/area), product categories, and average rating.
2. WHEN a Client selects a Vendor, THE System SHALL display the Vendor's profile including: business description, full product catalogue with photos, names, prices, and stock status.
3. WHEN a Client filters vendors by product category or location, THE System SHALL return only Vendors whose catalogue matches the selected criteria.
4. THE System SHALL display a "Verified" badge on every Vendor that has passed the platform's verification process.
5. IF a Vendor's verification status is revoked, THEN THE System SHALL remove the "Verified" badge and suppress the Vendor's listings from hairstyle recommendation results within 1 hour.

---

### Requirement 6: Booking and Appointment Management

**User Story:** As a Client, I want to book a hairstyling appointment with a Stylist, so that I can secure my preferred time and avoid uncertainty about availability.

#### Acceptance Criteria

1. WHEN a Client selects a Stylist and a time slot from the Stylist's availability calendar, THE System SHALL create a Booking with status "Pending" and notify the Stylist.
2. WHEN a Stylist confirms a Booking, THE System SHALL update the Booking status to "Confirmed" and notify the Client.
3. WHEN a Stylist declines a Booking, THE System SHALL update the Booking status to "Declined" and notify the Client with a reason where provided.
4. WHEN a Client requests a House Call, THE System SHALL capture the Client's delivery address and include it in the Booking record sent to the Stylist.
5. THE Client SHALL be able to cancel a Confirmed Booking up to 24 hours before the appointment time, after which THE System SHALL apply the cancellation policy.
6. WHEN a Booking is completed, THE System SHALL update the Booking status to "Completed" and prompt the Client to leave a Review.
7. IF a Stylist does not confirm or decline a Booking within 24 hours, THEN THE System SHALL automatically cancel the Booking and notify the Client.

---

### Requirement 7: Secure M-Pesa Payments

**User Story:** As a Client, I want to pay for my bookings securely using M-Pesa, so that I can transact confidently without fear of fraud or hidden charges.

#### Acceptance Criteria

1. WHEN a Client confirms a Booking, THE System SHALL present a payment screen with the option to pay a Deposit or the full Bundle cost via M-Pesa.
2. WHEN a Client initiates a payment, THE System SHALL trigger an M-Pesa STK Push to the Client's registered phone number with the correct amount.
3. WHEN M-Pesa confirms payment, THE System SHALL update the Booking payment status to "Paid" and display a payment receipt to the Client.
4. IF the M-Pesa STK Push times out or the Client declines, THEN THE System SHALL display a payment failure message and allow the Client to retry.
5. THE System SHALL display an itemised payment receipt showing: amount paid, payment reference number, date, time, and Booking details.
6. WHERE a Client has paid a Deposit, THE System SHALL display the remaining balance due and allow the Client to complete payment before or at the appointment.
7. THE System SHALL not store raw M-Pesa credentials or transaction PINs at any point.

---

### Requirement 8: Stylist Registration and Profile Management

**User Story:** As a Stylist, I want to create and manage my professional profile on HAIRVANA, so that I can attract new clients and showcase my work.

#### Acceptance Criteria

1. WHEN a new Stylist registers, THE System SHALL collect: full name, phone number, profile photo, bio, service types, pricing, location, and whether House Call services are offered.
2. THE System SHALL require Stylist accounts to be verified by an Admin before the Stylist's profile is publicly visible to Clients.
3. WHEN a Stylist uploads Portfolio photos, THE System SHALL store and display them on the Stylist's public profile.
4. WHEN a Stylist updates their availability calendar, THE System SHALL reflect the changes on their public profile within 5 minutes.
5. WHEN a Stylist updates service pricing, THE System SHALL update all Bundle cost displays that reference that Stylist's fees within 1 hour.
6. IF a Stylist's account is suspended by an Admin, THEN THE System SHALL hide the Stylist's profile from Client searches and prevent new Bookings from being created for that Stylist.

---

### Requirement 9: Vendor Registration and Product Management

**User Story:** As a Vendor, I want to list my hair products on HAIRVANA, so that I can reach more customers and increase sales.

#### Acceptance Criteria

1. WHEN a new Vendor registers, THE System SHALL collect: business name, owner name, phone number, business location, M-Pesa paybill or till number, and product categories.
2. THE System SHALL require Vendor accounts to be verified by an Admin before the Vendor's products appear in Client-facing search results or hairstyle recommendations.
3. WHEN a Vendor adds or updates a product listing, THE System SHALL capture: product name, photos, description, price, and stock quantity.
4. WHEN a Vendor marks a product as out of stock, THE System SHALL propagate the out-of-stock status to all hairstyle pages that recommend that product within 1 hour.
5. IF a Vendor's account is suspended by an Admin, THEN THE System SHALL remove all of that Vendor's product listings from Client-facing pages within 1 hour.

---

### Requirement 10: Reviews and Ratings

**User Story:** As a Client, I want to leave reviews for Stylists after my appointment, so that other users can make informed decisions based on real experiences.

#### Acceptance Criteria

1. WHEN a Booking status changes to "Completed", THE System SHALL unlock the ability for the Client to submit a Review for that Stylist.
2. WHEN a Client submits a Review, THE System SHALL record a star rating (1–5) and an optional text comment, and associate it with the Booking.
3. THE System SHALL allow each Client to submit at most one Review per completed Booking.
4. WHEN a new Review is submitted, THE System SHALL recalculate the Stylist's average rating and update it on the Stylist's public profile within 5 minutes.
5. IF a Client submits a Review containing prohibited content (as defined by the platform's content policy), THEN THE System SHALL flag the Review for Admin moderation before it is publicly displayed.

---

### Requirement 11: Notifications

**User Story:** As a user (Client or Stylist), I want to receive timely notifications about my bookings and messages, so that I can stay informed without having to actively check the app.

#### Acceptance Criteria

1. WHEN a Booking is created, confirmed, declined, or cancelled, THE System SHALL send a push notification and an SMS to the relevant Client and Stylist.
2. WHEN a payment is received or fails, THE System SHALL send a push notification to the Client.
3. WHEN a Stylist receives a new Booking request, THE System SHALL send a push notification prompting the Stylist to confirm or decline within 24 hours.
4. WHERE a Client has enabled SMS notifications, THE System SHALL send booking confirmation and reminder SMS messages to the Client's registered phone number.
5. THE System SHALL send a reminder notification to the Client 24 hours before a Confirmed Booking appointment.

---

### Requirement 12: Lightweight and Accessible Performance

**User Story:** As a Client in Nairobi, I want the app to work well on my lower-end Android phone and on a slow mobile connection, so that I can use it without frustration or excessive data costs.

#### Acceptance Criteria

1. THE System SHALL deliver all primary screens (home, hairstyle gallery, hairstyle detail, Stylist list) with a time-to-interactive of under 5 seconds on a simulated 3G connection (minimum 1 Mbps downlink).
2. THE System SHALL serve optimised images using compression and lazy loading so that browsing the hairstyle gallery consumes no more than 2 MB of data per 20 hairstyles displayed.
3. THE System SHALL function correctly on Android devices running Android 8.0 (API level 26) and above.
4. THE System SHALL cache the last-viewed hairstyle gallery and Stylist list locally so that Clients can browse previously loaded content without an active internet connection.
5. IF network connectivity is unavailable, THEN THE System SHALL display a clear offline indicator and present the most recently cached content rather than a blank screen.

---

### Requirement 13: Admin Platform Management

**User Story:** As an Admin, I want to verify and manage Stylists and Vendors, so that I can ensure the platform maintains quality and trust standards.

#### Acceptance Criteria

1. THE System SHALL provide an Admin interface for reviewing Stylist and Vendor registration applications, with the ability to approve or reject each application with a reason.
2. WHEN an Admin approves a Stylist or Vendor, THE System SHALL immediately make the profile publicly visible to Clients.
3. WHEN an Admin rejects a Stylist or Vendor application, THE System SHALL notify the applicant with the rejection reason.
4. THE System SHALL allow an Admin to suspend or reinstate a Stylist or Vendor account at any time, with all associated content updated within 1 hour.
5. WHEN an Admin flags or removes a Review for policy violation, THE System SHALL hide the Review from public display immediately and notify the Review author.
