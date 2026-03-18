import { NextRequest, NextResponse } from 'next/server';
import { processIncomingMessage } from '@/app/lib/agent/process-incoming';

/**
 * POST /api/webhook/whatsapp/evolution
 * Receives Evolution API webhook events.
 * Configure in Evolution dashboard: Event = MESSAGES_UPSERT
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = body as {
    event?: string;
    data?: {
      key?: { fromMe?: boolean; remoteJid?: string; id?: string };
      message?: { conversation?: string; extendedTextMessage?: { text?: string } };
    };
  };

  // Only handle MESSAGES_UPSERT for inbound messages
  if (event.event !== 'MESSAGES_UPSERT') {
    return NextResponse.json({ ignored: true });
  }

  const key = event.data?.key;
  const message = event.data?.message;

  // Ignore messages sent by us or from groups
  if (key?.fromMe) return NextResponse.json({ ignored: true });
  const remoteJid = key?.remoteJid ?? '';
  if (remoteJid.endsWith('@g.us')) return NextResponse.json({ ignored: true });

  const text =
    message?.conversation ??
    message?.extendedTextMessage?.text ??
    '';

  if (!text.trim()) return NextResponse.json({ ignored: true });

  const result = await processIncomingMessage({
    phone: remoteJid,
    text,
    messageId: key?.id,
  });

  return NextResponse.json({ result });
}
