import { getSupabaseClient } from './supabase';

export type AuditAction =
  | 'login'
  | 'login_failed'
  | 'register'
  | 'password_reset'
  | 'patient_create'
  | 'patient_update'
  | 'patient_delete'
  | 'patient_import'
  | 'appointment_create'
  | 'appointment_update'
  | 'appointment_cancel'
  | 'dentist_create'
  | 'dentist_update'
  | 'dentist_delete'
  | 'opportunity_create'
  | 'opportunity_update'
  | 'opportunity_delete'
  | 'campaign_create'
  | 'campaign_send'
  | 'clinical_record_create'
  | 'clinical_record_update'
  | 'clinical_record_delete'
  | 'agent_config_update'
  | 'agent_handoff_accept'
  | 'agent_handoff_reject'
  | 'calendar_sync_create'
  | 'calendar_sync_delete'
  | 'settings_update';

export type AuditEntityType =
  | 'user'
  | 'patient'
  | 'appointment'
  | 'dentist'
  | 'opportunity'
  | 'campaign'
  | 'clinical_record'
  | 'agent_config'
  | 'agent_conversation'
  | 'calendar_integration'
  | 'settings';

interface AuditLogParams {
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  details?: Record<string, unknown>;
  request?: Request;
}

/**
 * Insert an entry into audit_logs. Fire-and-forget — errors are logged
 * but never thrown so they don't break the main request flow.
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    const ipAddress = params.request
      ? (params.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
         params.request.headers.get('x-real-ip') ??
         null)
      : null;

    const userAgent = params.request
      ? params.request.headers.get('user-agent')
      : null;

    await supabase.from('audit_logs').insert({
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      details: params.details ?? {},
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err);
  }
}
