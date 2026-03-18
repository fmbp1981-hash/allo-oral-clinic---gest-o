import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../../lib/auth';
import { getSupabaseClient } from '../../../lib/supabase';
import { createProvider, WhatsAppSettings } from '@/app/lib/whatsapp/provider-factory';
import { sendTextMessage } from '@/app/lib/whatsapp/send-message';

const BATCH_SIZE = 50;
const INTER_MESSAGE_DELAY_MS = 1500;

/**
 * POST /api/campaigns/[id]/send
 * Sends up to BATCH_SIZE pending messages and returns progress.
 * Frontend loops until completed === true.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { userId } = auth.data;
  const { id: campaignId } = await params;
  const supabase = getSupabaseClient();

  // Verify campaign ownership
  const { data: campaign, error: cErr } = await supabase
    .from('campaigns')
    .select('id, status, total_patients')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .single();

  if (cErr || !campaign) {
    return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
  }
  if (campaign.status === 'completed') {
    return NextResponse.json({ completed: true, sent: 0, failed: 0 });
  }

  // Fetch WhatsApp settings
  const { data: settings, error: sErr } = await supabase
    .from('user_settings')
    .select('provider, evolution_api_url, evolution_api_key, evolution_instance_name, meta_phone_number_id, meta_access_token')
    .eq('user_id', userId)
    .single();

  if (sErr || !settings) {
    return NextResponse.json(
      { error: 'Configurações de WhatsApp não encontradas' },
      { status: 400 }
    );
  }

  let provider;
  try {
    provider = createProvider(settings as unknown as WhatsAppSettings);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Provedor inválido' },
      { status: 400 }
    );
  }

  // Fetch batch of pending campaign_patients
  const { data: batch, error: bErr } = await supabase
    .from('campaign_patients')
    .select('id, patient_id, personalized_message, patients(phone)')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
    .limit(BATCH_SIZE);

  if (bErr) {
    return NextResponse.json({ error: 'Erro ao buscar destinatários' }, { status: 500 });
  }
  if (!batch || batch.length === 0) {
    await supabase
      .from('campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', campaignId);
    return NextResponse.json({ completed: true, sent: 0, failed: 0 });
  }

  // Mark campaign as sending on first batch
  await supabase
    .from('campaigns')
    .update({ status: 'sending', sent_at: new Date().toISOString() })
    .eq('id', campaignId)
    .neq('status', 'sending');

  let sent = 0;
  let failed = 0;

  for (const row of batch) {
    const phone = (row.patients as unknown as { phone?: string } | null)?.phone ?? '';
    const result = await sendTextMessage(provider, phone, row.personalized_message as string);

    const statusUpdate = result.success
      ? { status: 'sent', sent_at: new Date().toISOString(), whatsapp_message_id: result.messageId ?? null }
      : { status: 'failed', error_message: result.error ?? 'Erro desconhecido' };

    await supabase
      .from('campaign_patients')
      .update(statusUpdate)
      .eq('id', row.id);

    if (result.success) sent++; else failed++;

    // Small delay between messages
    await new Promise((r) => setTimeout(r, INTER_MESSAGE_DELAY_MS));
  }

  // Atomically update campaign counters
  await supabase.rpc('increment_campaign_counts', {
    p_campaign_id: campaignId,
    p_sent: sent,
    p_failed: failed,
  });

  // Check if all messages are done
  const { count } = await supabase
    .from('campaign_patients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'pending');

  const completed = (count ?? 0) === 0;
  if (completed) {
    await supabase
      .from('campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', campaignId);
  }

  return NextResponse.json({ completed, sent, failed });
}
