/**
 * Supabase Client Factory
 * Centralized Supabase client creation with lazy initialization
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';

// Database types
export interface DbUser {
  id: string;
  name: string;
  email: string;
  password: string;
  clinic_name: string;
  avatar_url: string;
  role: string;
  tenant_id?: string;
  refresh_token_hash?: string;
  reset_token?: string | null;
  reset_token_expires?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbTrelloConfig {
  id: string;
  user_id: string;
  api_key: string;
  token: string;
  board_id?: string;
  board_name?: string;
  sync_enabled: boolean;
  list_mapping?: Record<string, string>;
  webhook_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbTrelloCardMapping {
  id: string;
  user_id: string;
  opportunity_id: string;
  trello_card_id: string;
  trello_board_id: string;
  trello_list_id?: string;
  last_synced_at?: string;
  sync_direction?: 'to_trello' | 'from_trello' | 'bidirectional';
}

// Singleton instance
let _supabaseInstance: SupabaseClient | null = null;

/**
 * Get or create Supabase client instance
 * Uses service role key for server-side operations
 *
 * @throws Error if Supabase is not configured (at runtime, not build time)
 */
export function getSupabaseClient(): SupabaseClient {
  if (_supabaseInstance) {
    return _supabaseInstance;
  }

  const url = config.supabase.url;
  const key = config.supabase.serviceKey || config.supabase.anonKey;

  // During build time, env vars may not be available
  // Return a placeholder that will error at runtime if actually used
  if (!url || !key) {
    // Only return mock during Next.js static generation/build phase
    // When VERCEL is set, we're in Vercel environment and should throw proper error
    if (!process.env.VERCEL) {
      // Local build without env vars - return mock that errors on use
      return new Proxy({} as SupabaseClient, {
        get(_, prop) {
          if (prop === 'from') {
            return () => ({
              select: () => ({ data: null, error: { message: 'Supabase not configured' } }),
              insert: () => ({ data: null, error: { message: 'Supabase not configured' } }),
              update: () => ({ data: null, error: { message: 'Supabase not configured' } }),
              delete: () => ({ data: null, error: { message: 'Supabase not configured' } }),
              single: () => ({ data: null, error: { message: 'Supabase not configured' } }),
            });
          }
          return undefined;
        },
      }) as SupabaseClient;
    }

    // In Vercel but no env vars = configuration error
    console.error('CRITICAL: Supabase environment variables are not set in Vercel!');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    throw new Error(
      'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables in Vercel dashboard.'
    );
  }

  _supabaseInstance = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseInstance;
}

/**
 * Create a new Supabase client instance (for cases where you need isolation)
 * This is useful for webhooks or when you need a fresh client
 */
export function createSupabaseClient(): SupabaseClient {
  const url = config.supabase.url;
  const key = config.supabase.serviceKey || config.supabase.anonKey;

  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Helper to check if a Supabase error is "not found"
 */
export function isNotFoundError(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST116';
}

/**
 * Helper to check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return config.supabase.isConfigured;
}

// Export singleton instance for backwards compatibility
// Uses lazy initialization via Proxy to avoid build-time errors
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop: keyof SupabaseClient) {
    const client = getSupabaseClient();
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export default supabase;
