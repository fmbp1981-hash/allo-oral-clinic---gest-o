import { describe, it, expect, vi } from 'vitest';

// Mock OpenAI at module level to prevent constructor from needing API key
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: vi.fn() } };
  },
}));

import { buildAgentMessages, buildSystemPrompt } from '@/app/lib/openai/agent-response';

const baseInput = {
  agentName: 'Sofia',
  clinicName: 'Allo Oral Clinic',
  specialties: ['Implante', 'Ortodontia'] as string[],
  tone: 'formal',
  customInstructions: '',
  history: [] as { role: 'patient' | 'agent'; content: string }[],
  patientMessage: 'Olá',
};

describe('buildSystemPrompt', () => {
  it('includes agent name and clinic name', () => {
    const prompt = buildSystemPrompt(baseInput);
    expect(prompt).toContain('Sofia');
    expect(prompt).toContain('Allo Oral Clinic');
  });

  it('includes specialties', () => {
    const prompt = buildSystemPrompt(baseInput);
    expect(prompt).toContain('Implante');
    expect(prompt).toContain('Ortodontia');
  });

  it('includes handoff instructions with HANDOFF_REQUIRED tag', () => {
    const prompt = buildSystemPrompt(baseInput);
    expect(prompt).toContain('[HANDOFF_REQUIRED]');
    expect(prompt).toContain('escalar para humano');
  });

  it('includes patient context when provided', () => {
    const prompt = buildSystemPrompt({
      ...baseInput,
      patientName: 'João Silva',
      patientCategory: 'Implante',
      patientDentist: 'Dr. Maria',
      patientObservations: 'Alergia a penicilina',
    });
    expect(prompt).toContain('João Silva');
    expect(prompt).toContain('Implante');
    expect(prompt).toContain('Dr. Maria');
    expect(prompt).toContain('Alergia a penicilina');
  });

  it('includes custom handoff keywords when provided', () => {
    const prompt = buildSystemPrompt({
      ...baseInput,
      handoffKeywords: ['urgência', 'emergência'],
    });
    expect(prompt).toContain('urgência');
    expect(prompt).toContain('emergência');
  });

  it('includes custom instructions', () => {
    const prompt = buildSystemPrompt({
      ...baseInput,
      customInstructions: 'Nunca marque consulta diretamente.',
    });
    expect(prompt).toContain('Nunca marque consulta diretamente.');
  });
});

describe('buildAgentMessages', () => {
  it('starts with a system message', () => {
    const messages = buildAgentMessages(baseInput);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('Sofia');
    expect(messages[0].content).toContain('Allo Oral Clinic');
  });

  it('includes history messages in correct order', () => {
    const history = [
      { role: 'patient' as const, content: 'Primeira mensagem' },
      { role: 'agent' as const, content: 'Resposta do agente' },
    ];
    const messages = buildAgentMessages({
      ...baseInput,
      history,
      patientMessage: 'Nova mensagem',
    });
    // system + 2 history + current patient message
    expect(messages).toHaveLength(4);
    expect(messages[1]).toEqual({ role: 'user', content: 'Primeira mensagem' });
    expect(messages[2]).toEqual({ role: 'assistant', content: 'Resposta do agente' });
    expect(messages[3]).toEqual({ role: 'user', content: 'Nova mensagem' });
  });

  it('truncates history to max_context_messages', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 === 0 ? 'patient' : 'agent') as 'patient' | 'agent',
      content: `msg ${i}`,
    }));
    const messages = buildAgentMessages({
      ...baseInput,
      history,
      patientMessage: 'new',
      maxContextMessages: 4,
    });
    // system + 4 history + current = 6
    expect(messages).toHaveLength(6);
  });

  it('maps tone to a description in system prompt', () => {
    const formal = buildAgentMessages({ ...baseInput, tone: 'formal' });
    expect(formal[0].content).toContain('profissional');

    const friendly = buildAgentMessages({ ...baseInput, tone: 'friendly' });
    expect(friendly[0].content).toContain('cordial');
  });
});
