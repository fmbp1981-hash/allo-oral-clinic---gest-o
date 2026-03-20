import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../../../lib/auth';
import { getSupabaseClient } from '../../../../lib/supabase';

type ConversationStatus = 'active' | 'escalated' | 'closed';
const VALID_STATUSES: ConversationStatus[] = ['active', 'escalated', 'closed'];

/**
 * PUT /api/agent/conversations/[id]/status
 * Updates a conversation status (e.g., escalate, close, reactivate)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const body = await request.json();
  const status = body.status as string;

  if (!VALID_STATUSES.includes(status as ConversationStatus)) {
    return NextResponse.json(
      { error: `Status inválido. Valores aceitos: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('agent_conversations')
    .update({ status })
    .eq('id', id)
    .eq('user_id', auth.data.userId)
    .select('id, status')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
  }

  return NextResponse.json({ conversation: data });
}
