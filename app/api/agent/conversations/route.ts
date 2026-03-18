import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient } from '../../lib/supabase';

/**
 * GET /api/agent/conversations
 * Lists active agent conversations with last message preview.
 * Query params: page, limit (default 20)
 */
export async function GET(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { userId } = auth.data;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const supabase = getSupabaseClient();

  const from = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from('agent_conversations')
    .select(
      `id, patient_phone, status, created_at, last_message_at,
       patients(id, name),
       agent_messages(content, role, created_at)`,
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .range(from, from + limit - 1);

  if (error) {
    console.error('List conversations error:', error);
    return NextResponse.json({ error: 'Erro ao listar conversas' }, { status: 500 });
  }

  return NextResponse.json({ conversations: data ?? [], total: count ?? 0, page, limit });
}
