/**
 * Multi-Provider WhatsApp Service
 * Supports: Evolution API, WhatsApp Business Cloud (Meta), Z-API
 */

import { Opportunity } from '../types';

export type WhatsAppProvider = 'evolution' | 'business-cloud' | 'z-api' | 'whatsapp-web';

export interface WhatsAppConfig {
    provider: WhatsAppProvider;

    // Evolution API
    evolutionApiUrl?: string;
    evolutionInstanceName?: string;
    evolutionApiKey?: string;

    // WhatsApp Business Cloud (Meta)
    businessCloudPhoneNumberId?: string;
    businessCloudAccessToken?: string;

    // Z-API
    zApiUrl?: string;
    zApiInstanceId?: string;
    zApiToken?: string;
}

// Get WhatsApp configuration from environment or localStorage
const getWhatsAppConfig = (): WhatsAppConfig => {
    // Try to get from localStorage (set by SettingsModal)
    const stored = localStorage.getItem('whatsapp_config');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.warn('[WhatsApp] Failed to parse stored config');
        }
    }

    // Fallback to environment variables
    return {
        provider: (import.meta.env.VITE_WHATSAPP_PROVIDER as WhatsAppProvider) || 'evolution',
        evolutionApiUrl: import.meta.env.VITE_WHATSAPP_EVOLUTION_BASE_URL || 'http://localhost:8080',
        evolutionInstanceName: import.meta.env.VITE_WHATSAPP_EVOLUTION_INSTANCE_NAME || 'clinicaflow',
        evolutionApiKey: import.meta.env.VITE_WHATSAPP_EVOLUTION_API_KEY || '',
        businessCloudPhoneNumberId: import.meta.env.VITE_WHATSAPP_BUSINESS_PHONE_ID || '',
        businessCloudAccessToken: import.meta.env.VITE_WHATSAPP_BUSINESS_TOKEN || '',
        zApiUrl: import.meta.env.VITE_WHATSAPP_ZAPI_URL || '',
        zApiInstanceId: import.meta.env.VITE_WHATSAPP_ZAPI_INSTANCE || '',
        zApiToken: import.meta.env.VITE_WHATSAPP_ZAPI_TOKEN || '',
    };
};

/**
 * Save WhatsApp configuration to localStorage
 */
export const saveWhatsAppConfig = (config: WhatsAppConfig): void => {
    localStorage.setItem('whatsapp_config', JSON.stringify(config));
};

/**
 * Clean phone number (remove non-numeric characters)
 */
const cleanPhone = (phone: string): string => {
    let clean = phone.replace(/\D/g, '');

    // Ensure it starts with country code (55 for Brazil)
    if (!clean.startsWith('55') && clean.length === 11) {
        clean = '55' + clean;
    }

    return clean;
};

/**
 * Send message via Evolution API
 */
const sendViaEvolution = async (
    phone: string,
    message: string,
    config: WhatsAppConfig
): Promise<boolean> => {
    if (!config.evolutionApiUrl || !config.evolutionApiKey) {
        throw new Error('Evolution API not configured');
    }

    console.log('[WhatsApp] Sending via Evolution API...');

    const response = await fetch(
        `${config.evolutionApiUrl}/message/sendText/${config.evolutionInstanceName}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.evolutionApiKey
            },
            body: JSON.stringify({
                number: phone,
                textMessage: {
                    text: message
                }
            })
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Evolution API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    console.log('[WhatsApp] Message sent via Evolution API');
    return true;
};

/**
 * Send message via WhatsApp Business Cloud (Meta)
 */
const sendViaBusinessCloud = async (
    phone: string,
    message: string,
    config: WhatsAppConfig
): Promise<boolean> => {
    if (!config.businessCloudPhoneNumberId || !config.businessCloudAccessToken) {
        throw new Error('WhatsApp Business Cloud not configured');
    }

    console.log('[WhatsApp] Sending via Business Cloud...');

    const response = await fetch(
        `https://graph.facebook.com/v18.0/${config.businessCloudPhoneNumberId}/messages`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.businessCloudAccessToken}`
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: phone,
                type: 'text',
                text: {
                    body: message
                }
            })
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Business Cloud error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    console.log('[WhatsApp] Message sent via Business Cloud');
    return true;
};

