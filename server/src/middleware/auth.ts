/**
 * HAIRVANA — JWT authentication middleware.
 *
 * Exports:
 *  - `authenticate`      — verifies an access token; attaches `req.user`
 *  - `requireRole`       — guards a route to specific roles (variadic)
 *  - `optionalAuth`      — same as authenticate but does not 401 on missing token
 *
 * The middleware reads the JWT from the `Authorization: Bearer <token>` header.
 * Token secrets and TTLs are read from environment variables.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@hairvana/shared';

// ─── Environment ──────────────────────────────────────────────────────────────

export const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'hairvana-access-secret-dev-only';
export const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'hairvana-refresh-secret-dev-only';
export const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

// ─── Token payload type ───────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;   // user id
  role: UserRole;
  email: string;
  iat?: number;
  exp?: number;
}

// ─── Augment Express request ──────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return null;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Verifies the access JWT in the `Authorization` header.
 * On success, attaches the decoded payload to `req.user`.
 * Returns 401 if the token is missing, malformed, or expired.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication token required.' },
    });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (err) {
    const isExpired = err instanceof jwt.TokenExpiredError;
    res.status(401).json({
      error: {
        code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: isExpired
          ? 'Your session has expired. Please log in again.'
          : 'Invalid authentication token.',
      },
    });
  }
}

/**
 * Like `authenticate` but does not return 401 when the token is absent.
 * Useful for routes that behave differently for logged-in vs anonymous users.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_ACCESS_SECRET) as JwtPayload;
    } catch {
      // Silently ignore invalid/expired tokens for optional auth
    }
  }
  next();
}

/**
 * Returns a middleware that enforces at least one of the specified roles.
 * Must be used after `authenticate` (relies on `req.user` being set).
 *
 * @example
 *   router.patch('/confirm', authenticate, requireRole('stylist', 'admin'), handler)
 */
export function requireRole(...roles: UserRole[]) {
  return function (req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access restricted to: ${roles.join(', ')}.`,
        },
      });
      return;
    }

    next();
  };
}
