import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../lib/auth';
import { getSupabaseClient } from '../lib/supabase';
import { syncCalendarIntegration } from '@/app/lib/calendar/calendar-sync';
import { parseBody, createCalendarSyncSchema, triggerCalendarSyncSchema } from '../lib/validators';

/**
 * GET /api/calendar-sync — List calendar integrations
 */
export async function GET(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('calendar_integrations')
    .select('*, dentists(id, name)')
    .eq('user_id', auth.data.userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ integrations: data || [] });
}

/**
 * POST /api/calendar-sync — Create a new calendar integration
 */
export async function POST(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = await parseBody(request, createCalendarSyncSchema);
  if (parsed.error) return parsed.error;
  const { dentist_id, provider, calendar_id, credentials, sync_interval_minutes } = parsed.data;

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('calendar_integrations')
    .insert({
      user_id: auth.data.userId,
      dentist_id,
      provider,
      calendar_id,
      credentials,
      sync_enabled: true,
      sync_interval_minutes,
    })
    .select('*, dentists(id, name)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ integration: data }, { status: 201 });
}

/**
 * PUT /api/calendar-sync — Trigger sync for an integration
 * Body: { integration_id: string }
 */
export async function PUT(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = await parseBody(request, triggerCalendarSyncSchema);
  if (parsed.error) return parsed.error;
  const { integration_id } = parsed.data;

  const result = await syncCalendarIntegration(integration_id, auth.data.userId);

  return NextResponse.json({
    message: `Sincronização concluída: ${result.synced} eventos importados, ${result.errors} erros`,
    ...result,
  });
}

/**
 * DELETE /api/calendar-sync — Delete a calendar integration
 * Query: ?id=xxx
 */
export async function DELETE(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('calendar_integrations')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.data.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
