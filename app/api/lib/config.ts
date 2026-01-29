/**
 * Centralized Configuration
 * Single source of truth for environment variables
 */

/**
 * Get required environment variable (throws if not set)
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    // Don't throw during build time for Next.js
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.error(`Missing required environment variable: ${key}`);
    }
    return '';
  }
  return value;
}

/**
 * Get optional environment variable with fallback
 */
function getEnv(key: string, fallback: string = ''): string {
  return process.env[key] || fallback;
}

/**
 * Application configuration
 */
export const config = {
  /**
   * Supabase configuration
   */
  supabase: {
    get url(): string {
      return getEnv('NEXT_PUBLIC_SUPABASE_URL', getEnv('SUPABASE_URL'));
    },
    get anonKey(): string {
      return getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    },
    get serviceKey(): string {
      // Service key should never be public
      return getEnv('SUPABASE_SERVICE_ROLE_KEY');
    },
    /**
     * Check if Supabase is configured
     */
    get isConfigured(): boolean {
      return !!this.url && !!(this.serviceKey || this.anonKey);
    },
  },

  /**
   * JWT configuration
   */
  jwt: {
    get secret(): string {
      return getRequiredEnv('JWT_SECRET');
    },
    get refreshSecret(): string {
      return getRequiredEnv('JWT_REFRESH_SECRET');
    },
    /**
     * Check if JWT is configured
     */
    get isConfigured(): boolean {
      return !!process.env.JWT_SECRET && !!process.env.JWT_REFRESH_SECRET;
    },
  },

  /**
   * Application URLs
   */
  app: {
    get baseUrl(): string {
      return (
        process.env.FRONTEND_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
      );
    },
    get webhookUrl(): string {
      return `${this.baseUrl}/api/trello/webhook`;
    },
  },

  /**
   * Email configuration
   */
  email: {
    get host(): string {
      return getEnv('EMAIL_HOST', 'smtp.gmail.com');
    },
    get port(): number {
      return parseInt(getEnv('EMAIL_PORT', '587'), 10);
    },
    get user(): string {
      return getEnv('EMAIL_USER');
    },
    get pass(): string {
      return getEnv('EMAIL_PASS');
    },
    get from(): string {
      return getEnv('EMAIL_FROM', this.user);
    },
    get isConfigured(): boolean {
      return !!this.user && !!this.pass;
    },
  },

  /**
   * Environment info
   */
  env: {
    get isDevelopment(): boolean {
      return process.env.NODE_ENV === 'development';
    },
    get isProduction(): boolean {
      return process.env.NODE_ENV === 'production';
    },
    get isVercel(): boolean {
      return !!process.env.VERCEL;
    },
  },
} as const;

/**
 * Validate that all required configuration is present
 * Call this at application startup
 */
export function validateConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!config.supabase.url) missing.push('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  if (!config.supabase.anonKey && !config.supabase.serviceKey) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  // JWT is required in production
  if (config.env.isProduction) {
    if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
    if (!process.env.JWT_REFRESH_SECRET) missing.push('JWT_REFRESH_SECRET');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

export default config;
