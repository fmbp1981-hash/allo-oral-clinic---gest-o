/**
 * WhatsApp Business API Service
 * Direct integration with WhatsApp Business API (Meta/Facebook)
 * No n8n required - fully independent
 */

import logger from '../lib/logger';

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  apiVersion?: string;
}

export interface WhatsAppMessage {
  to: string; // Phone number in international format (e.g., "5511999999999")
  type: 'text' | 'template';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: any[];
  };
}

export interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

class WhatsAppService {
  private config: WhatsAppConfig | null = null;
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://graph.facebook.com';
    this.loadConfig();
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfig() {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';

    if (accessToken && phoneNumberId) {
      this.config = {
        accessToken,
        phoneNumberId,
        businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
        apiVersion,
      };
      logger.info('WhatsApp Service configured successfully');
    } else {
      logger.warn('WhatsApp Service not configured - missing environment variables');
    }
  }

  /**
   * Check if WhatsApp service is configured
   */
  public isConfigured(): boolean {
    return this.config !== null;
  }

  /**
   * Get configuration status
   */
  public getStatus() {
    return {
      configured: this.isConfigured(),
      phoneNumberId: this.config?.phoneNumberId ? '***' + this.config.phoneNumberId.slice(-4) : null,
      apiVersion: this.config?.apiVersion || null,
    };
  }

  /**
   * Send a text message via WhatsApp Business API
   */
  public async sendTextMessage(to: string, message: string): Promise<WhatsAppResponse> {
    if (!this.config) {
      throw new Error('WhatsApp Service not configured');
    }

    const url = `${this.baseUrl}/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`;

    const payload: WhatsAppMessage = {
      to: this.normalizePhoneNumber(to),
      type: 'text',
      text: {
        body: message,
      },
    };

    logger.info('Sending WhatsApp message', {
      to: this.maskPhoneNumber(to),
      messageLength: message.length,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('WhatsApp API error', {
          status: response.status,
          error: errorData,
        });
        throw new Error(`WhatsApp API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data: WhatsAppResponse = await response.json();

      logger.info('WhatsApp message sent successfully', {
        messageId: data.messages[0]?.id,
        to: this.maskPhoneNumber(to),
      });

      return data;
    } catch (error: any) {
      logger.error('Failed to send WhatsApp message', {
        error: error.message,
        to: this.maskPhoneNumber(to),
      });
      throw error;
    }
  }

  /**
   * Send a template message (pre-approved templates)
   */
  public async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'pt_BR',
    components?: any[]
  ): Promise<WhatsAppResponse> {
    if (!this.config) {
      throw new Error('WhatsApp Service not configured');
    }

    const url = `${this.baseUrl}/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`;

    const payload: WhatsAppMessage = {
      to: this.normalizePhoneNumber(to),
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        ...(components && { components }),
      },
    };

    logger.info('Sending WhatsApp template message', {
      to: this.maskPhoneNumber(to),
      template: templateName,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('WhatsApp API error', {
          status: response.status,
          error: errorData,
        });
        throw new Error(`WhatsApp API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data: WhatsAppResponse = await response.json();

      logger.info('WhatsApp template message sent successfully', {
        messageId: data.messages[0]?.id,
        to: this.maskPhoneNumber(to),
      });

      return data;
    } catch (error: any) {
      logger.error('Failed to send WhatsApp template message', {
        error: error.message,
        to: this.maskPhoneNumber(to),
        template: templateName,
      });
      throw error;
    }
  }

  /**
   * Send message to opportunity with template variables replacement
   */
  public async sendOpportunityMessage(
    phone: string,
    name: string,
    keyword: string,
    customTemplate?: string
  ): Promise<WhatsAppResponse> {
    const defaultTemplate = `Olá ${name}, somos da Allo Oral Clinic. Verificamos seu histórico sobre "${keyword}" e gostaríamos de saber como está a saúde do seu sorriso. Podemos agendar uma avaliação?`;

    let message = customTemplate || defaultTemplate;
    message = message.replace(/{name}/g, name);
    message = message.replace(/{keyword}/g, keyword);

    return this.sendTextMessage(phone, message);
  }

  /**
   * Normalize phone number to international format
   * Removes spaces, dashes, parentheses, and ensures it starts with country code
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let normalized = phone.replace(/\D/g, '');

    // If doesn't start with country code, assume Brazil (55)
    if (!normalized.startsWith('55') && normalized.length === 11) {
      normalized = '55' + normalized;
    }

    return normalized;
  }

  /**
   * Mask phone number for logging (privacy)
   */
  private maskPhoneNumber(phone: string): string {
    const normalized = this.normalizePhoneNumber(phone);
    if (normalized.length > 4) {
      return normalized.slice(0, 4) + '****' + normalized.slice(-2);
    }
    return '****';
  }

  /**
   * Verify webhook signature (for receiving messages)
   */
  public verifyWebhookSignature(signature: string, body: string): boolean {
    if (!this.config) {
      return false;
    }

    // Implement HMAC signature verification if needed
    // This is used when receiving webhooks from WhatsApp
    logger.debug('Verifying webhook signature');
    return true;
  }

  /**
   * Get media URL (for receiving images, videos, documents)
   */
  public async getMediaUrl(mediaId: string): Promise<string> {
    if (!this.config) {
      throw new Error('WhatsApp Service not configured');
    }

    const url = `${this.baseUrl}/${this.config.apiVersion}/${mediaId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get media URL: ${response.status}`);
    }

    const data = await response.json();
    return data.url;
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();
export default whatsappService;
