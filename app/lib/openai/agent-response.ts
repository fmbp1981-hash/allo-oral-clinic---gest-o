import OpenAI from 'openai';

// Lazy-initialize clients to avoid build-time crash when env vars are absent
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

let _anthropic: any = null;
let _anthropicChecked = false;
function getAnthropic(): any {
  if (!_anthropicChecked) {
    _anthropicChecked = true;
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      } catch {
        // SDK not installed
      }
    }
  }
  return _anthropic;
}

export type MessageRole = 'patient' | 'agent' | 'system';

export interface HistoryMessage {
  role: 'patient' | 'agent';
  content: string;
}

export interface AgentResponseInput {
  agentName: string;
  clinicName: string;
  specialties: string[];
  tone: string;
  customInstructions: string;
  history: HistoryMessage[];
  patientMessage: string;
  maxContextMessages?: number;
  openaiModel?: string;
  patientName?: string;
  patientCategory?: string;
  patientDentist?: string;
  patientObservations?: string;
  handoffKeywords?: string[];
  // Scheduling context
  availableSlots?: string;
  patientUpcomingAppointments?: string;
  businessHours?: string;
  dentistList?: string;
}

export interface AgentReplyResult {
  text: string;
  handoffRequested: boolean;
  handoffReason?: string;
  provider: 'openai' | 'anthropic';
  booking?: BookingRequest | null;
  reschedule?: RescheduleRequest | null;
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const HANDOFF_TAG = '[HANDOFF_REQUIRED]';

export function buildSystemPrompt(input: AgentResponseInput): string {
  const { agentName, clinicName, specialties, tone, customInstructions,
    patientName, patientCategory, patientDentist, patientObservations, handoffKeywords,
    availableSlots, patientUpcomingAppointments, businessHours, dentistList } = input;
  const specialtiesList = specialties.length ? specialties.join(', ') : 'odontologia geral';

  const toneMap: Record<string, string> = {
    formal: 'profissional e respeitoso',
    normal: 'cordial e acolhedor',
    descontraido: 'simpático e descontraído, mas profissional',
    friendly: 'cordial e acolhedor',
  };
  const toneDesc = toneMap[tone] || toneMap.normal;

  const keywords = handoffKeywords?.length
    ? handoffKeywords.join(', ')
    : 'cancelar, reclamação, advogado, processo, falar com humano, atendente';

  let prompt = `Você é ${agentName}, recepcionista virtual da clínica odontológica ${clinicName}.
Especialidades da clínica: ${specialtiesList}.
Tom de comunicação: ${toneDesc}.

## Personalidade
- Seja acolhedor, empático e profissional — nunca frio ou robótico
- Use linguagem natural de WhatsApp (mensagens curtas, máx 300 caracteres por bloco)
- Use *negrito* com asteriscos para destaque (formato WhatsApp nativo)
- NÃO use markdown, bullet points, listas formatadas ou formatação de relatório
- NÃO use emojis em excesso — no máximo 1-2 por mensagem quando natural
- Use "consulta" e não "sessão", "paciente" e não "cliente"
- Refira-se aos dentistas como "Dr." ou "Dra."

## Objetivo principal
Atender pacientes via WhatsApp com acolhimento, tirar dúvidas sobre serviços da clínica,
agendar consultas, remarcar consultas existentes e enviar informações úteis.

## Pipeline de atendimento
1. *Saudação* → entender a necessidade do paciente
2. *Triagem* → classificar: agendamento, dúvida, remarcação, urgência, reclamação
3. *Agendamento* → coletar dados e agendar diretamente na agenda
4. *Confirmação* → confirmar detalhes com o paciente
5. *Pós-consulta* → perguntar se precisa de mais algo
6. *Fidelização* → encerrar com cordialidade

## Regras de segurança (INVIOLÁVEIS)
- NUNCA forneça diagnósticos, opiniões clínicas ou prescreva medicamentos
- NUNCA invente informações sobre preços, procedimentos ou disponibilidade
- NUNCA compartilhe dados de outros pacientes
- Se não souber responder → "Vou confirmar com a equipe e te retorno!"
- Se dor aguda ou emergência → orientar ir ao pronto-socorro/emergência IMEDIATAMENTE

## Regras de agendamento
Ao identificar interesse em agendar uma consulta:
1. Colete: *nome completo*, *procedimento/queixa*, *período preferido* (manhã/tarde), *dentista de preferência* (se houver)
2. Consulte os horários disponíveis (fornecidos no contexto abaixo)
3. Apresente 2-3 opções de horário ao paciente
4. Após confirmação do paciente, emita a tag de agendamento no formato:
   [BOOKING_REQUEST]{"dentist_id":"ID","start_time":"ISO","end_time":"ISO","procedure":"texto","notes":"texto"}[/BOOKING_REQUEST]
5. Após emitir a tag, confirme ao paciente: data, horário, dentista e procedimento

Se NÃO houver horários disponíveis no contexto ou não conseguir visualizar a agenda:
→ Informe ao paciente e transfira para atendente humano (handoff)

## Regras de remarcação
Ao identificar que o paciente quer *remarcar* uma consulta:
1. Verifique se há consulta agendada nos dados do paciente (fornecidos abaixo)
2. Se houver, confirme qual consulta quer remarcar
3. Apresente novos horários disponíveis
4. Após confirmação, emita:
   [RESCHEDULE_REQUEST]{"appointment_id":"ID","new_start_time":"ISO","new_end_time":"ISO"}[/RESCHEDULE_REQUEST]

## Quando escalar para humano
Quando qualquer dessas situações ocorrer, inclua a tag ${HANDOFF_TAG} no INÍCIO da sua resposta seguido do motivo:
- Paciente pede EXPLICITAMENTE para falar com humano/atendente
- Reclamação grave ou insatisfação persistente
- Assunto fora do seu escopo (financeiro, jurídico, etc.)
- Palavras-chave detectadas: ${keywords}
- Você não consegue ajudar após 2 tentativas
- Não há horários disponíveis na agenda e o paciente insiste em agendar

Formato de escalação:
${HANDOFF_TAG}
Motivo: [motivo breve]
[Sua mensagem amigável de despedida para o paciente]`;

  // Patient context
  if (patientName || patientCategory || patientDentist || patientObservations) {
    prompt += `\n\n## Contexto do paciente`;
    if (patientName) prompt += `\n- Nome: ${patientName}`;
    if (patientCategory) prompt += `\n- Último procedimento: ${patientCategory}`;
    if (patientDentist) prompt += `\n- Dentista: ${patientDentist}`;
    if (patientObservations) prompt += `\n- Observações: ${patientObservations}`;
  }

  // Upcoming appointments
  if (patientUpcomingAppointments) {
    prompt += `\n\n## Consultas agendadas do paciente\n${patientUpcomingAppointments}`;
  }

  // Available slots for scheduling
  if (availableSlots) {
    prompt += `\n\n## Horários disponíveis para agendamento\n${availableSlots}`;
  } else {
    prompt += `\n\n## Horários disponíveis para agendamento\nNenhum horário disponível no momento. Se o paciente quiser agendar, transfira para atendente humano.`;
  }

  // Dentist list
  if (dentistList) {
    prompt += `\n\n## Dentistas da clínica\n${dentistList}`;
  }

  // Business hours
  if (businessHours) {
    prompt += `\n\n## Horário de funcionamento\n${businessHours}`;
  }

  if (customInstructions) {
    prompt += `\n\n## Instruções adicionais da clínica\n${customInstructions}`;
  }

  return prompt.trim();
}

/**
 * Builds the OpenAI chat messages array from conversation history + new patient message.
 */
export function buildAgentMessages(input: AgentResponseInput): ChatMessage[] {
  const { history, patientMessage, maxContextMessages = 10 } = input;

  const systemMessage: ChatMessage = {
    role: 'system',
    content: buildSystemPrompt(input),
  };

  const trimmedHistory = history.slice(-maxContextMessages);

  const historyMessages: ChatMessage[] = trimmedHistory.map((m) => ({
    role: m.role === 'patient' ? 'user' : 'assistant',
    content: m.content,
  }));

  const currentMessage: ChatMessage = { role: 'user', content: patientMessage };

  return [systemMessage, ...historyMessages, currentMessage];
}

/**
 * Parses the LLM response for handoff tags.
 */
function parseHandoff(text: string): { cleanText: string; handoffRequested: boolean; handoffReason?: string } {
  if (!text.includes(HANDOFF_TAG)) {
    return { cleanText: text, handoffRequested: false };
  }

  const lines = text.split('\n');
  let handoffReason = '';
  const cleanLines: string[] = [];

  for (const line of lines) {
    if (line.trim() === HANDOFF_TAG) continue;
    if (line.trim().startsWith('Motivo:')) {
      handoffReason = line.replace('Motivo:', '').trim();
      continue;
    }
    cleanLines.push(line);
  }

  return {
    cleanText: cleanLines.join('\n').trim(),
    handoffRequested: true,
    handoffReason: handoffReason || 'Paciente solicitou atendimento humano',
  };
}

// --- Booking / Rescheduling tag parsing ---

export interface BookingRequest {
  dentist_id: string;
  start_time: string;
  end_time: string;
  procedure?: string;
  notes?: string;
}

export interface RescheduleRequest {
  appointment_id: string;
  new_start_time: string;
  new_end_time: string;
}

const BOOKING_TAG_REGEX = /\[BOOKING_REQUEST\]([\s\S]*?)\[\/BOOKING_REQUEST\]/;
const RESCHEDULE_TAG_REGEX = /\[RESCHEDULE_REQUEST\]([\s\S]*?)\[\/RESCHEDULE_REQUEST\]/;

export function parseBookingTag(text: string): { cleanText: string; booking: BookingRequest | null } {
  const match = text.match(BOOKING_TAG_REGEX);
  if (!match) return { cleanText: text, booking: null };

  try {
    const booking = JSON.parse(match[1].trim()) as BookingRequest;
    if (!booking.dentist_id || !booking.start_time || !booking.end_time) {
      return { cleanText: text, booking: null };
    }
    const cleanText = text.replace(BOOKING_TAG_REGEX, '').trim();
    return { cleanText, booking };
  } catch {
    return { cleanText: text, booking: null };
  }
}

export function parseRescheduleTag(text: string): { cleanText: string; reschedule: RescheduleRequest | null } {
  const match = text.match(RESCHEDULE_TAG_REGEX);
  if (!match) return { cleanText: text, reschedule: null };

  try {
    const reschedule = JSON.parse(match[1].trim()) as RescheduleRequest;
    if (!reschedule.appointment_id || !reschedule.new_start_time || !reschedule.new_end_time) {
      return { cleanText: text, reschedule: null };
    }
    const cleanText = text.replace(RESCHEDULE_TAG_REGEX, '').trim();
    return { cleanText, reschedule };
  } catch {
    return { cleanText: text, reschedule: null };
  }
}

/**
 * Calls OpenAI (primary) or Anthropic (fallback) to generate the agent's reply.
 */
export async function generateAgentReply(input: AgentResponseInput): Promise<AgentReplyResult> {
  const messages = buildAgentMessages(input);
  const model = input.openaiModel ?? 'gpt-4o-mini';

  // --- Primary: OpenAI ---
  try {
    const response = await getOpenAI().chat.completions.create({
      model,
      messages,
      max_tokens: 600,
      temperature: 0.6,
    });

    const rawText = response.choices[0]?.message?.content?.trim() ?? '';
    const parsed = parseHandoff(rawText);
    const bookingParsed = parseBookingTag(parsed.cleanText);
    const rescheduleParsed = parseRescheduleTag(bookingParsed.cleanText);

    return {
      text: rescheduleParsed.cleanText || 'Não entendi sua mensagem. Pode repetir?',
      handoffRequested: parsed.handoffRequested,
      handoffReason: parsed.handoffReason,
      provider: 'openai',
      booking: bookingParsed.booking,
      reschedule: rescheduleParsed.reschedule,
    };
  } catch (openaiError) {
    console.error('OpenAI failed, trying Anthropic fallback...', openaiError);

    // --- Fallback: Anthropic ---
    const anthropicClient = getAnthropic();
    if (!anthropicClient) {
      throw openaiError; // No fallback available
    }

    try {
      const systemContent = messages[0].content;
      const anthropicMessages = messages.slice(1).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: m.content,
      }));

      const response = await anthropicClient.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        system: systemContent,
        messages: anthropicMessages,
        max_tokens: 600,
      });

      const rawText = response.content?.[0]?.text?.trim() ?? '';
      const parsed = parseHandoff(rawText);
      const bookingParsed = parseBookingTag(parsed.cleanText);
      const rescheduleParsed = parseRescheduleTag(bookingParsed.cleanText);

      return {
        text: rescheduleParsed.cleanText || 'Não entendi sua mensagem. Pode repetir?',
        handoffRequested: parsed.handoffRequested,
        handoffReason: parsed.handoffReason,
        provider: 'anthropic',
        booking: bookingParsed.booking,
        reschedule: rescheduleParsed.reschedule,
      };
    } catch (anthropicError) {
      console.error('Anthropic fallback also failed:', anthropicError);
      throw openaiError; // Throw original error
    }
  }
}
