/**
 * Supabase Client Configuration
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from './logger';

// Database Types (generated from schema)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          password: string;
          clinic_name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          password: string;
          clinic_name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          password?: string;
          clinic_name?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      patients: {
        Row: {
          id: string;
          name: string;
          phone: string;
          email: string | null;
          history: string | null;
          last_visit: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          email?: string | null;
          history?: string | null;
          last_visit?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          history?: string | null;
          last_visit?: string | null;
          updated_at?: string;
        };
      };
      opportunities: {
        Row: {
          id: string;
          patient_id: string | null;
          name: string;
          phone: string;
          keyword_found: string;
          status: string;
          last_contact: string | null;
          scheduled_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id?: string | null;
          name: string;
          phone: string;
          keyword_found: string;
          status?: string;
          last_contact?: string | null;
          scheduled_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string | null;
          name?: string;
          phone?: string;
          keyword_found?: string;
          status?: string;
          last_contact?: string | null;
          scheduled_date?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      clinical_records: {
        Row: {
          id: string;
          date: string;
          description: string;
          type: string | null;
          patient_id: string;
          opportunity_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          date: string;
          description: string;
          type?: string | null;
          patient_id: string;
          opportunity_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          date?: string;
          description?: string;
          type?: string | null;
          patient_id?: string;
          opportunity_id?: string | null;
        };
      };
      app_settings: {
        Row: {
          id: string;
          webhook_url: string;
          messaging_webhook_url: string | null;
          api_key: string | null;
          message_template: string | null;
        };
        Insert: {
          id?: string;
          webhook_url: string;
          messaging_webhook_url?: string | null;
          api_key?: string | null;
          message_template?: string | null;
        };
        Update: {
          id?: string;
          webhook_url?: string;
          messaging_webhook_url?: string | null;
          api_key?: string | null;
          message_template?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          title: string;
          message: string;
          type: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          message: string;
          type: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          message?: string;
          type?: string;
          read?: boolean;
        };
      };
    };
  };
}

class SupabaseService {
  private client: SupabaseClient<Database> | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      logger.warn('Supabase not configured - missing SUPABASE_URL or SUPABASE_ANON_KEY');
      return;
    }

    this.client = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false, // Server-side doesn't need session persistence
      },
    });

    logger.info('Supabase client initialized successfully');
  }

  public getClient(): SupabaseClient<Database> {
    if (!this.client) {
      throw new Error('Supabase client not initialized');
    }
    return this.client;
  }

  public isConfigured(): boolean {
    return this.client !== null;
  }
}

// Export singleton instance
const supabaseService = new SupabaseService();
export const supabase = supabaseService.getClient();
export default supabase;
