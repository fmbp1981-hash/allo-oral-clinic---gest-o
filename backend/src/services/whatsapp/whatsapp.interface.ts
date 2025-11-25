/**
 * WhatsApp Provider Interface
 * Common interface for all WhatsApp API providers
 * Supports: Meta Business API, Evolution API, Z-API
 */

export interface WhatsAppMessage {
  to: string; // Phone number
  message: string; // Text message
}

export interface WhatsAppResponse {
  success: boolean;
  messageId: string;
  provider: string;
  timestamp: string;
}

export interface WhatsAppStatus {
  configured: boolean;
  provider: string;
  connected?: boolean;
  phoneNumber?: string;
}

/**
 * Common interface that all WhatsApp providers must implement
 */
export interface IWhatsAppProvider {
  /**
   * Provider name (meta, evolution, zapi)
   */
  readonly name: string;

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean;

  /**
   * Get provider status
   */
  getStatus(): WhatsAppStatus;

  /**
   * Send a text message
   */
  sendTextMessage(to: string, message: string): Promise<WhatsAppResponse>;

  /**
   * Send message with template variables
   */
  sendTemplateMessage(
    to: string,
    template: string,
    variables: Record<string, string>
  ): Promise<WhatsAppResponse>;

  /**
   * Check if phone number is on WhatsApp
   */
  checkNumber?(phone: string): Promise<boolean>;

  /**
   * Get QR Code for connection (Evolution API only)
   */
  getQRCode?(): Promise<string>;
}

/**
 * Configuration for different providers
 */
export interface WhatsAppConfig {
  provider: 'meta' | 'evolution' | 'zapi';

  // Meta Business API
  meta?: {
    accessToken: string;
    phoneNumberId: string;
    businessAccountId?: string;
    apiVersion?: string;
  };

  // Evolution API
  evolution?: {
    baseUrl: string;
    instanceName: string;
    apiKey: string;
  };

  // Z-API
  zapi?: {
    instanceId: string;
    token: string;
  };
}
