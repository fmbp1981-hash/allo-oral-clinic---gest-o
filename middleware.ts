import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory rate limiter using sliding window counters.
 * In production on Vercel, each serverless instance has its own memory,
 * so this provides per-instance rate limiting (good enough for most use cases).
 * For stricter global limiting, use Vercel KV or Upstash Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries periodically (every 60s)
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Rate limit configs per route pattern
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  auth: { windowMs: 60_000, maxRequests: 10 }, // 10 req/min for auth
  api: { windowMs: 60_000, maxRequests: 100 }, // 100 req/min for general API
  webhook: { windowMs: 60_000, maxRequests: 200 }, // 200 req/min for webhooks
};

function getRateLimitConfig(pathname: string): RateLimitConfig {
  if (pathname.startsWith('/api/auth/')) return RATE_LIMITS.auth;
  if (pathname.startsWith('/api/webhook/')) return RATE_LIMITS.webhook;
  return RATE_LIMITS.api;
}

function getClientIdentifier(request: NextRequest): string {
  // Use IP + User-Agent for identifier
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupStaleEntries();

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    // Create new window
    const resetAt = now + config.windowMs;
    rateLimitStore.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  // Increment count
  entry.count++;

  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate-limit API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip health check
  if (pathname === '/api/health') {
    return NextResponse.next();
  }

  // Skip cron endpoints (they use CRON_SECRET)
  if (pathname.startsWith('/api/cron/')) {
    return NextResponse.next();
  }

  const config = getRateLimitConfig(pathname);
  const identifier = `${getClientIdentifier(request)}:${pathname.startsWith('/api/auth/') ? 'auth' : 'api'}`;
  const result = checkRateLimit(identifier, config);

  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em alguns instantes.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        },
      },
    );
  }

  // Add rate limit headers to response
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};
