/**
 * Meta WhatsApp Business API Provider
 * https://developers.facebook.com/docs/whatsapp
 */

import logger from '../../lib/logger';
import {
  IWhatsAppProvider,
  WhatsAppResponse,
  WhatsAppStatus,
} from './whatsapp.interface';

export class MetaProvider implements IWhatsAppProvider {
  public readonly name = 'meta';
  private accessToken: string;
  private phoneNumberId: string;
  private apiVersion: string;
  private baseUrl: string = 'https://graph.facebook.com';

  constructor(
    accessToken: string,
    phoneNumberId: string,
    apiVersion: string = 'v18.0'
  ) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.apiVersion = apiVersion;

    logger.info('Meta WhatsApp Business API provider initialized', {
      phoneNumberId: '***' + this.phoneNumberId.slice(-4),
      apiVersion: this.apiVersion,
    });
  }

  public isConfigured(): boolean {
    return !!(this.accessToken && this.phoneNumberId);
  }

  public getStatus(): WhatsAppStatus {
    return {
      configured: this.isConfigured(),
      provider: this.name,
      phoneNumber: this.phoneNumberId ? '***' + this.phoneNumberId.slice(-4) : null,
    };
  }

  public async sendTextMessage(to: string, message: string): Promise<WhatsAppResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhoneNumber(to),
      type: 'text',
      text: {
        body: message,
      },
    };

    logger.info('Sending message via Meta WhatsApp Business API', {
      to: this.maskPhoneNumber(to),
      messageLength: message.length,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Meta API error', {
          status: response.status,
          error: errorData,
        });
        throw new Error(`Meta API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();

      logger.info('Message sent successfully via Meta API', {
        messageId: data.messages[0]?.id,
        to: this.maskPhoneNumber(to),
      });

      return {
        success: true,
        messageId: data.messages[0]?.id || `meta_${Date.now()}`,
        provider: this.name,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Failed to send message via Meta API', {
        error: error.message,
        to: this.maskPhoneNumber(to),
      });
      throw error;
    }
  }

  public async sendTemplateMessage(
    to: string,
    templateName: string,
    variables: Record<string, string>
  ): Promise<WhatsAppResponse> {
    const url = `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`;

    // Build template components
    const components = Object.keys(variables).length > 0 ? [
      {
        type: 'body',
        parameters: Object.values(variables).map(value => ({
          type: 'text',
          text: value,
        })),
      },
    ] : [];

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhoneNumber(to),
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'pt_BR',
        },
        ...(components.length > 0 && { components }),
      },
    };

    logger.info('Sending template message via Meta API', {
      to: this.maskPhoneNumber(to),
      template: templateName,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Meta API template error', {
          status: response.status,
          error: errorData,
        });
        throw new Error(`Meta API error: ${response.status}`);
      }

      const data = await response.json();

      logger.info('Template message sent successfully via Meta API', {
        messageId: data.messages[0]?.id,
        to: this.maskPhoneNumber(to),
      });

      return {
        success: true,
        messageId: data.messages[0]?.id || `meta_${Date.now()}`,
        provider: this.name,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Failed to send template message via Meta API', {
        error: error.message,
        to: this.maskPhoneNumber(to),
        template: templateName,
      });
      throw error;
    }
  }

  private normalizePhoneNumber(phone: string): string {
    let normalized = phone.replace(/\D/g, '');

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
