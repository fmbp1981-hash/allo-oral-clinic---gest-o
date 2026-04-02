import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../../../lib/auth';
import { getSupabaseClient } from '../../../../lib/supabase';
import { parseBody, updateConversationStatusSchema } from '../../../../lib/validators';

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
  const parsed = await parseBody(request, updateConversationStatusSchema);
  if (parsed.error) return parsed.error;
  const { status } = parsed.data;

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
