import { NextRequest, NextResponse } from 'next/server';
import { processIncomingMessage } from '@/app/lib/agent/process-incoming';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? '';

/**
 * GET /api/webhook/whatsapp/meta
 * Meta webhook verification challenge.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * POST /api/webhook/whatsapp/meta
 * Receives WhatsApp Business Cloud webhook events.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = body as {
    object?: string;
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            id?: string;
            from?: string;
            type?: string;
            text?: { body?: string };
          }>;
        };
      }>;
    }>;
  };

  if (payload.object !== 'whatsapp_business_account') {
    return NextResponse.json({ ignored: true });
  }

  const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages ?? [];

  for (const msg of messages) {
    if (msg.type !== 'text') continue;
    const text = msg.text?.body ?? '';
    if (!text.trim()) continue;

    await processIncomingMessage({
      phone: msg.from ?? '',
      text,
      messageId: msg.id,
    });
  }

  // Meta requires 200 OK quickly
  return NextResponse.json({ received: true });
}
