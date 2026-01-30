/**
 * Utilitário para parsing inteligente de texto de cards do Trello
 * Extrai informações de pacientes de diferentes formatos de texto
 */

export interface ParsedPatient {
  id: string;
  name: string;
  phone: string;
  email: string;
  treatment: string;
  originalLine: string;
}

/**
 * Regex para detectar telefones brasileiros em diferentes formatos:
 * - (11) 99999-1111
 * - 11 99999-1111
 * - 11999991111
 * - (11) 9999-1111
 */
const PHONE_REGEX = /\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g;

/**
 * Regex para detectar emails
 */
const EMAIL_REGEX = /[\w.-]+@[\w.-]+\.\w+/gi;

/**
 * Limpa e normaliza um número de telefone
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Extrai telefone de uma linha de texto
 */
export function extractPhone(text: string): { phone: string; remaining: string } {
  const match = text.match(PHONE_REGEX);
  if (match && match[0]) {
    const phone = normalizePhone(match[0]);
    const remaining = text.replace(match[0], '').trim();
    return { phone, remaining };
  }
  return { phone: '', remaining: text };
}

/**
 * Extrai email de uma linha de texto
 */
export function extractEmail(text: string): { email: string; remaining: string } {
  const match = text.match(EMAIL_REGEX);
  if (match && match[0]) {
    const email = match[0].toLowerCase();
    const remaining = text.replace(match[0], '').trim();
    return { email, remaining };
  }
  return { email: '', remaining: text };
}

/**
 * Separa nome e tratamento de um texto
 * Tenta identificar separadores comuns: hífen, vírgula, pipe, dois pontos
 */
export function extractNameAndTreatment(text: string): { name: string; treatment: string } {
  // Limpar espaços extras e separadores no início/fim
  const cleaned = text.replace(/^[\s\-,|:]+|[\s\-,|:]+$/g, '').trim();

  // Se não houver separadores, é só o nome
  if (!/[-,|:]/.test(cleaned)) {
    return { name: cleaned, treatment: '' };
  }

  // Separar por hífen, vírgula, pipe ou dois pontos
  const parts = cleaned.split(/[-,|:]/).map(p => p.trim()).filter(Boolean);

  if (parts.length === 0) {
    return { name: '', treatment: '' };
  }

  if (parts.length === 1) {
    return { name: parts[0], treatment: '' };
  }

  // Primeira parte é o nome, o resto é tratamento
  return {
    name: parts[0],
    treatment: parts.slice(1).join(', ')
  };
}

/**
 * Faz o parsing de uma única linha de texto
 */
export function parseLine(line: string, index: number): ParsedPatient | null {
  const trimmed = line.trim();

  // Ignorar linhas muito curtas ou vazias
  if (trimmed.length < 3) {
    return null;
  }

  // Extrair componentes
  const { phone, remaining: afterPhone } = extractPhone(trimmed);
  const { email, remaining: afterEmail } = extractEmail(afterPhone);
  const { name, treatment } = extractNameAndTreatment(afterEmail);

  // Se não conseguiu extrair nada útil, ignorar
  if (!name && !phone && !email) {
    return null;
  }

  return {
    id: `parsed_${Date.now()}_${index}`,
    name: name || 'Nome não identificado',
    phone,
    email,
    treatment,
    originalLine: trimmed
  };
}

/**
 * Faz o parsing do texto completo de um card
 * Tenta extrair múltiplos pacientes separados por quebra de linha
 */
export function parsePatients(text: string): ParsedPatient[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Dividir por quebras de linha
  const lines = text.split(/\r?\n/);

  const patients: ParsedPatient[] = [];

  lines.forEach((line, index) => {
    const parsed = parseLine(line, index);
    if (parsed) {
      patients.push(parsed);
    }
  });

  return patients;
}

/**
 * Cria um paciente vazio para adição manual
 */
export function createEmptyPatient(): ParsedPatient {
  return {
    id: `manual_${Date.now()}`,
    name: '',
    phone: '',
    email: '',
    treatment: '',
    originalLine: ''
  };
}

/**
 * Valida se um paciente tem os dados mínimos necessários
 */
export function isValidPatient(patient: ParsedPatient): boolean {
  return Boolean(patient.name.trim());
}

/**
 * Converte ParsedPatient para o formato do sistema (Patient)
 */
export function toPatientFormat(parsed: ParsedPatient): {
  name: string;
  phone: string;
  email?: string;
  history: string[];
} {
  return {
    name: parsed.name,
    phone: parsed.phone,
    email: parsed.email || undefined,
    history: parsed.treatment ? [parsed.treatment] : []
  };
}
