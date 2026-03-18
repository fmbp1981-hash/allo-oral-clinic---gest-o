import { IProviderClient } from './provider-factory';

const TYPING_DELAY_MS = 3000;
const HUMANIZE_MIN_MS = 3000;
const HUMANIZE_MAX_MS = 7000;

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends a text message with optional humanization (typing indicator + random delay).
 * Typing indicator is best-effort (Evolution only); Meta ignores it silently.
 */
export async function sendTextMessage(
  client: IProviderClient,
  phone: string,
  text: string,
  options: { humanize?: boolean } = {}
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (options.humanize) {
    // Fire typing indicator (best-effort, won't fail if unsupported)
    if (client.sendTyping) {
      await client.sendTyping(phone).catch(() => undefined);
    }
    await randomDelay(HUMANIZE_MIN_MS, HUMANIZE_MAX_MS);
  }

  return client.sendText(phone, text);
}

export { TYPING_DELAY_MS };
