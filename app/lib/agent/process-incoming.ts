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
    .select('id, name, category, dentist_name, observations')
    .ilike('phone', `%${last9}`)
    .limit(1)
    .single();

  // --- 4b. Fetch scheduling context for the agent ---
  let schedulingContext = { availableSlots: '', patientUpcomingAppointments: '', businessHours: '', dentistList: '' };
  try {
    // Fetch active dentists
    const { data: dentists } = await supabase
      .from('dentists')
      .select('id, name, specialty')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name');

    if (dentists && dentists.length > 0) {
      schedulingContext.dentistList = dentists.map(d => `${d.name}${d.specialty ? ` (${d.specialty})` : ''} [id:${d.id}]`).join('; ');

      // Fetch business hours (schedule config) for next 3 days
      const today = new Date();
      const daysToCheck = [0, 1, 2].map(offset => {
        const d = new Date(today);
        d.setDate(d.getDate() + offset);
        return d;
      });

      const hoursLines: string[] = [];
      for (const day of daysToCheck) {
        const dow = day.getDay();
        const dateStr = day.toISOString().split('T')[0];
        const { data: configs } = await supabase
          .from('schedule_config')
          .select('dentist_id, start_time, end_time, lunch_start, lunch_end, slot_duration_minutes')
          .in('dentist_id', dentists.map(d => d.id))
          .eq('day_of_week', dow)
          .eq('is_active', true);

        if (configs && configs.length > 0) {
          for (const cfg of configs) {
            const dentistName = dentists.find(d => d.id === cfg.dentist_id)?.name ?? '';
            hoursLines.push(`${dateStr} (${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dow]}) - ${dentistName}: ${cfg.start_time}-${cfg.end_time}${cfg.lunch_start ? ` (almoço ${cfg.lunch_start}-${cfg.lunch_end})` : ''}, slots de ${cfg.slot_duration_minutes}min`);
          }
        }
      }
      if (hoursLines.length > 0) schedulingContext.businessHours = hoursLines.join('\n');

      // Fetch available slots for today and tomorrow for the first dentist
      if (dentists[0]) {
        const slotsLines: string[] = [];
        for (const day of daysToCheck.slice(0, 2)) {
          const dateStr = day.toISOString().split('T')[0];
          const dow = day.getDay();
          const { data: config } = await supabase
            .from('schedule_config')
            .select('start_time, end_time, lunch_start, lunch_end, slot_duration_minutes')
            .eq('dentist_id', dentists[0].id)
            .eq('day_of_week', dow)
            .eq('is_active', true)
            .single();

          if (config) {
            // Fetch existing appointments
            const { data: existing } = await supabase
              .from('appointments')
              .select('start_time, end_time')
              .eq('dentist_id', dentists[0].id)
              .not('status', 'in', '("cancelled","rescheduled")')
              .gte('start_time', `${dateStr}T00:00:00`)
              .lte('start_time', `${dateStr}T23:59:59`);

            const booked = (existing || []).map(a => `${new Date(a.start_time).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}-${new Date(a.end_time).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}`);
            slotsLines.push(`${dateStr}: Horário ${config.start_time}-${config.end_time}, já ocupados: ${booked.length > 0 ? booked.join(', ') : 'nenhum'}`);
          }
        }
        if (slotsLines.length > 0) schedulingContext.availableSlots = slotsLines.join('\n');
      }

      // Fetch patient upcoming appointments
      if (patientData?.id) {
        const { data: upcoming } = await supabase
          .from('appointments')
          .select('start_time, end_time, procedure, status, dentists(name)')
          .eq('patient_id', patientData.id)
          .not('status', 'in', '("cancelled","rescheduled")')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(3);

        if (upcoming && upcoming.length > 0) {
          schedulingContext.patientUpcomingAppointments = upcoming.map(a => {
            const d = new Date(a.start_time);
            const dentistName = (a.dentists as unknown as { name: string })?.name ?? '';
            return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})} - ${a.procedure || 'Consulta'} com ${dentistName} (${a.status})`;
          }).join('; ');
        }
      }
    }
  } catch (err) {
    console.error('process-incoming: scheduling context fetch error (non-fatal)', err);
  }

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
      availableSlots: schedulingContext.availableSlots || undefined,
      patientUpcomingAppointments: schedulingContext.patientUpcomingAppointments || undefined,
      businessHours: schedulingContext.businessHours || undefined,
      dentistList: schedulingContext.dentistList || undefined,
    });
  } catch (err) {
    console.error('process-incoming: generateAgentReply error', err);
    return 'error';
  }

  // --- 6b. Process booking/reschedule tags from AI reply ---
  if (result.booking && patientData?.id) {
    try {
      // Check for conflicts before creating
      const { data: conflicts } = await supabase
        .from('appointments')
        .select('id')
        .eq('dentist_id', result.booking.dentist_id)
        .not('status', 'in', '("cancelled","rescheduled")')
        .lt('start_time', result.booking.end_time)
        .gt('end_time', result.booking.start_time);

      if (!conflicts || conflicts.length === 0) {
        const { data: newAppt } = await supabase
          .from('appointments')
          .insert({
            user_id: userId,
            patient_id: patientData.id,
            dentist_id: result.booking.dentist_id,
            start_time: result.booking.start_time,
            end_time: result.booking.end_time,
            procedure: result.booking.procedure || null,
            notes: result.booking.notes || null,
            source: 'agent',
            status: 'scheduled',
          })
          .select('id')
          .single();

        if (newAppt) {
          // Create history entry
          await supabase.from('appointment_history').insert({
            appointment_id: newAppt.id,
            to_status: 'scheduled',
            changed_by: userId,
            notes: 'Agendado automaticamente pelo agente IA',
          });
          // Create reminders
          const apptStart = new Date(result.booking.start_time);
          const now = new Date();
          const reminders = [];
          const r24h = new Date(apptStart.getTime() - 24 * 60 * 60 * 1000);
          const r2h = new Date(apptStart.getTime() - 2 * 60 * 60 * 1000);
          if (r24h > now) reminders.push({ appointment_id: newAppt.id, user_id: userId, reminder_type: '24h_before', scheduled_at: r24h.toISOString(), status: 'pending' });
          if (r2h > now) reminders.push({ appointment_id: newAppt.id, user_id: userId, reminder_type: '2h_before', scheduled_at: r2h.toISOString(), status: 'pending' });
          if (reminders.length > 0) await supabase.from('appointment_reminders').insert(reminders);
        }
      } else {
        console.warn('process-incoming: booking conflict detected, appointment not created');
      }
    } catch (err) {
      console.error('process-incoming: booking creation error (non-fatal)', err);
    }
  }

  if (result.reschedule && patientData?.id) {
    try {
      // Fetch existing appointment
      const { data: existingAppt } = await supabase
        .from('appointments')
        .select('id, status, dentist_id')
        .eq('id', result.reschedule.appointment_id)
        .eq('user_id', userId)
        .single();

      if (existingAppt) {
        // Check conflicts for new time
        const { data: conflicts } = await supabase
          .from('appointments')
          .select('id')
          .eq('dentist_id', existingAppt.dentist_id)
          .not('status', 'in', '("cancelled","rescheduled")')
          .neq('id', existingAppt.id)
          .lt('start_time', result.reschedule.new_end_time)
          .gt('end_time', result.reschedule.new_start_time);

        if (!conflicts || conflicts.length === 0) {
          // Mark old as rescheduled
          await supabase.from('appointments')
            .update({ status: 'rescheduled', updated_at: new Date().toISOString() })
            .eq('id', existingAppt.id);

          await supabase.from('appointment_history').insert({
            appointment_id: existingAppt.id,
            from_status: existingAppt.status,
            to_status: 'rescheduled',
            changed_by: userId,
            notes: 'Remarcado pelo agente IA',
          });

          // Cancel old reminders
          await supabase.from('appointment_reminders')
            .update({ status: 'cancelled' })
            .eq('appointment_id', existingAppt.id)
            .eq('status', 'pending');

          // Create new appointment
          const { data: newAppt } = await supabase
            .from('appointments')
            .insert({
              user_id: userId,
              patient_id: patientData.id,
              dentist_id: existingAppt.dentist_id,
              start_time: result.reschedule.new_start_time,
              end_time: result.reschedule.new_end_time,
              source: 'agent',
              status: 'scheduled',
              original_appointment_id: existingAppt.id,
            })
            .select('id')
            .single();

          if (newAppt) {
            await supabase.from('appointment_history').insert({
              appointment_id: newAppt.id,
              to_status: 'scheduled',
              changed_by: userId,
              notes: `Remarcação da consulta ${existingAppt.id} pelo agente IA`,
            });
            const apptStart = new Date(result.reschedule.new_start_time);
            const now = new Date();
            const reminders = [];
            const r24h = new Date(apptStart.getTime() - 24 * 60 * 60 * 1000);
            const r2h = new Date(apptStart.getTime() - 2 * 60 * 60 * 1000);
            if (r24h > now) reminders.push({ appointment_id: newAppt.id, user_id: userId, reminder_type: '24h_before', scheduled_at: r24h.toISOString(), status: 'pending' });
            if (r2h > now) reminders.push({ appointment_id: newAppt.id, user_id: userId, reminder_type: '2h_before', scheduled_at: r2h.toISOString(), status: 'pending' });
            if (reminders.length > 0) await supabase.from('appointment_reminders').insert(reminders);
          }
        }
      }
    } catch (err) {
      console.error('process-incoming: reschedule error (non-fatal)', err);
    }
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
