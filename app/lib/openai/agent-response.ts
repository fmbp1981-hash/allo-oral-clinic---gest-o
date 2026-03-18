import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
}

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

function buildSystemPrompt(input: AgentResponseInput): string {
  const { agentName, clinicName, specialties, tone, customInstructions } = input;
  const specialtiesList = specialties.length ? specialties.join(', ') : 'odontologia geral';

  return `Você é ${agentName}, assistente virtual da ${clinicName}.
Especialidades da clínica: ${specialtiesList}.
Tom de comunicação: ${tone}.
Você é um AGENTE PASSIVO — nunca inicia conversas, apenas responde mensagens recebidas.
Seja prestativo, humano e conciso. Não invente informações sobre procedimentos ou preços.
Quando o paciente perguntar sobre agendamento, oriente-o a ligar ou informar o número da clínica.
${customInstructions ? `\nInstruções adicionais:\n${customInstructions}` : ''}`.trim();
}

/**
 * Builds the OpenAI chat messages array from conversation history + new patient message.
 * Pure function — no I/O, fully testable.
 */
export function buildAgentMessages(input: AgentResponseInput): ChatMessage[] {
  const { history, patientMessage, maxContextMessages = 10 } = input;

  const systemMessage: ChatMessage = {
    role: 'system',
    content: buildSystemPrompt(input),
  };

  // Take the last maxContextMessages history entries
  const trimmedHistory = history.slice(-maxContextMessages);

  const historyMessages: ChatMessage[] = trimmedHistory.map((m) => ({
    role: m.role === 'patient' ? 'user' : 'assistant',
    content: m.content,
  }));

  const currentMessage: ChatMessage = { role: 'user', content: patientMessage };

  return [systemMessage, ...historyMessages, currentMessage];
}

/**
 * Calls OpenAI to generate the agent's reply.
 */
export async function generateAgentReply(input: AgentResponseInput): Promise<string> {
  const messages = buildAgentMessages(input);
  const model = input.openaiModel ?? 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: 300,
    temperature: 0.6,
  });

  return response.choices[0]?.message?.content?.trim() ?? 'Não entendi sua mensagem. Pode repetir?';
}
