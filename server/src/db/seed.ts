/**
 * HAIRVANA — Local development seed script.
 * Populates the database with realistic sample data so every service can be
 * exercised immediately after `npm run db:migrate`.
 *
 * Usage:  npm run db:seed   (from the server package root)
 */

import 'dotenv/config';
import { pool, db } from './client.js';
import {
  users,
  stylistProfiles,
  vendorProfiles,
  hairstyles,
  products,
  hairstyleProducts,
  bookings,
  payments,
  reviews,
  portfolioPhotos,
  notifications,
} from './schema.js';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

async function seed() {
  console.log('🌱  Seeding HAIRVANA database…');

  // ── Wipe existing data in FK-safe order ────────────────────────────────────
  await db.delete(notifications);
  await db.delete(reviews);
  await db.delete(payments);
  await db.delete(bookings);
  await db.delete(hairstyleProducts);
  await db.delete(portfolioPhotos);
  await db.delete(products);
  await db.delete(hairstyles);
  await db.delete(vendorProfiles);
  await db.delete(stylistProfiles);
  await db.delete(users);
  console.log('  ✓ Cleared existing rows');

  // ── Users ──────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password123!', SALT_ROUNDS);

  const [adminUser, clientUser, stylistUser, vendorUser] = await db
    .insert(users)
    .values([
      {
        email: 'admin@hairvana.co.ke',
        phone_number: '+254700000001',
        password_hash: passwordHash,
        role: 'admin',
        is_active: true,
      },
      {
        email: 'rubii@example.com',
        phone_number: '+254700000002',
        password_hash: passwordHash,
        role: 'client',
        is_active: true,
      },
      {
        email: 'hana@example.com',
        phone_number: '+254700000003',
        password_hash: passwordHash,
        role: 'stylist',
        is_active: true,
      },
      {
        email: 'mary@example.com',
        phone_number: '+254700000004',
        password_hash: passwordHash,
        role: 'vendor',
        is_active: true,
      },
    ])
    .returning();

  console.log('  ✓ Inserted 4 users');

  // ── Stylist profile ────────────────────────────────────────────────────────
  const [stylist] = await db
    .insert(stylistProfiles)
    .values({
      user_id: stylistUser.id,
      full_name: 'Hana Wanjiku',
      bio: 'Award-winning braider with 8 years of experience in Nairobi. Specialising in box braids, knotless braids, and Senegalese twists.',
      location: 'Westlands, Nairobi',
      house_call_offered: true,
      status: 'approved',
      base_price: '2500',
      average_rating: 4.8,
      review_count: 1,
      service_types: ['Box Braids', 'Knotless Braids', 'Senegalese Twists', 'Cornrows'],
      photo_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400',
    })
    .returning();

  console.log('  ✓ Inserted stylist profile');

  // ── Portfolio photos ───────────────────────────────────────────────────────
  await db.insert(portfolioPhotos).values([
    {
      stylist_id: stylist.id,
      image_url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600',
      caption: 'Box braids with gold cuffs',
    },
    {
      stylist_id: stylist.id,
      image_url: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600',
      caption: 'Knotless braids – mid-length',
    },
    {
      stylist_id: stylist.id,
      image_url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600',
      caption: 'Senegalese twists',
    },
  ]);

  console.log('  ✓ Inserted portfolio photos');

  // ── Vendor profile ─────────────────────────────────────────────────────────
  const [vendor] = await db
    .insert(vendorProfiles)
    .values({
      user_id: vendorUser.id,
      business_name: "Mary's Hair Extensions",
      owner_name: 'Mary Achieng',
      location: 'Gikomba Market, Nairobi',
      mpesa_paybill: '247247',
      status: 'approved',
      average_rating: 4.6,
      logo_url: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=200',
      product_categories: ['Braiding Hair', 'Weaves', 'Wigs', 'Accessories'],
    })
    .returning();

  console.log('  ✓ Inserted vendor profile');

  // ── Products ───────────────────────────────────────────────────────────────
  const [kanekalon, xpression, eurasian] = await db
    .insert(products)
    .values([
      {
        vendor_id: vendor.id,
        name: 'Kanekalon Braiding Hair – Black',
        description: '100% Kanekalon fibre, heat-resistant, tangle-free. Pack of 6 bundles.',
        price: '350',
        stock_quantity: 120,
        is_out_of_stock: false,
        photo_urls: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400'],
        category: 'Braiding Hair',
      },
      {
        vendor_id: vendor.id,
        name: 'X-Pression Ultra Braid – 1B',
        description: 'Lightweight, ultra-long braiding hair. 82 inches per pack.',
        price: '420',
        stock_quantity: 85,
        is_out_of_stock: false,
        photo_urls: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400'],
        category: 'Braiding Hair',
      },
      {
        vendor_id: vendor.id,
        name: 'Eurasian Straight Weave – 16"',
        description: 'Premium Eurasian hair, double-wefted, natural black.',
        price: '3200',
        stock_quantity: 20,
        is_out_of_stock: false,
        photo_urls: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400'],
        category: 'Weaves',
      },
    ])
    .returning();

  console.log('  ✓ Inserted 3 products');

  // ── Hairstyles ─────────────────────────────────────────────────────────────
  const [boxBraids, senegalese, weave] = await db
    .insert(hairstyles)
    .values([
      {
        name: 'Classic Box Braids',
        description:
          'Timeless protective box braids suitable for all hair types. Low maintenance and long-lasting.',
        category: 'Braids',
        estimated_duration_mins: 240,
        platform_fee: '150',
        photo_urls: [
          'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600',
          'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600',
        ],
        hair_lengths: ['medium', 'long'],
      },
      {
        name: 'Senegalese Twists',
        description:
          'Elegant rope-like twists using Kanekalon hair. Suitable for medium to long lengths.',
        category: 'Twists',
        estimated_duration_mins: 300,
        platform_fee: '150',
        photo_urls: [
          'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600',
        ],
        hair_lengths: ['medium', 'long'],
      },
      {
        name: 'Straight Weave Install',
        description:
          'Seamless Eurasian weave install. Includes sew-in and blending with natural hair.',
        category: 'Weaves',
        estimated_duration_mins: 180,
        platform_fee: '200',
        photo_urls: [
          'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=600',
        ],
        hair_lengths: ['short', 'medium', 'long'],
      },
    ])
    .returning();

  console.log('  ✓ Inserted 3 hairstyles');

  // ── Hairstyle–product links ────────────────────────────────────────────────
  await db.insert(hairstyleProducts).values([
    { hairstyle_id: boxBraids.id, product_id: kanekalon.id, quantity_required: 5 },
    { hairstyle_id: boxBraids.id, product_id: xpression.id, quantity_required: 3 },
    { hairstyle_id: senegalese.id, product_id: kanekalon.id, quantity_required: 6 },
    { hairstyle_id: weave.id, product_id: eurasian.id, quantity_required: 2 },
  ]);

  console.log('  ✓ Linked hairstyles to products');

  // ── Booking ────────────────────────────────────────────────────────────────
  const appointmentAt = new Date();
  appointmentAt.setDate(appointmentAt.getDate() + 7); // 7 days from now

  const [booking] = await db
    .insert(bookings)
    .values({
      client_id: clientUser.id,
      stylist_id: stylist.id,
      hairstyle_id: boxBraids.id,
      status: 'Completed',
      is_house_call: false,
      delivery_address: null,
      total_cost: '4400', // 5*350 + 3*420 + 2500 + 150
      deposit_amount: '1100',
      appointment_at: appointmentAt,
      confirmed_at: new Date(),
    })
    .returning();

  console.log('  ✓ Inserted booking');

  // ── Payment ────────────────────────────────────────────────────────────────
  await db.insert(payments).values({
    booking_id: booking.id,
    amount: '4400',
    mpesa_reference: 'QGH7X1K2PO',
    phone_number: '+254700000002',
    status: 'Paid',
    paid_at: new Date(),
  });

  console.log('  ✓ Inserted payment');

  // ── Review ─────────────────────────────────────────────────────────────────
  await db.insert(reviews).values({
    booking_id: booking.id,
    client_id: clientUser.id,
    stylist_id: stylist.id,
    star_rating: 5,
    comment: 'Hana did an amazing job! The braids lasted 6 weeks and looked flawless.',
    is_flagged: false,
    is_hidden: false,
  });

  console.log('  ✓ Inserted review');

  // ── Notification ───────────────────────────────────────────────────────────
  await db.insert(notifications).values({
    user_id: clientUser.id,
    event_type: 'BOOKING_COMPLETED',
    message: 'Your appointment with Hana Wanjiku is complete. Please leave a review!',
    is_read: false,
  });

  console.log('  ✓ Inserted notification');
  console.log('\n✅  Seed complete!\n');
  console.log('  Default credentials (all accounts):');
  console.log('    Password: Password123!\n');
  console.log('  Users seeded:');
  console.log(`    admin   → admin@hairvana.co.ke`);
  console.log(`    client  → rubii@example.com`);
  console.log(`    stylist → hana@example.com`);
  console.log(`    vendor  → mary@example.com`);
}

seed()
  .catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
