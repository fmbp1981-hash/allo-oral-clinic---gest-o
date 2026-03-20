import OpenAI from 'openai';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export interface PersonalizeInput {
  patientName: string;
  category?: string;
  dentistName?: string;
  observations?: string;
  clinicName: string;
  messageTemplate: string;
}

/**
 * Uses GPT-4o-mini to personalize a message template for a specific patient.
 * Keeps the message natural, brief, and within the specified tone.
 */
export async function personalizeMessage(input: PersonalizeInput): Promise<string> {
  const { patientName, category, dentistName, observations, clinicName, messageTemplate } = input;

  const systemPrompt = `Você é um assistente de comunicação para a clínica odontológica "${clinicName}".
Sua tarefa é personalizar uma mensagem modelo para um paciente específico.
Mantenha a mensagem natural, amigável e profissional.
Retorne APENAS a mensagem personalizada, sem explicações ou formatação adicional.
Máximo de 300 caracteres.`;

  const userPrompt = `Personalize esta mensagem para o paciente:
Nome: ${patientName}
${category ? `Categoria/Procedimento: ${category}` : ''}
${dentistName ? `Dentista responsável: ${dentistName}` : ''}
${observations ? `Observações: ${observations}` : ''}

Modelo de mensagem:
${messageTemplate}`;

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 200,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content?.trim() ?? messageTemplate;
}
