/**
 * WhatsApp Provider Factory
 * Selects the appropriate provider based on environment configuration
 */

import logger from '../../lib/logger';
import { IWhatsAppProvider } from './whatsapp.interface';
import { MetaProvider } from './meta.provider';
import { EvolutionProvider } from './evolution.provider';
import { ZAPIProvider } from './zapi.provider';

export class WhatsAppProviderFactory {
  /**
   * Create a WhatsApp provider instance based on environment variables
   */
  public static createProvider(): IWhatsAppProvider | null {
    const provider = process.env.WHATSAPP_PROVIDER?.toLowerCase() || 'evolution';

    logger.info(`Initializing WhatsApp provider: ${provider}`);

    switch (provider) {
      case 'meta':
        return this.createMetaProvider();

      case 'evolution':
        return this.createEvolutionProvider();

      case 'zapi':
        return this.createZAPIProvider();

      default:
        logger.warn(`Unknown WhatsApp provider: ${provider}. Available: meta, evolution, zapi`);
        return null;
    }
  }

  /**
   * Create Meta WhatsApp Business API provider
   */
  private static createMetaProvider(): IWhatsAppProvider | null {
    const accessToken = process.env.WHATSAPP_META_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_META_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_META_API_VERSION || 'v18.0';

    if (!accessToken || !phoneNumberId) {
      logger.warn('Meta provider configuration missing. Required: WHATSAPP_META_ACCESS_TOKEN, WHATSAPP_META_PHONE_NUMBER_ID');
      return null;
    }

    return new MetaProvider(accessToken, phoneNumberId, apiVersion);
  }

  /**
   * Create Evolution API provider
   */
  private static createEvolutionProvider(): IWhatsAppProvider | null {
    const baseUrl = process.env.WHATSAPP_EVOLUTION_BASE_URL;
    const instanceName = process.env.WHATSAPP_EVOLUTION_INSTANCE_NAME;
    const apiKey = process.env.WHATSAPP_EVOLUTION_API_KEY;

    if (!baseUrl || !instanceName || !apiKey) {
      logger.warn('Evolution API configuration missing. Required: WHATSAPP_EVOLUTION_BASE_URL, WHATSAPP_EVOLUTION_INSTANCE_NAME, WHATSAPP_EVOLUTION_API_KEY');
      return null;
    }

    return new EvolutionProvider(baseUrl, instanceName, apiKey);
  }

  /**
   * Create Z-API provider
   */
  private static createZAPIProvider(): IWhatsAppProvider | null {
    const instanceId = process.env.WHATSAPP_ZAPI_INSTANCE_ID;
    const token = process.env.WHATSAPP_ZAPI_TOKEN;

    if (!instanceId || !token) {
      logger.warn('Z-API configuration missing. Required: WHATSAPP_ZAPI_INSTANCE_ID, WHATSAPP_ZAPI_TOKEN');
      return null;
    }

    return new ZAPIProvider(instanceId, token);
  }
}
