import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient } from '../../lib/supabase';

interface SendBulkRequest {
  recipients: Array<{
    id: string;
    name: string;
    phone: string;
  }>;
  templateId?: string;
  customMessage?: string;
  templateVariables?: Record<string, string>;
}

interface WhatsAppConfig {
  provider: 'evolution' | 'zapi' | 'business_cloud';
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  evolutionInstanceName?: string;
  zapiUrl?: string;
  zapiInstanceId?: string;
  zapiToken?: string;
  businessPhoneNumberId?: string;
  businessAccessToken?: string;
}

/**
 * POST /api/whatsapp/send-bulk
 * Envia mensagens WhatsApp para múltiplos destinatários
 */
export async function POST(request: NextRequest) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId } = auth.data;
    const supabase = getSupabaseClient();

    // Buscar configurações de WhatsApp do usuário
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Configurações de WhatsApp não encontradas. Configure na área de integrações.' },
        { status: 400 }
      );
    }

    const config: WhatsAppConfig = {
      provider: settings.provider || 'evolution',
      evolutionApiUrl: settings.evolution_api_url,
      evolutionApiKey: settings.evolution_api_key,
      evolutionInstanceName: settings.evolution_instance_name,
      zapiUrl: settings.zapi_url,
      zapiInstanceId: settings.zapi_instance_id,
      zapiToken: settings.zapi_token,
      businessPhoneNumberId: settings.business_phone_number_id,
      businessAccessToken: settings.business_access_token,
    };

    // Validar configurações
    if (!isConfigValid(config)) {
      return NextResponse.json(
        { error: 'Configurações de WhatsApp incompletas. Verifique suas credenciais.' },
        { status: 400 }
      );
    }

    const body: SendBulkRequest = await request.json();
    const { recipients, templateId, customMessage, templateVariables } = body;

    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum destinatário selecionado' },
        { status: 400 }
      );
    }

    // Buscar template se especificado
    let messageTemplate = customMessage || '';
    if (templateId) {
      // Verificar se é um template padrão
      const defaultTemplates: Record<string, string> = {
        reactivation: settings.reactivation_message || '',
        confirmation: settings.appointment_confirmation || '',
        reminder: settings.appointment_reminder || '',
        welcome: settings.welcome_message || '',
      };

      if (defaultTemplates[templateId]) {
        messageTemplate = defaultTemplates[templateId];
      } else {
        // Buscar template customizado
        const { data: template } = await supabase
          .from('message_templates')
          .select('content')
          .eq('id', templateId)
          .eq('user_id', userId)
          .single();

        if (template) {
          messageTemplate = template.content;
        }
      }
    }

    if (!messageTemplate) {
      return NextResponse.json(
        { error: 'Template de mensagem não encontrado ou mensagem vazia' },
        { status: 400 }
      );
    }

    // Enviar mensagens
    const results = await sendBulkMessages(
      config,
      recipients,
      messageTemplate,
      templateVariables || {}
    );

    // Salvar log de envios
    const logEntries = results.map((result) => ({
      user_id: userId,
      recipient_id: result.recipientId,
      recipient_phone: result.phone,
      message_sent: result.success,
      error_message: result.error || null,
      template_used: templateId || 'custom',
      sent_at: new Date().toISOString(),
    }));

    await supabase.from('message_logs').insert(logEntries).select();

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Enviado com sucesso para ${successCount} destinatário(s)`,
      summary: {
        total: recipients.length,
        success: successCount,
        failed: failedCount,
      },
      results,
    });
  } catch (error) {
    console.error('Error in POST /api/whatsapp/send-bulk:', error);
    return NextResponse.json(
      { error: 'Erro ao enviar mensagens' },
      { status: 500 }
    );
  }
}

/**
 * Verifica se a configuração do WhatsApp é válida
 */
function isConfigValid(config: WhatsAppConfig): boolean {
  switch (config.provider) {
    case 'evolution':
      return !!(config.evolutionApiUrl && config.evolutionApiKey && config.evolutionInstanceName);
    case 'zapi':
      return !!(config.zapiUrl && config.zapiInstanceId && config.zapiToken);
    case 'business_cloud':
    case 'business-cloud':
      return !!(config.businessPhoneNumberId && config.businessAccessToken);
    default:
      return false;
  }
}

/**
 * Envia mensagens para múltiplos destinatários
 */
async function sendBulkMessages(
  config: WhatsAppConfig,
  recipients: Array<{ id: string; name: string; phone: string }>,
  template: string,
  variables: Record<string, string>
): Promise<Array<{ recipientId: string; phone: string; success: boolean; error?: string }>> {
  const results = [];

  for (const recipient of recipients) {
    try {
      // Substituir variáveis no template
      let message = template;
      message = message.replace(/{nome}/gi, recipient.name);
      message = message.replace(/{telefone}/gi, recipient.phone);

      // Substituir variáveis adicionais
      Object.entries(variables).forEach(([key, value]) => {
        message = message.replace(new RegExp(`{${key}}`, 'gi'), value);
      });

      // Formatar número de telefone (remover caracteres especiais)
      const phone = formatPhoneNumber(recipient.phone);

      if (!phone) {
        results.push({
          recipientId: recipient.id,
          phone: recipient.phone,
          success: false,
          error: 'Número de telefone inválido',
        });
        continue;
      }

      // Enviar mensagem baseado no provedor
      const sendResult = await sendMessage(config, phone, message);
      results.push({
        recipientId: recipient.id,
        phone: recipient.phone,
        success: sendResult.success,
        error: sendResult.error,
      });

      // Delay entre mensagens para evitar bloqueio
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (error) {
      results.push({
        recipientId: recipient.id,
        phone: recipient.phone,
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  return results;
}

/**
 * Formata número de telefone para formato internacional
 */
function formatPhoneNumber(phone: string): string | null {
  // Remove caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < 10) {
    return null;
  }

  // Adiciona código do país se necessário
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `55${cleaned}`;
  }

  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    return cleaned;
  }

  return cleaned;
}

/**
 * Envia uma mensagem individual
 */
async function sendMessage(
  config: WhatsAppConfig,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (config.provider) {
      case 'evolution':
        return await sendViaEvolution(config, phone, message);
      case 'zapi':
        return await sendViaZapi(config, phone, message);
      case 'business_cloud':
      case 'business-cloud':
        return await sendViaBusinessCloud(config, phone, message);
      default:
        return { success: false, error: 'Provedor não suportado' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao enviar mensagem',
    };
  }
}

/**
 * Envia mensagem via Evolution API
 */
async function sendViaEvolution(
  config: WhatsAppConfig,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${config.evolutionApiUrl}/message/sendText/${config.evolutionInstanceName}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.evolutionApiKey || '',
    },
    body: JSON.stringify({
      number: phone,
      text: message,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    return {
      success: false,
      error: errorData.message || `Erro HTTP ${response.status}`,
    };
  }

  return { success: true };
}

/**
 * Envia mensagem via Z-API
 */
async function sendViaZapi(
  config: WhatsAppConfig,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${config.zapiUrl}/instances/${config.zapiInstanceId}/token/${config.zapiToken}/send-text`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone,
      message,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    return {
      success: false,
      error: errorData.message || `Erro HTTP ${response.status}`,
    };
  }

  return { success: true };
}

/**
 * Envia mensagem via WhatsApp Business Cloud API
 */
async function sendViaBusinessCloud(
  config: WhatsAppConfig,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const url = `https://graph.facebook.com/v18.0/${config.businessPhoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.businessAccessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body: message },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    return {
      success: false,
      error: errorData.error?.message || `Erro HTTP ${response.status}`,
    };
  }

  return { success: true };
}
