import { getSupabaseClient } from '@/app/api/lib/supabase';
import { generateAgentReply, HistoryMessage } from '@/app/lib/openai/agent-response';
import { createProvider, WhatsAppSettings } from '@/app/lib/whatsapp/provider-factory';
import { sendTextMessage } from '@/app/lib/whatsapp/send-message';
import { normalizePhone } from '@/app/lib/whatsapp/normalize-phone';

export interface IncomingMessage {
  phone: string;     // raw phone from webhook
  text: string;      // message content
  messageId?: string;
}

/**
 * Processes an incoming patient message:
 * 1. Identifies the clinic (user) by patient phone
 * 2. Checks agent is enabled
 * 3. Upserts conversation & stores message
 * 4. Generates AI reply
 * 5. Stores reply & sends via WhatsApp
 *
 * @returns 'ok' | 'ignored' | 'no_agent' | 'error'
 */
export async function processIncomingMessage(
  incoming: IncomingMessage,
  targetUserId?: string  // optional: provider webhook can supply it if known
): Promise<'ok' | 'ignored' | 'no_agent' | 'error'> {
  const supabase = getSupabaseClient();
  const phone = normalizePhone(incoming.phone);
  if (!phone) return 'ignored';

  // --- 1. Identify the user (clinic) for this patient phone ---
  let userId: string | null = targetUserId ?? null;

  if (!userId) {
    // Find patient by last 9 digits (handles 8/9 digit variations)
    const last9 = phone.slice(-9);
    const { data: patient } = await supabase
      .from('patients')
      .select('user_id')
      .ilike('phone', `%${last9}`)
      .limit(1)
      .single();

    userId = (patient?.user_id as string) ?? null;
  }

  if (!userId) return 'ignored';

  // --- 2. Fetch user settings + check agent enabled ---
  const { data: settings } = await supabase
    .from('user_settings')
    .select('agent_config, provider, evolution_api_url, evolution_api_key, evolution_instance_name, meta_phone_number_id, meta_access_token, clinic_name')
    .eq('user_id', userId)
    .single();

  const agentConfig = (settings?.agent_config as Record<string, unknown>) ?? {};
  if (!agentConfig.enabled) return 'no_agent';

  // --- 3. Upsert conversation ---
  const { data: conversation, error: convErr } = await supabase
    .from('agent_conversations')
    .upsert(
      { user_id: userId, patient_phone: phone, last_message_at: new Date().toISOString() },
      { onConflict: 'user_id,patient_phone' }
    )
    .select('id')
    .single();

  if (convErr || !conversation) {
    console.error('process-incoming: conversation upsert error', convErr);
    return 'error';
  }

  // Store incoming message
  await supabase.from('agent_messages').insert({
    conversation_id: conversation.id,
    role: 'patient',
    content: incoming.text,
  });

  // --- 4. Fetch conversation history ---
  const { data: historyRows } = await supabase
    .from('agent_messages')
    .select('role, content')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true })
    .limit((agentConfig.max_context_messages as number | undefined) ?? 10);

  const history: HistoryMessage[] = (historyRows ?? [])
    .filter((m) => m.role === 'patient' || m.role === 'agent')
    .map((m) => ({ role: m.role as 'patient' | 'agent', content: m.content as string }));

  // --- 5. Generate AI reply ---
  let reply: string;
  try {
    reply = await generateAgentReply({
      agentName: (agentConfig.name as string) ?? 'Assistente',
      clinicName: (settings?.clinic_name as string) ?? 'Clínica',
      specialties: (agentConfig.specialties as string[]) ?? [],
      tone: (agentConfig.tone as string) ?? 'friendly',
      customInstructions: (agentConfig.custom_instructions as string) ?? '',
      history,
      patientMessage: incoming.text,
      maxContextMessages: (agentConfig.max_context_messages as number | undefined) ?? 10,
      openaiModel: (agentConfig.openai_model as string | undefined) ?? 'gpt-4o-mini',
    });
  } catch (err) {
    console.error('process-incoming: generateAgentReply error', err);
    return 'error';
  }

  // Store agent reply
  await supabase.from('agent_messages').insert({
    conversation_id: conversation.id,
    role: 'agent',
    content: reply,
  });

  // --- 6. Send reply via WhatsApp ---
  try {
    const provider = createProvider(settings as unknown as WhatsAppSettings);
    await sendTextMessage(provider, phone, reply, { humanize: true });
  } catch (err) {
    console.error('process-incoming: send reply error', err);
    // Don't fail — message is stored, just not delivered
  }

  return 'ok';
}
