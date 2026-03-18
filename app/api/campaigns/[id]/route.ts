import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient } from '../../lib/supabase';

/**
 * GET /api/campaigns/[id]
 * Returns campaign detail with its campaign_patients.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { userId } = auth.data;
  const { id } = await params;
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('campaigns')
    .select('*, campaign_patients(id, patient_id, personalized_message, status, sent_at, error_message, whatsapp_message_id, patients(name, phone))')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/campaigns/[id]
 * Deletes a campaign (draft only — cannot delete sent campaigns).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { userId } = auth.data;
  const { id } = await params;
  const supabase = getSupabaseClient();

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('status')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
  }
  if (campaign.status !== 'draft') {
    return NextResponse.json({ error: 'Somente campanhas em rascunho podem ser excluídas' }, { status: 400 });
  }

  await supabase.from('campaigns').delete().eq('id', id);
  return NextResponse.json({ success: true });
}
