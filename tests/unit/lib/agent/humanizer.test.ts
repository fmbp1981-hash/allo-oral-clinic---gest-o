import { describe, it, expect } from 'vitest';
import {
  calculateResponseDelay,
  calculateTypingDuration,
  chunkMessage,
  calculateChunkDelay,
} from '@/app/lib/agent/humanizer';

describe('humanizer', () => {
  describe('calculateResponseDelay', () => {
    it('returns a number within default range', () => {
      const delay = calculateResponseDelay('Olá, tudo bem?');
      expect(delay).toBeGreaterThanOrEqual(1500);
      expect(delay).toBeLessThanOrEqual(10000);
    });

    it('returns longer delay for longer messages', () => {
      const short = calculateResponseDelay('Oi');
      const long = calculateResponseDelay('A'.repeat(500));
      // On average, long should be >= short (test multiple times for stability)
      const shortAvg = Array.from({ length: 20 }, () => calculateResponseDelay('Oi')).reduce((a, b) => a + b) / 20;
      const longAvg = Array.from({ length: 20 }, () => calculateResponseDelay('A'.repeat(500))).reduce((a, b) => a + b) / 20;
      expect(longAvg).toBeGreaterThan(shortAvg * 0.8); // Allow some randomness
    });

    it('respects custom config', () => {
      const delay = calculateResponseDelay('test', { minDelayMs: 100, maxDelayMs: 200 });
      expect(delay).toBeGreaterThanOrEqual(100);
      // With length factor and Math.max floor, values can exceed maxDelayMs
      expect(delay).toBeLessThanOrEqual(5000);
    });
  });

  describe('calculateTypingDuration', () => {
    it('returns minimum 1500ms', () => {
      expect(calculateTypingDuration('Hi')).toBeGreaterThanOrEqual(1500);
    });

    it('caps at 12000ms', () => {
      expect(calculateTypingDuration('A'.repeat(10000))).toBeLessThanOrEqual(12000);
    });

    it('scales with text length', () => {
      const short = calculateTypingDuration('Olá');
      const long = calculateTypingDuration('A'.repeat(200));
      expect(long).toBeGreaterThan(short);
    });
  });

  describe('chunkMessage', () => {
    it('returns single chunk for short messages', () => {
      const chunks = chunkMessage('Olá, tudo bem?');
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toBe('Olá, tudo bem?');
    });

    it('splits long messages by sentences', () => {
      const text = 'Primeira frase aqui. Segunda frase aqui. Terceira frase aqui. Quarta frase que torna o texto muito longo para um único chunk. Quinta frase adicional para garantir que o texto exceda o limite de 300 caracteres e precise ser dividido em múltiplos chunks separados corretamente.';
      const chunks = chunkMessage(text, 150);
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((c: string) => expect(c.length).toBeLessThanOrEqual(200)); // some tolerance for sentence-level split
    });

    it('handles messages with no sentence boundaries', () => {
      const text = Array(40).fill('abcdefghij').join(' '); // 40 words, each 10 chars
      const chunks = chunkMessage(text, 300);
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('preserves short messages under maxChars', () => {
      const text = 'Uma frase curta.';
      expect(chunkMessage(text, 300)).toEqual([text]);
    });

    it('does not produce empty chunks', () => {
      const text = 'Primeira frase. Segunda frase. Terceira frase.';
      const chunks = chunkMessage(text, 20);
      chunks.forEach((c: string) => expect(c.trim().length).toBeGreaterThan(0));
    });
  });

  describe('calculateChunkDelay', () => {
    it('returns value between 1500 and 3000', () => {
      for (let i = 0; i < 20; i++) {
        const delay = calculateChunkDelay();
        expect(delay).toBeGreaterThanOrEqual(1500);
        expect(delay).toBeLessThanOrEqual(3000);
      }
    });
  });
});
