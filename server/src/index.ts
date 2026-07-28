/**
 * HAIRVANA — Express server entry point.
 *
 * Boots the Express application with security middleware, CORS, rate limiting,
 * and the health-check endpoint.  Route handlers for each domain are registered
 * here as they are implemented in subsequent tasks.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT ?? 3000;

// ─── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Global rate limit ────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
});
app.use(globalLimiter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Domain routes (added progressively in subsequent tasks) ──────────────────
// import authRoutes from './routes/auth.js';
// import hairstyleRoutes from './routes/hairstyles.js';
// import stylistRoutes from './routes/stylists.js';
// import vendorRoutes from './routes/vendors.js';
// import bookingRoutes from './routes/bookings.js';
// import paymentRoutes from './routes/payments.js';
// import reviewRoutes from './routes/reviews.js';
// import adminRoutes from './routes/admin.js';
//
// app.use('/auth', authRoutes);
// app.use('/hairstyles', hairstyleRoutes);
// app.use('/stylists', stylistRoutes);
// app.use('/vendors', vendorRoutes);
// app.use('/bookings', bookingRoutes);
// app.use('/payments', paymentRoutes);
// app.use('/reviews', reviewRoutes);
// app.use('/admin', adminRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'The requested endpoint does not exist.' },
  });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] unhandled error:', err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});

export default app;
