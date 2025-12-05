/**
 * Evolution API Provider
 * https://evolution-api.com/
 */

import logger from '../../lib/logger';
import {
  IWhatsAppProvider,
  WhatsAppResponse,
  WhatsAppStatus,
} from './whatsapp.interface';

export class EvolutionProvider implements IWhatsAppProvider {
  public readonly name = 'evolution';
  private baseUrl: string;
  private instanceName: string;
  private apiKey: string;

  constructor(baseUrl: string, instanceName: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.instanceName = instanceName;
    this.apiKey = apiKey;

    logger.info('Evolution API provider initialized', {
      baseUrl: this.baseUrl,
      instance: this.instanceName,
    });
  }

  public isConfigured(): boolean {
    return !!(this.baseUrl && this.instanceName && this.apiKey);
  }

  public getStatus(): WhatsAppStatus {
    return {
      configured: this.isConfigured(),
      provider: this.name,
      phoneNumber: undefined,
    };
  }

  public async sendTextMessage(to: string, message: string): Promise<WhatsAppResponse> {
    const url = `${this.baseUrl}/message/sendText/${this.instanceName}`;

    const payload = {
      number: this.normalizePhoneNumber(to),
      text: message,
    };

    logger.info('Sending message via Evolution API', {
      to: this.maskPhoneNumber(to),
      messageLength: message.length,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Evolution API error', {
          status: response.status,
          error: errorData,
        });
        throw new Error(`Evolution API error: ${response.status}`);
      }

      const data = await response.json();

      logger.info('Message sent successfully via Evolution API', {
        messageId: data.key?.id,
        to: this.maskPhoneNumber(to),
      });

      return {
        success: true,
        messageId: data.key?.id || `evo_${Date.now()}`,
        provider: this.name,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Failed to send message via Evolution API', {
        error: error.message,
        to: this.maskPhoneNumber(to),
      });
      throw error;
    }
  }

  public async sendTemplateMessage(
    to: string,
    template: string,
    variables: Record<string, string>
  ): Promise<WhatsAppResponse> {
    // Replace template variables
    let message = template;
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    // Evolution API doesn't have native template support
    // So we send as text message
    return this.sendTextMessage(to, message);
  }

  /**
   * Get QR Code for connecting instance
   */
  public async getQRCode(): Promise<string> {
    const url = `${this.baseUrl}/instance/connect/${this.instanceName}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get QR Code: ${response.status}`);
      }

      const data = await response.json();

      logger.info('QR Code retrieved successfully');

      return data.qrcode?.base64 || data.code;
    } catch (error: any) {
      logger.error('Failed to get QR Code', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if phone number is on WhatsApp
   */
  public async checkNumber(phone: string): Promise<boolean> {
    const url = `${this.baseUrl}/chat/whatsappNumbers/${this.instanceName}`;

    const payload = {
      numbers: [this.normalizePhoneNumber(phone)],
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.length > 0 && data[0].exists;
    } catch (error) {
      logger.error('Failed to check number', { phone: this.maskPhoneNumber(phone) });
      return false;
    }
  }

  private normalizePhoneNumber(phone: string): string {
    let normalized = phone.replace(/\D/g, '');

    // Evolution API expects format: 5511999999999@s.whatsapp.net
    // But we can send just the number
    if (!normalized.startsWith('55') && normalized.length === 11) {
      normalized = '55' + normalized;
    }

    return normalized;
  }

  private maskPhoneNumber(phone: string): string {
    const normalized = this.normalizePhoneNumber(phone);
    if (normalized.length > 4) {
      return normalized.slice(0, 4) + '****' + normalized.slice(-2);
    }
    return '****';
  }
}
