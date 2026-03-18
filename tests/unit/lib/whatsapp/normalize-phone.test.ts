import { describe, it, expect } from 'vitest';
import { normalizePhone } from '@/app/lib/whatsapp/normalize-phone';

describe('normalizePhone', () => {
  it('strips @s.whatsapp.net suffix', () => {
    expect(normalizePhone('5511987654321@s.whatsapp.net')).toBe('5511987654321');
  });

  it('adds +55 prefix to 11-digit bare number', () => {
    expect(normalizePhone('11987654321')).toBe('5511987654321');
  });

  it('adds +55 prefix to 10-digit bare number (no 9th digit)', () => {
    expect(normalizePhone('1187654321')).toBe('551187654321');
  });

  it('keeps 13-digit number starting with 55 unchanged', () => {
    expect(normalizePhone('5511987654321')).toBe('5511987654321');
  });

  it('12-digit number starting with 55 is a landline — no 9 added', () => {
    expect(normalizePhone('551187654321')).toBe('551187654321');
  });

  it('strips non-digit characters before processing', () => {
    expect(normalizePhone('+55 (11) 98765-4321')).toBe('5511987654321');
  });

  it('returns empty string for invalid short input', () => {
    expect(normalizePhone('1234')).toBe('');
  });

  it('strips @s.whatsapp.net before normalizing 11-digit number', () => {
    expect(normalizePhone('11987654321@s.whatsapp.net')).toBe('5511987654321');
  });
});