/**
 * Send message via Z-API
 */
const sendViaZApi = async (
    phone: string,
    message: string,
    config: WhatsAppConfig
): Promise<boolean> => {
    if (!config.zApiUrl || !config.zApiInstanceId || !config.zApiToken) {
        throw new Error('Z-API not configured');
    }

    console.log('[WhatsApp] Sending via Z-API...');

    const response = await fetch(
        `${config.zApiUrl}/send-text`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Client-Token': config.zApiToken
            },
            body: JSON.stringify({
                phone: phone,
                message: message
            })
        }
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Z-API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    console.log('[WhatsApp] Message sent via Z-API');
    return true;
};

/**
 * Fallback: Open WhatsApp Web
 */
const sendViaWhatsAppWeb = (phone: string, message: string): boolean => {
    console.log('[WhatsApp] Fallback to WhatsApp Web...');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    return true;
};

/**
 * Main function: Send WhatsApp message using configured provider
 */
export const sendWhatsAppMessage = async (
    opportunity: Opportunity,
    customMessage?: string
): Promise<boolean> => {
    const config = getWhatsAppConfig();

    // Default message template
    const defaultTemplate = `Olá ${opportunity.name}, somos da Allo Oral Clinic. Verificamos seu histórico sobre "${opportunity.keywordFound}" e gostaríamos de saber como está a saúde do seu sorriso. Podemos agendar uma avaliação?`;

    const message = customMessage || defaultTemplate;
    const phone = cleanPhone(opportunity.phone);

    console.log(`[WhatsApp] Provider: ${config.provider}`);
    console.log(`[WhatsApp] Phone: ${phone}`);

    try {
        switch (config.provider) {
            case 'evolution':
                return await sendViaEvolution(phone, message, config);

            case 'business-cloud':
                return await sendViaBusinessCloud(phone, message, config);

            case 'z-api':
                return await sendViaZApi(phone, message, config);

            case 'whatsapp-web':
            default:
                return sendViaWhatsAppWeb(phone, message);
        }
    } catch (error) {
        console.error(`[WhatsApp] Failed via ${config.provider}:`, error);

        // Fallback to WhatsApp Web
        console.log('[WhatsApp] Falling back to WhatsApp Web...');
        return sendViaWhatsAppWeb(phone, message);
    }
};

/**
 * Check connection status for current provider
 */
export const checkWhatsAppConnection = async (): Promise<boolean> => {
    const config = getWhatsAppConfig();

    try {
        switch (config.provider) {
            case 'evolution':
                if (!config.evolutionApiUrl || !config.evolutionApiKey) return false;

                const response = await fetch(
                    `${config.evolutionApiUrl}/instance/connectionState/${config.evolutionInstanceName}`,
                    {
                        method: 'GET',
                        headers: { 'apikey': config.evolutionApiKey }
                    }
                );

                if (!response.ok) return false;
                const data = await response.json();
                return data.state === 'open';

            case 'business-cloud':
                // Business Cloud doesn't need connection check (always "connected" if configured)
                return !!(config.businessCloudPhoneNumberId && config.businessCloudAccessToken);

            case 'z-api':
                // Z-API connection check (if API provides status endpoint)
                return !!(config.zApiUrl && config.zApiToken);

            default:
                return true; // WhatsApp Web is always "available"
        }
    } catch (error) {
        console.error('[WhatsApp] Connection check failed:', error);
        return false;
    }
};

/**
 * Get QR code for WhatsApp connection (Evolution API only)
 */
export const getWhatsAppQRCode = async (): Promise<string | null> => {
    const config = getWhatsAppConfig();

    if (config.provider !== 'evolution') {
        console.warn('[WhatsApp] QR code only available for Evolution API');
        return null;
    }

    if (!config.evolutionApiUrl || !config.evolutionApiKey) {
        return null;
    }

    try {
        const response = await fetch(
            `${config.evolutionApiUrl}/instance/connect/${config.evolutionInstanceName}`,
            {
                method: 'GET',
                headers: { 'apikey': config.evolutionApiKey }
            }
        );

        if (!response.ok) return null;

        const data = await response.json();
        return data.qrcode?.base64 || null;
    } catch (error) {
        console.error('[WhatsApp] QR code fetch failed:', error);
        return null;
    }
};
