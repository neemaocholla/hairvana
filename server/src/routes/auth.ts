/**
 * HAIRVANA — Auth routes.
 *
 * POST /auth/register  — create a new client, stylist, or vendor account
 * POST /auth/login     — authenticate and return access + refresh tokens
 * POST /auth/refresh   — exchange a valid refresh token for a new access token
 * POST /auth/logout    — invalidate the refresh token (server-side blocklist via Redis)
 *
 * Security notes:
 *  - Passwords are hashed with bcrypt (cost factor 12); raw passwords are never stored
 *  - M-Pesa PINs and raw credentials are never persisted (Req 7.7)
 *  - Phone numbers are validated to E.164 format before account creation (Req 8.1, 9.1)
 *  - Refresh tokens are stored in Redis with a TTL matching JWT_REFRESH_EXPIRES_IN
 *  - A blocklisted refresh token is rejected immediately on the /refresh endpoint
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { eq, or } from 'drizzle-orm';

import { db } from '../db/client.js';
import { users, stylistProfiles, vendorProfiles } from '../db/schema.js';
import { redis } from '../cache/redis.js';
import {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  authenticate,
  type JwtPayload,
} from '../middleware/auth.js';

const router = Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
/** Redis key prefix for active refresh tokens (value = userId) */
const REFRESH_TOKEN_PREFIX = 'hairvana:refresh:';
/** Refresh token TTL in seconds (7 days) */
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

// ─── Validation schemas ───────────────────────────────────────────────────────

/**
 * E.164 phone number: +<country code><subscriber number>, 7–15 digits total.
 * Examples: +254712345678 (Kenya), +1234567890
 */
const e164Regex = /^\+[1-9]\d{6,14}$/;

const baseRegisterSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  phone_number: z.string().regex(e164Regex, {
    message: 'Phone number must be in E.164 format (e.g. +254712345678).',
  }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters.' })
    .max(128, { message: 'Password must not exceed 128 characters.' }),
  role: z.enum(['client', 'stylist', 'vendor']),
});

const stylistRegisterSchema = baseRegisterSchema.extend({
  role: z.literal('stylist'),
  full_name: z.string().min(1, { message: 'Full name is required for stylists.' }),
  bio: z.string().optional(),
  location: z.string().optional(),
  house_call_offered: z.boolean().optional(),
  base_price: z.number().nonnegative().optional(),
  service_types: z.array(z.string()).optional(),
});

const vendorRegisterSchema = baseRegisterSchema.extend({
  role: z.literal('vendor'),
  business_name: z.string().min(1, { message: 'Business name is required for vendors.' }),
  owner_name: z.string().min(1, { message: 'Owner name is required for vendors.' }),
  mpesa_paybill: z.string().min(1, { message: 'M-Pesa paybill/till number is required for vendors.' }),
  location: z.string().optional(),
  product_categories: z.array(z.string()).optional(),
});

const clientRegisterSchema = baseRegisterSchema.extend({
  role: z.literal('client'),
});

/** Union schema that delegates to the role-specific sub-schema */
const registerSchema = z.discriminatedUnion('role', [
  clientRegisterSchema,
  stylistRegisterSchema,
  vendorRegisterSchema,
]);

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1, { message: 'Refresh token is required.' }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signTokens(userId: string, role: string, email: string) {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: userId,
    role: role as JwtPayload['role'],
    email,
  };

  const access_token = jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);

  const refresh_token = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);

  // Decode to get expiry for the response
  const decoded = jwt.decode(access_token) as jwt.JwtPayload;
  const expires_in = decoded.exp! - decoded.iat!;

  return { access_token, refresh_token, expires_in };
}

async function storeRefreshToken(userId: string, token: string): Promise<void> {
  try {
    await redis.setex(`${REFRESH_TOKEN_PREFIX}${token}`, REFRESH_TOKEN_TTL_SECONDS, userId);
  } catch {
    // Redis failure: log but allow login to succeed; refresh will fail until Redis recovers
    console.error('[auth] failed to store refresh token in Redis');
  }
}

async function revokeRefreshToken(token: string): Promise<void> {
  try {
    await redis.del(`${REFRESH_TOKEN_PREFIX}${token}`);
  } catch {
    console.error('[auth] failed to revoke refresh token in Redis');
  }
}

