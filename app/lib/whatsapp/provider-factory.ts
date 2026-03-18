import { normalizePhone } from './normalize-phone';

export type WhatsAppProvider = 'evolution' | 'meta';

export interface WhatsAppSettings {
  provider: WhatsAppProvider;
  // Evolution API
  evolution_api_url?: string;
  evolution_api_key?: string;
  evolution_instance_name?: string;
  // Meta (WhatsApp Business Cloud)
  meta_phone_number_id?: string;
  meta_access_token?: string;
}

export interface IProviderClient {
  readonly name: WhatsAppProvider;
  sendText(phone: string, text: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendTyping?(phone: string): Promise<void>;
}

class EvolutionClient implements IProviderClient {
  readonly name: WhatsAppProvider = 'evolution';

  constructor(
    private readonly apiUrl: string,
    private readonly apiKey: string,
    private readonly instanceName: string
  ) {}

  async sendText(rawPhone: string, text: string) {
    const phone = normalizePhone(rawPhone);
    if (!phone) return { success: false, error: 'Número de telefone inválido' };

    const response = await fetch(
      `${this.apiUrl}/message/sendText/${this.instanceName}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: this.apiKey },
        body: JSON.stringify({ number: phone, text }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { message?: string };
      return { success: false, error: err.message ?? `HTTP ${response.status}` };
    }

    const data = await response.json() as { key?: { id?: string } };
    return { success: true, messageId: data.key?.id };
  }

  async sendTyping(rawPhone: string) {
    const phone = normalizePhone(rawPhone);
    if (!phone) return;

    await fetch(
      `${this.apiUrl}/chat/sendPresence/${this.instanceName}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: this.apiKey },
        body: JSON.stringify({ number: phone, presence: 'composing', delay: 3000 }),
      }
    ).catch(() => undefined); // best-effort
  }
}

class MetaClient implements IProviderClient {
  readonly name: WhatsAppProvider = 'meta';

  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string
  ) {}

  async sendText(rawPhone: string, text: string) {
    const phone = normalizePhone(rawPhone);
    if (!phone) return { success: false, error: 'Número de telefone inválido' };

    const response = await fetch(
      `https://graph.facebook.com/v20.0/${this.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: text },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
      return { success: false, error: err.error?.message ?? `HTTP ${response.status}` };
    }

    const data = await response.json() as { messages?: Array<{ id?: string }> };
    return { success: true, messageId: data.messages?.[0]?.id };
  }
}

export function createProvider(settings: WhatsAppSettings): IProviderClient {
  if (settings.provider === 'meta') {
    if (!settings.meta_phone_number_id || !settings.meta_access_token) {
      throw new Error('Meta WhatsApp: meta_phone_number_id e meta_access_token são obrigatórios');
    }
    return new MetaClient(settings.meta_phone_number_id, settings.meta_access_token);
  }

  // Default: evolution
  if (!settings.evolution_api_url || !settings.evolution_api_key || !settings.evolution_instance_name) {
    throw new Error('Evolution API: evolution_api_url, evolution_api_key e evolution_instance_name são obrigatórios');
  }
  return new EvolutionClient(
    settings.evolution_api_url,
    settings.evolution_api_key,
    settings.evolution_instance_name
  );
}
