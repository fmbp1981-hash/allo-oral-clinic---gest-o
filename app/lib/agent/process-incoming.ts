import { getSupabaseClient } from '@/app/api/lib/supabase';
import { generateAgentReply, HistoryMessage, AgentReplyResult } from '@/app/lib/openai/agent-response';
import { createProvider, WhatsAppSettings } from '@/app/lib/whatsapp/provider-factory';
import { sendTextMessage } from '@/app/lib/whatsapp/send-message';
import { normalizePhone } from '@/app/lib/whatsapp/normalize-phone';
import { sendHumanizedResponse } from './humanizer';

export interface IncomingMessage {
  phone: string;     // raw phone from webhook
  text: string;      // message content
  messageId?: string;
}

export type ProcessResult = 'ok' | 'ignored' | 'no_agent' | 'escalated' | 'error';

/**
 * Processes an incoming patient message:
 * 1. Identifies the clinic (user) by patient phone
 * 2. Checks agent is enabled + conversation not escalated
 * 3. Upserts conversation & stores message
 * 4. Generates AI reply (with handoff detection)
 * 5. If handoff → escalate conversation to human
 * 6. Otherwise → stores reply & sends via WhatsApp with humanized delays
 */
export async function processIncomingMessage(
  incoming: IncomingMessage,
  targetUserId?: string
): Promise<ProcessResult> {
  const supabase = getSupabaseClient();
  const phone = normalizePhone(incoming.phone);
  if (!phone) return 'ignored';

  // --- 1. Identify the user (clinic) for this patient phone ---
  let userId: string | null = targetUserId ?? null;

  if (!userId) {
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

  // --- 3. Upsert conversation & check status ---
  const { data: conversation, error: convErr } = await supabase
    .from('agent_conversations')
    .upsert(
      { user_id: userId, patient_phone: phone, last_message_at: new Date().toISOString() },
      { onConflict: 'user_id,patient_phone' }
    )
    .select('id, status')
    .single();

  if (convErr || !conversation) {
    console.error('process-incoming: conversation upsert error', convErr);
    return 'error';
  }

  // Skip AI processing for escalated/closed conversations
  if (conversation.status === 'escalated' || conversation.status === 'closed') {
    // Still store the message for visibility in the human chat
    await supabase.from('agent_messages').insert({
      conversation_id: conversation.id,
      role: 'patient',
      content: incoming.text,
    });
    return 'escalated';
  }

  // Store incoming message
  await supabase.from('agent_messages').insert({
    conversation_id: conversation.id,
    role: 'patient',
    content: incoming.text,
  });

  // --- 4. Fetch patient context (if available) ---
  const last9 = phone.slice(-9);
  const { data: patientData } = await supabase
    .from('patients')
    .select('name, category, dentist_name, observations')
    .ilike('phone', `%${last9}`)
    .limit(1)
    .single();

  // --- 5. Fetch conversation history ---
  const { data: historyRows } = await supabase
    .from('agent_messages')
    .select('role, content')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: true })
    .limit((agentConfig.max_context_messages as number | undefined) ?? 10);

  const history: HistoryMessage[] = (historyRows ?? [])
    .filter((m) => m.role === 'patient' || m.role === 'agent')
    .map((m) => ({ role: m.role as 'patient' | 'agent', content: m.content as string }));

  // --- 6. Generate AI reply ---
  let result: AgentReplyResult;
  try {
    result = await generateAgentReply({
      agentName: (agentConfig.name as string) ?? 'Assistente',
      clinicName: (settings?.clinic_name as string) ?? 'Clínica',
      specialties: (agentConfig.specialties as string[]) ?? [],
      tone: (agentConfig.tone as string) ?? 'friendly',
      customInstructions: (agentConfig.custom_instructions as string) ?? '',
      history,
      patientMessage: incoming.text,
      maxContextMessages: (agentConfig.max_context_messages as number | undefined) ?? 10,
      openaiModel: (agentConfig.openai_model as string | undefined) ?? 'gpt-4o-mini',
      patientName: patientData?.name ?? undefined,
      patientCategory: patientData?.category ?? undefined,
      patientDentist: patientData?.dentist_name ?? undefined,
      patientObservations: patientData?.observations ?? undefined,
    });
  } catch (err) {
    console.error('process-incoming: generateAgentReply error', err);
    return 'error';
  }

  // --- 7. Handle handoff request ---
  if (result.handoffRequested) {
    // Update conversation status to escalated
    await supabase
      .from('agent_conversations')
      .update({ status: 'escalated' })
      .eq('id', conversation.id);

    // Create handoff request
    await supabase.from('handoff_requests').insert({
      conversation_id: conversation.id,
      user_id: userId,
      reason: result.handoffReason ?? 'Paciente solicitou atendimento humano',
      ai_summary: history.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n'),
      status: 'pending',
    });

    // Store the agent's final message (before handoff)
    if (result.text) {
      await supabase.from('agent_messages').insert({
        conversation_id: conversation.id,
        role: 'agent',
        content: result.text,
      });

      // Send final message before handoff
      try {
        const provider = createProvider(settings as unknown as WhatsAppSettings);
        await sendTextMessage(provider, phone, result.text);
      } catch (err) {
        console.error('process-incoming: send handoff message error', err);
      }
    }

    return 'escalated';
  }

  // --- 8. Store agent reply ---
  await supabase.from('agent_messages').insert({
    conversation_id: conversation.id,
    role: 'agent',
    content: result.text,
  });

  // --- 9. Send reply via WhatsApp with humanized delays ---
  try {
    const provider = createProvider(settings as unknown as WhatsAppSettings);

    await sendHumanizedResponse(
      phone,
      result.text,
      incoming.messageId,
      {
        sendTyping: async (p) => {
          if (provider.sendTyping) await provider.sendTyping(p);
        },
        sendMessage: async (p, text) => {
          await sendTextMessage(provider, p, text);
        },
      },
    );
  } catch (err) {
    console.error('process-incoming: send reply error', err);
    // Don't fail — message is stored, just not delivered
  }

  return 'ok';
}
