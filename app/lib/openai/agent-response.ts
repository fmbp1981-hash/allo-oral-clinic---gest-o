import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Optional Anthropic fallback
let anthropic: any = null;
if (process.env.ANTHROPIC_API_KEY) {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  } catch {
    // Anthropic SDK not installed — fallback disabled
  }
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
}

export interface AgentReplyResult {
  text: string;
  handoffRequested: boolean;
  handoffReason?: string;
  provider: 'openai' | 'anthropic';
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const HANDOFF_TAG = '[HANDOFF_REQUIRED]';

export function buildSystemPrompt(input: AgentResponseInput): string {
  const { agentName, clinicName, specialties, tone, customInstructions,
    patientName, patientCategory, patientDentist, patientObservations, handoffKeywords } = input;
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

  let prompt = `Você é ${agentName}, recepcionista virtual da ${clinicName}.
Especialidades da clínica: ${specialtiesList}.
Tom de comunicação: ${toneDesc}.

## Personalidade
- Seja acolhedor, empático e profissional
- Use linguagem natural de WhatsApp (mensagens curtas, máx 300 caracteres por bloco)
- Use *negrito* com asteriscos para destaque (formato WhatsApp nativo)
- NÃO use markdown, bullet points, listas formatadas ou formatação de relatório
- NÃO use emojis em excesso — no máximo 1-2 por mensagem quando natural

## Objetivo principal
Atender pacientes que responderam a mensagens de reativação.
Tirar dúvidas, informar sobre serviços e agendar consultas.

## Regras de negócio
- NUNCA marque consultas — apenas colete dados e informe que a equipe entrará em contato
- NUNCA dê diagnósticos, prescreva medicamentos ou dê opiniões clínicas
- NUNCA invente informações sobre preços, procedimentos ou disponibilidade
- Ao identificar interesse em agendar → pergunte: nome completo, melhor horário, dentista de preferência
- Se não souber responder após 2 tentativas → ofereça transferir para atendente humano
- Responda SEMPRE em português brasileiro

## Quando escalar para humano
Quando qualquer dessas situações ocorrer, inclua a tag ${HANDOFF_TAG} no INÍCIO da sua resposta seguido do motivo:
- Paciente pede EXPLICITAMENTE para falar com humano/atendente
- Reclamação grave ou insatisfação persistente
- Assunto fora do seu escopo (financeiro, jurídico, etc.)
- Palavras-chave detectadas: ${keywords}
- Você não consegue ajudar após 2 tentativas

Formato de escalação:
${HANDOFF_TAG}
Motivo: [motivo breve]
[Sua mensagem amigável de despedida para o paciente]`;

  if (patientName || patientCategory || patientDentist || patientObservations) {
    prompt += `\n\n## Contexto do paciente`;
    if (patientName) prompt += `\n- Nome: ${patientName}`;
    if (patientCategory) prompt += `\n- Último procedimento: ${patientCategory}`;
    if (patientDentist) prompt += `\n- Dentista: ${patientDentist}`;
    if (patientObservations) prompt += `\n- Observações: ${patientObservations}`;
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

/**
 * Calls OpenAI (primary) or Anthropic (fallback) to generate the agent's reply.
 */
export async function generateAgentReply(input: AgentResponseInput): Promise<AgentReplyResult> {
  const messages = buildAgentMessages(input);
  const model = input.openaiModel ?? 'gpt-4o-mini';

  // --- Primary: OpenAI ---
  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 400,
      temperature: 0.6,
    });

    const rawText = response.choices[0]?.message?.content?.trim() ?? '';
    const parsed = parseHandoff(rawText);

    return {
      text: parsed.cleanText || 'Não entendi sua mensagem. Pode repetir?',
      handoffRequested: parsed.handoffRequested,
      handoffReason: parsed.handoffReason,
      provider: 'openai',
    };
  } catch (openaiError) {
    console.error('OpenAI failed, trying Anthropic fallback...', openaiError);

    // --- Fallback: Anthropic ---
    if (!anthropic) {
      throw openaiError; // No fallback available
    }

    try {
      const systemContent = messages[0].content;
      const anthropicMessages = messages.slice(1).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: m.content,
      }));

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        system: systemContent,
        messages: anthropicMessages,
        max_tokens: 400,
      });

      const rawText = response.content?.[0]?.text?.trim() ?? '';
      const parsed = parseHandoff(rawText);

      return {
        text: parsed.cleanText || 'Não entendi sua mensagem. Pode repetir?',
        handoffRequested: parsed.handoffRequested,
        handoffReason: parsed.handoffReason,
        provider: 'anthropic',
      };
    } catch (anthropicError) {
      console.error('Anthropic fallback also failed:', anthropicError);
      throw openaiError; // Throw original error
    }
  }
}
