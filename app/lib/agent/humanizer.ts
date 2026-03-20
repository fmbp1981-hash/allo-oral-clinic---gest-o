/**
 * Humanizer — Delays, typing simulation, and message chunking
 * Makes the AI agent responses feel natural and human-like.
 */

// --- Delay Calculation ---

interface DelayConfig {
  minDelayMs: number;   // default: 3000
  maxDelayMs: number;   // default: 7000
}

const DEFAULT_DELAY_CONFIG: DelayConfig = {
  minDelayMs: 3000,
  maxDelayMs: 7000,
};

/**
 * Calculates a humanized delay before responding, adjusted by message length.
 */
export function calculateResponseDelay(responseText: string, config?: Partial<DelayConfig>): number {
  const { minDelayMs, maxDelayMs } = { ...DEFAULT_DELAY_CONFIG, ...config };

  // Longer responses → slightly longer "thinking" time
  const lengthFactor = Math.min(responseText.length / 500, 1.3);
  const adjustedMin = Math.max(1500, minDelayMs * lengthFactor);
  const adjustedMax = Math.max(adjustedMin + 1000, maxDelayMs * lengthFactor);

  return Math.floor(adjustedMin + Math.random() * (adjustedMax - adjustedMin));
}

// --- Typing Indicator ---

const CHARS_PER_SECOND = 4.5; // ~270 chars/min — realistic typing speed

/**
 * Calculates how long the typing indicator should show (in ms).
 */
export function calculateTypingDuration(text: string): number {
  const duration = (text.length / CHARS_PER_SECOND) * 1000;
  return Math.max(1500, Math.min(duration, 12000)); // 1.5s - 12s
}

// --- Message Chunking ---

/**
 * Splits a long message into natural chunks (by sentence), max 300 chars each.
 */
export function chunkMessage(text: string, maxChars: number = 300): string[] {
  if (text.length <= maxChars) return [text];

  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length <= maxChars) {
      current += (current ? ' ' : '') + sentence;
    } else {
      if (current) chunks.push(current.trim());
      // If a single sentence exceeds maxChars, split at word boundary
      if (sentence.length > maxChars) {
        const words = sentence.split(/\s+/);
        current = '';
        for (const word of words) {
          if (current.length + word.length + 1 <= maxChars) {
            current += (current ? ' ' : '') + word;
          } else {
            if (current) chunks.push(current.trim());
            // If a single word exceeds maxChars, hard-cut
            if (word.length > maxChars) {
              for (let i = 0; i < word.length; i += maxChars) {
                chunks.push(word.slice(i, i + maxChars));
              }
              current = '';
            } else {
              current = word;
            }
          }
        }
      } else {
        current = sentence;
      }
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

/**
 * Calculates delay between message chunks (1.5-3s).
 */
export function calculateChunkDelay(): number {
  return Math.floor(1500 + Math.random() * 1500);
}

// --- Orchestrator ---

export interface HumanizedSendOptions {
  sendTyping: (phone: string) => Promise<void>;
  sendMessage: (phone: string, text: string) => Promise<void>;
  markAsRead?: (phone: string, messageId: string) => Promise<void>;
}

/**
 * Sends a response with human-like behavior:
 * 1. Optional read receipt
 * 2. Initial "thinking" delay
 * 3. For each chunk: typing indicator → delay → send
 */
export async function sendHumanizedResponse(
  phone: string,
  responseText: string,
  incomingMessageId: string | undefined,
  options: HumanizedSendOptions,
): Promise<void> {
  const chunks = chunkMessage(responseText);

  // 1. Mark as read (if supported — Evolution API only)
  if (options.markAsRead && incomingMessageId) {
    await sleep(500 + Math.random() * 1500); // 0.5-2s before reading
    await options.markAsRead(phone, incomingMessageId).catch(() => {});
  }

  // 2. Initial "thinking" delay
  const thinkDelay = calculateResponseDelay(responseText);
  await sleep(thinkDelay);

  // 3. Send each chunk with typing simulation
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Send typing indicator (refresh every 4s for long typing)
    const typingDuration = calculateTypingDuration(chunk);
    let elapsed = 0;
    while (elapsed < typingDuration) {
      await options.sendTyping(phone).catch(() => {});
      const wait = Math.min(4000, typingDuration - elapsed);
      await sleep(wait);
      elapsed += wait;
    }

    // Send the chunk
    await options.sendMessage(phone, chunk);

    // Delay between chunks (not after the last one)
    if (i < chunks.length - 1) {
      await sleep(calculateChunkDelay());
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
