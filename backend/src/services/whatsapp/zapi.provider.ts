/**
 * Z-API Provider
 * https://z-api.io/
 */

import logger from '../../lib/logger';
import {
  IWhatsAppProvider,
  WhatsAppResponse,
  WhatsAppStatus,
} from './whatsapp.interface';

export class ZAPIProvider implements IWhatsAppProvider {
  public readonly name = 'zapi';
  private instanceId: string;
  private token: string;
  private baseUrl: string = 'https://api.z-api.io/instances';

  constructor(instanceId: string, token: string) {
    this.instanceId = instanceId;
    this.token = token;

    logger.info('Z-API provider initialized', {
      instance: this.instanceId,
    });
  }

  public isConfigured(): boolean {
    return !!(this.instanceId && this.token);
  }

  public getStatus(): WhatsAppStatus {
    return {
      configured: this.isConfigured(),
      provider: this.name,
      phoneNumber: null,
    };
  }

  public async sendTextMessage(to: string, message: string): Promise<WhatsAppResponse> {
    const url = `${this.baseUrl}/${this.instanceId}/token/${this.token}/send-text`;

    const payload = {
      phone: this.normalizePhoneNumber(to),
      message: message,
    };

    logger.info('Sending message via Z-API', {
      to: this.maskPhoneNumber(to),
      messageLength: message.length,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': this.token,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Z-API error', {
          status: response.status,
          error: errorData,
        });
        throw new Error(`Z-API error: ${response.status}`);
      }

      const data = await response.json();

      logger.info('Message sent successfully via Z-API', {
        messageId: data.messageId,
        to: this.maskPhoneNumber(to),
      });

      return {
        success: true,
        messageId: data.messageId || `zapi_${Date.now()}`,
        provider: this.name,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error('Failed to send message via Z-API', {
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

    // Z-API doesn't have native template support
    // So we send as text message
    return this.sendTextMessage(to, message);
  }

  /**
   * Check if phone number is on WhatsApp
   */
  public async checkNumber(phone: string): Promise<boolean> {
    const url = `${this.baseUrl}/${this.instanceId}/token/${this.token}/phone-exists`;

    const payload = {
      phone: this.normalizePhoneNumber(phone),
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': this.token,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.exists === true;
    } catch (error) {
      logger.error('Failed to check number', { phone: this.maskPhoneNumber(phone) });
      return false;
    }
  }

  /**
   * Get QR Code for Z-API
   */
  public async getQRCode(): Promise<string> {
    const url = `${this.baseUrl}/${this.instanceId}/token/${this.token}/qr-code/image`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Client-Token': this.token,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get QR Code: ${response.status}`);
      }

      const data = await response.json();

      logger.info('QR Code retrieved successfully');

      return data.value || data.qrcode;
    } catch (error: any) {
      logger.error('Failed to get QR Code', { error: error.message });
      throw error;
    }
  }

  private normalizePhoneNumber(phone: string): string {
    let normalized = phone.replace(/\D/g, '');

    // Z-API expects format: 5511999999999
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
