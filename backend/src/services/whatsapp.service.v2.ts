/**
 * WhatsApp Service V2
 * Multi-provider support: Meta, Evolution API, Z-API
 */

import logger from '../lib/logger';
import { WhatsAppProviderFactory } from './whatsapp/provider.factory';
import { IWhatsAppProvider, WhatsAppResponse, WhatsAppStatus } from './whatsapp/whatsapp.interface';

class WhatsAppService {
  private provider: IWhatsAppProvider | null = null;

  constructor() {
    this.initializeProvider();
  }

  /**
   * Initialize WhatsApp provider based on environment
   */
  private initializeProvider() {
    this.provider = WhatsAppProviderFactory.createProvider();

    if (this.provider) {
      logger.info(`WhatsApp Service initialized with provider: ${this.provider.name}`);
    } else {
      logger.warn('WhatsApp Service not configured - no valid provider found');
    }
  }

  /**
   * Check if service is configured
   */
  public isConfigured(): boolean {
    return this.provider !== null && this.provider.isConfigured();
  }

  /**
   * Get service status
   */
  public getStatus(): WhatsAppStatus {
    if (!this.provider) {
      return {
        configured: false,
        provider: 'none',
      };
    }

    return this.provider.getStatus();
  }

  /**
   * Send a text message
   */
  public async sendTextMessage(to: string, message: string): Promise<WhatsAppResponse> {
    if (!this.provider) {
      throw new Error('WhatsApp service not configured');
    }

    return this.provider.sendTextMessage(to, message);
  }

  /**
   * Send message with template variables replacement
   */
  public async sendOpportunityMessage(
    phone: string,
    name: string,
    keyword: string,
    customTemplate?: string
  ): Promise<WhatsAppResponse> {
    const defaultTemplate = `Olá {name}, somos da Allo Oral Clinic. Verificamos seu histórico sobre "{keyword}" e gostaríamos de saber como está a saúde do seu sorriso. Podemos agendar uma avaliação?`;

    const template = customTemplate || defaultTemplate;

    return this.sendTemplateMessage(phone, template, { name, keyword });
  }

  /**
   * Send template message with variables
   */
  public async sendTemplateMessage(
    to: string,
    template: string,
    variables: Record<string, string>
  ): Promise<WhatsAppResponse> {
    if (!this.provider) {
      throw new Error('WhatsApp service not configured');
    }

    return this.provider.sendTemplateMessage(to, template, variables);
  }

  /**
   * Check if phone number is on WhatsApp
   */
  public async checkNumber(phone: string): Promise<boolean> {
    if (!this.provider || !this.provider.checkNumber) {
      return false;
    }

    return this.provider.checkNumber(phone);
  }

  /**
   * Get QR Code for connection (Evolution API / Z-API)
   */
  public async getQRCode(): Promise<string | null> {
    if (!this.provider || !this.provider.getQRCode) {
      return null;
    }

    return this.provider.getQRCode();
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();
export default whatsappService;
