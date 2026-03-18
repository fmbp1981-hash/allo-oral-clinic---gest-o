import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildAgentMessages } from '@/app/lib/openai/agent-response';

describe('buildAgentMessages', () => {
  it('starts with a system message', () => {
    const messages = buildAgentMessages({
      agentName: 'Sofia',
      clinicName: 'Allo Oral Clinic',
      specialties: ['Implante', 'Ortodontia'],
      tone: 'formal',
      customInstructions: '',
      history: [],
      patientMessage: 'Olá',
    });
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
      agentName: 'Sofia',
      clinicName: 'Clínica',
      specialties: [],
      tone: 'friendly',
      customInstructions: '',
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
      agentName: 'Sofia',
      clinicName: 'Clínica',
      specialties: [],
      tone: 'friendly',
      customInstructions: '',
      history,
      patientMessage: 'new',
      maxContextMessages: 4,
    });
    // system + 4 history + current = 6
    expect(messages).toHaveLength(6);
  });

  it('maps tone values into system prompt', () => {
    const messages = buildAgentMessages({
      agentName: 'Sofia',
      clinicName: 'Clínica',
      specialties: [],
      tone: 'casual',
      customInstructions: 'Nunca marque consulta diretamente.',
      history: [],
      patientMessage: 'Oi',
    });
    expect(messages[0].content).toContain('casual');
    expect(messages[0].content).toContain('Nunca marque consulta diretamente.');
  });
});
