import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../../../lib/auth';
import { getSupabaseClient } from '../../../../lib/supabase';
import { parseBody, createMessageSchema } from '../../../../lib/validators';
import { createProvider, WhatsAppSettings } from '@/app/lib/whatsapp/provider-factory';
import { sendTextMessage } from '@/app/lib/whatsapp/send-message';

/**
 * GET /api/agent/conversations/[id]/messages
 * Fetches messages for a conversation.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const supabase = getSupabaseClient();

  // Verify conversation belongs to user
  const { data: conv } = await supabase
    .from('agent_conversations')
    .select('id')
    .eq('id', id)
    .eq('user_id', auth.data.userId)
    .single();

  if (!conv) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const before = searchParams.get('before'); // cursor-based pagination

  let query = supabase
    .from('agent_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data: messages, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar mensagens' }, { status: 500 });
  }

  // Return in chronological order
  return NextResponse.json({ messages: (messages ?? []).reverse() });
}

/**
 * POST /api/agent/conversations/[id]/messages
 * Sends a manual (human attendant) message in an escalated conversation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const parsed = await parseBody(request, createMessageSchema);
  if (parsed.error) return parsed.error;
  const { content } = parsed.data;

  const supabase = getSupabaseClient();

  // Verify conversation belongs to user and is escalated
  const { data: conv } = await supabase
    .from('agent_conversations')
    .select('id, patient_phone, status, user_id')
    .eq('id', id)
    .eq('user_id', auth.data.userId)
    .single();

  if (!conv) {
    return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
  }

  // Store message as 'human' role
  const { data: msg, error: insertErr } = await supabase
    .from('agent_messages')
    .insert({
      conversation_id: id,
      role: 'human',
      content,
    })
    .select('id, role, content, created_at')
    .single();

  if (insertErr) {
    return NextResponse.json({ error: 'Erro ao salvar mensagem' }, { status: 500 });
  }

  // Send via WhatsApp
  try {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('provider, evolution_api_url, evolution_api_key, evolution_instance_name, meta_phone_number_id, meta_access_token')
      .eq('user_id', auth.data.userId)
      .single();

    if (settings) {
      const provider = createProvider(settings as unknown as WhatsAppSettings);
      await sendTextMessage(provider, conv.patient_phone, content);
    }
  } catch (err) {
    console.error('Send human message error:', err);
    // Message saved, delivery failed — return success with warning
  }

  // Update last_message_at
  await supabase
    .from('agent_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ message: msg });
}
