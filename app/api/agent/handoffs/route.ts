import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient } from '../../lib/supabase';

/**
 * GET /api/agent/handoffs
 * Lists pending handoff requests for the authenticated user.
 */
export async function GET(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('handoff_requests')
    .select(`
      id, conversation_id, reason, ai_summary, status, created_at,
      agent_conversations(patient_phone, patients(name))
    `)
    .eq('user_id', auth.data.userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Erro ao listar handoffs' }, { status: 500 });
  }

  return NextResponse.json({ handoffs: data ?? [] });
}

/**
 * PUT /api/agent/handoffs
 * Accept or reject a handoff request.
 * Body: { handoffId: string, action: 'accept' | 'reject' }
 */
export async function PUT(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { handoffId, action } = body;

  if (!handoffId || !['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'handoffId e action (accept|reject) são obrigatórios' }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  // Verify handoff belongs to user
  const { data: handoff } = await supabase
    .from('handoff_requests')
    .select('id, conversation_id, status')
    .eq('id', handoffId)
    .eq('user_id', auth.data.userId)
    .single();

  if (!handoff || handoff.status !== 'pending') {
    return NextResponse.json({ error: 'Handoff não encontrado ou já processado' }, { status: 404 });
  }

  const now = new Date().toISOString();

  if (action === 'accept') {
    await supabase
      .from('handoff_requests')
      .update({ status: 'accepted', accepted_by: auth.data.userId, accepted_at: now })
      .eq('id', handoffId);

    // Conversation stays escalated — human takes over
  } else {
    await supabase
      .from('handoff_requests')
      .update({ status: 'rejected', expired_at: now })
      .eq('id', handoffId);

    // Reactivate bot on the conversation
    await supabase
      .from('agent_conversations')
      .update({ status: 'active' })
      .eq('id', handoff.conversation_id);
  }

  return NextResponse.json({ success: true, action });
}