async function isRefreshTokenActive(token: string): Promise<boolean> {
  try {
    const result = await redis.get(`${REFRESH_TOKEN_PREFIX}${token}`);
    return result !== null;
  } catch {
    // On Redis failure, fall back to JWT signature/expiry as the sole guard
    return true;
  }
}

// ─── POST /auth/register ──────────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Registration payload is invalid.',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const data = parsed.data;

  // Check for duplicate email or phone
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.email, data.email), eq(users.phone_number, data.phone_number)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({
      error: {
        code: 'DUPLICATE_ACCOUNT',
        message: 'An account with this email or phone number already exists.',
      },
    });
    return;
  }

  // Hash the password — never store the raw value
  const password_hash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  // Insert user + role-specific profile in a transaction
  const newUser = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email: data.email,
        phone_number: data.phone_number,
        password_hash,
        role: data.role,
        is_active: true,
      })
      .returning();

    if (data.role === 'stylist') {
      const d = data as z.infer<typeof stylistRegisterSchema>;
      await tx.insert(stylistProfiles).values({
        user_id: user.id,
        full_name: d.full_name,
        bio: d.bio ?? '',
        location: d.location ?? '',
        house_call_offered: d.house_call_offered ?? false,
        base_price: String(d.base_price ?? 0),
        service_types: d.service_types ?? [],
        status: 'pending',
      });
    } else if (data.role === 'vendor') {
      const d = data as z.infer<typeof vendorRegisterSchema>;
      await tx.insert(vendorProfiles).values({
        user_id: user.id,
        business_name: d.business_name,
        owner_name: d.owner_name,
        location: d.location ?? '',
        mpesa_paybill: d.mpesa_paybill,
        product_categories: d.product_categories ?? [],
        status: 'pending',
      });
    }

    return user;
  });

  const tokens = signTokens(newUser.id, newUser.role, newUser.email);
  await storeRefreshToken(newUser.id, tokens.refresh_token);

  // Never return password_hash
  const { password_hash: _ph, ...safeUser } = newUser;

  res.status(201).json({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    user: safeUser,
  });
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Login payload is invalid.',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    // Use constant-time response to avoid email enumeration
    await bcrypt.compare(password, '$2a$12$invalidhashpaddingtoconstanttime00000000000000000000000000');
    res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
    });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
    });
    return;
  }

  if (!user.is_active) {
    res.status(403).json({
      error: { code: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended.' },
    });
    return;
  }

  const tokens = signTokens(user.id, user.role, user.email);
  await storeRefreshToken(user.id, tokens.refresh_token);

  const { password_hash: _ph, ...safeUser } = user;

  res.json({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    user: safeUser,
  });
});

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Refresh token is required.',
        details: parsed.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const { refresh_token } = parsed.data;

  // Verify JWT signature and expiry first
  let payload: JwtPayload;
  try {
    payload = jwt.verify(refresh_token, JWT_REFRESH_SECRET) as JwtPayload;
  } catch (err) {
    const isExpired = err instanceof jwt.TokenExpiredError;
    res.status(401).json({
      error: {
        code: isExpired ? 'REFRESH_TOKEN_EXPIRED' : 'INVALID_REFRESH_TOKEN',
        message: isExpired
          ? 'Refresh token has expired. Please log in again.'
          : 'Invalid refresh token.',
      },
    });
    return;
  }

  // Check that the token hasn't been revoked
  const active = await isRefreshTokenActive(refresh_token);
  if (!active) {
    res.status(401).json({
      error: {
        code: 'REFRESH_TOKEN_REVOKED',
        message: 'Refresh token has been revoked. Please log in again.',
      },
    });
    return;
  }

  // Rotate: revoke old, issue new pair
  await revokeRefreshToken(refresh_token);
  const tokens = signTokens(payload.sub, payload.role, payload.email);
  await storeRefreshToken(payload.sub, tokens.refresh_token);

  res.json({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
  });
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────

router.post('/logout', authenticate, async (req: Request, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (parsed.success) {
    await revokeRefreshToken(parsed.data.refresh_token);
  }
  // Even if no refresh token is provided, respond with success — the client
  // should discard its access token locally.
  res.json({ message: 'Logged out successfully.' });
});

export default router;
