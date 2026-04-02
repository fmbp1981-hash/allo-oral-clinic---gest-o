import { describe, it, expect, vi } from 'vitest';

// Mock OpenAI
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: vi.fn() } };
  },
}));

import {
  buildSystemPrompt,
  parseBookingTag,
  parseRescheduleTag,
} from '@/app/lib/openai/agent-response';

const baseInput = {
  agentName: 'Sofia',
  clinicName: 'Allo Oral Clinic',
  specialties: ['Implante', 'Ortodontia'],
  tone: 'friendly',
  customInstructions: '',
  history: [] as { role: 'patient' | 'agent'; content: string }[],
  patientMessage: 'Quero agendar uma consulta',
};

describe('Scheduling - buildSystemPrompt', () => {
  it('includes dental specialist instructions', () => {
    const prompt = buildSystemPrompt(baseInput);
    expect(prompt).toContain('BOOKING_REQUEST');
    expect(prompt).toContain('RESCHEDULE_REQUEST');
  });

  it('includes available slots when provided', () => {
    const prompt = buildSystemPrompt({
      ...baseInput,
      availableSlots: '2025-01-15: 09:00-10:00, 14:00-15:00',
    });
    expect(prompt).toContain('2025-01-15');
    expect(prompt).toContain('09:00-10:00');
  });

  it('includes dentist list when provided', () => {
    const prompt = buildSystemPrompt({
      ...baseInput,
      dentistList: 'Dr. Maria (Ortodontia) [id:abc123]; Dr. João (Implante) [id:def456]',
    });
    expect(prompt).toContain('Dr. Maria');
    expect(prompt).toContain('Dr. João');
    expect(prompt).toContain('abc123');
  });

  it('includes patient upcoming appointments when provided', () => {
    const prompt = buildSystemPrompt({
      ...baseInput,
      patientUpcomingAppointments: '15/01/2025 09:00 - Limpeza com Dr. Maria (scheduled)',
    });
    expect(prompt).toContain('15/01/2025');
    expect(prompt).toContain('Limpeza');
  });

  it('includes business hours when provided', () => {
    const prompt = buildSystemPrompt({
      ...baseInput,
      businessHours: '2025-01-15 (Qua) - Dr. Maria: 08:00:00-18:00:00 (almoço 12:00:00-13:00:00), slots de 30min',
    });
    expect(prompt).toContain('08:00:00-18:00:00');
    expect(prompt).toContain('almoço');
  });
});

describe('parseBookingTag', () => {
  it('parses a valid booking tag', () => {
    const text = 'Vou agendar sua consulta! [BOOKING_REQUEST]{"dentist_id":"abc","start_time":"2025-01-15T09:00:00","end_time":"2025-01-15T09:30:00","procedure":"Limpeza"}[/BOOKING_REQUEST] Até logo!';
    const result = parseBookingTag(text);
    expect(result.booking).not.toBeNull();
    expect(result.booking!.dentist_id).toBe('abc');
    expect(result.booking!.start_time).toBe('2025-01-15T09:00:00');
    expect(result.booking!.end_time).toBe('2025-01-15T09:30:00');
    expect(result.booking!.procedure).toBe('Limpeza');
    expect(result.cleanText).not.toContain('BOOKING_REQUEST');
    expect(result.cleanText).toContain('Vou agendar');
    expect(result.cleanText).toContain('Até logo!');
  });

  it('returns null booking for text without tag', () => {
    const result = parseBookingTag('Olá, como posso ajudar?');
    expect(result.booking).toBeNull();
    expect(result.cleanText).toBe('Olá, como posso ajudar?');
  });

  it('returns null for invalid JSON in tag', () => {
    const text = 'Test [BOOKING_REQUEST]invalid json[/BOOKING_REQUEST] end';
    const result = parseBookingTag(text);
    expect(result.booking).toBeNull();
  });

  it('returns null for booking without required fields', () => {
    const text = '[BOOKING_REQUEST]{"procedure":"Limpeza"}[/BOOKING_REQUEST]';
    const result = parseBookingTag(text);
    expect(result.booking).toBeNull();
  });
});

describe('parseRescheduleTag', () => {
  it('parses a valid reschedule tag', () => {
    const text = 'Vou remarcar! [RESCHEDULE_REQUEST]{"appointment_id":"appt-1","new_start_time":"2025-01-16T10:00:00","new_end_time":"2025-01-16T10:30:00"}[/RESCHEDULE_REQUEST] Pronto!';
    const result = parseRescheduleTag(text);
    expect(result.reschedule).not.toBeNull();
    expect(result.reschedule!.appointment_id).toBe('appt-1');
    expect(result.reschedule!.new_start_time).toBe('2025-01-16T10:00:00');
    expect(result.reschedule!.new_end_time).toBe('2025-01-16T10:30:00');
    expect(result.cleanText).not.toContain('RESCHEDULE_REQUEST');
  });

  it('returns null reschedule for text without tag', () => {
    const result = parseRescheduleTag('Sem remarcação aqui');
    expect(result.reschedule).toBeNull();
  });

  it('returns null for reschedule without required fields', () => {
    const text = '[RESCHEDULE_REQUEST]{"appointment_id":"x"}[/RESCHEDULE_REQUEST]';
    const result = parseRescheduleTag(text);
    expect(result.reschedule).toBeNull();
  });
});
