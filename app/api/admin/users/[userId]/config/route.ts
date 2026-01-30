import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../../../lib/auth';
import { getSupabaseClient, isNotFoundError } from '../../../../lib/supabase';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

interface UserConfig {
  // Trello Config
  trello: {
    configured: boolean;
    apiKey?: string;
    token?: string;
    boardId?: string;
    boardName?: string;
    syncEnabled?: boolean;
  };
  // WhatsApp Config
  whatsapp: {
    configured: boolean;
    provider?: 'evolution' | 'zapi' | 'business_cloud';
    evolutionApiUrl?: string;
    evolutionApiKey?: string;
    evolutionInstanceName?: string;
    zapiUrl?: string;
    zapiInstanceId?: string;
    zapiToken?: string;
    businessPhoneNumberId?: string;
    businessAccessToken?: string;
    webhookUrl?: string;
  };
  // Message Templates
  templates: {
    reactivationMessage?: string;
    appointmentConfirmation?: string;
    appointmentReminder?: string;
    welcomeMessage?: string;
    customTemplates?: Array<{
      id: string;
      name: string;
      content: string;
    }>;
  };
}

/**
 * GET /api/admin/users/[userId]/config
 * Obtém configurações de integrações de um usuário (apenas admin)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId: adminId } = auth.data;
    const { userId } = await params;
    const supabase = getSupabaseClient();

    // Verificar se o usuário é admin
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar esta área.' },
        { status: 403 }
      );
    }

    // Buscar configuração do Trello
    const { data: trelloConfig } = await supabase
      .from('trello_config')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Buscar configuração do WhatsApp
    const { data: whatsappConfig } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Buscar templates de mensagem
    const { data: templatesConfig } = await supabase
      .from('message_templates')
      .select('*')
      .eq('user_id', userId);

    const config: UserConfig = {
      trello: {
        configured: !!trelloConfig?.board_id,
        apiKey: trelloConfig?.api_key || '',
        token: trelloConfig?.token || '',
        boardId: trelloConfig?.board_id || '',
        boardName: trelloConfig?.board_name || '',
        syncEnabled: trelloConfig?.sync_enabled || false,
      },
      whatsapp: {
        configured: !!(whatsappConfig?.evolution_api_url && whatsappConfig?.evolution_api_key),
        provider: whatsappConfig?.provider || 'evolution',
        evolutionApiUrl: whatsappConfig?.evolution_api_url || '',
        evolutionApiKey: whatsappConfig?.evolution_api_key || '',
        evolutionInstanceName: whatsappConfig?.evolution_instance_name || '',
        zapiUrl: whatsappConfig?.zapi_url || '',
        zapiInstanceId: whatsappConfig?.zapi_instance_id || '',
        zapiToken: whatsappConfig?.zapi_token || '',
        businessPhoneNumberId: whatsappConfig?.business_phone_number_id || '',
        businessAccessToken: whatsappConfig?.business_access_token || '',
        webhookUrl: whatsappConfig?.whatsapp_webhook_url || '',
      },
      templates: {
        reactivationMessage: whatsappConfig?.reactivation_message || getDefaultTemplate('reactivation'),
        appointmentConfirmation: whatsappConfig?.appointment_confirmation || getDefaultTemplate('confirmation'),
        appointmentReminder: whatsappConfig?.appointment_reminder || getDefaultTemplate('reminder'),
        welcomeMessage: whatsappConfig?.welcome_message || getDefaultTemplate('welcome'),
        customTemplates: templatesConfig || [],
      },
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error in GET /api/admin/users/[userId]/config:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users/[userId]/config
 * Atualiza configurações de integrações de um usuário (apenas admin)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId: adminId } = auth.data;
    const { userId } = await params;
    const supabase = getSupabaseClient();

    // Verificar se o usuário é admin
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem acessar esta área.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { trello, whatsapp, templates } = body;

    // Atualizar configuração do Trello
    if (trello) {
      const trelloData = {
        user_id: userId,
        api_key: trello.apiKey || '',
        token: trello.token || '',
        board_id: trello.boardId || null,
        board_name: trello.boardName || null,
        sync_enabled: trello.syncEnabled || false,
        updated_at: new Date().toISOString(),
      };

      // Check if config exists
      const { data: existingTrello } = await supabase
        .from('trello_config')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingTrello) {
        await supabase
          .from('trello_config')
          .update(trelloData)
          .eq('user_id', userId);
      } else {
        await supabase
          .from('trello_config')
          .insert(trelloData);
      }
    }

    // Atualizar configuração do WhatsApp e Templates
    if (whatsapp || templates) {
      const whatsappData: Record<string, unknown> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
      };

      if (whatsapp) {
        whatsappData.provider = whatsapp.provider || 'evolution';
        whatsappData.evolution_api_url = whatsapp.evolutionApiUrl || null;
        whatsappData.evolution_api_key = whatsapp.evolutionApiKey || null;
        whatsappData.evolution_instance_name = whatsapp.evolutionInstanceName || null;
        whatsappData.zapi_url = whatsapp.zapiUrl || null;
        whatsappData.zapi_instance_id = whatsapp.zapiInstanceId || null;
        whatsappData.zapi_token = whatsapp.zapiToken || null;
        whatsappData.business_phone_number_id = whatsapp.businessPhoneNumberId || null;
        whatsappData.business_access_token = whatsapp.businessAccessToken || null;
        whatsappData.whatsapp_webhook_url = whatsapp.webhookUrl || null;
      }

      if (templates) {
        whatsappData.reactivation_message = templates.reactivationMessage || null;
        whatsappData.appointment_confirmation = templates.appointmentConfirmation || null;
        whatsappData.appointment_reminder = templates.appointmentReminder || null;
        whatsappData.welcome_message = templates.welcomeMessage || null;
      }

      // Check if config exists
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingSettings) {
        await supabase
          .from('user_settings')
          .update(whatsappData)
          .eq('user_id', userId);
      } else {
        await supabase
          .from('user_settings')
          .insert(whatsappData);
      }

      // Atualizar templates customizados
      if (templates?.customTemplates) {
        // Deletar templates existentes
        await supabase
          .from('message_templates')
          .delete()
          .eq('user_id', userId);

        // Inserir novos templates
        if (templates.customTemplates.length > 0) {
          const templatesData = templates.customTemplates.map((t: { name: string; content: string }) => ({
            user_id: userId,
            name: t.name,
            content: t.content,
            created_at: new Date().toISOString(),
          }));

          await supabase
            .from('message_templates')
            .insert(templatesData);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/users/[userId]/config:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * Retorna template padrão baseado no tipo
 */
function getDefaultTemplate(type: string): string {
  const templates: Record<string, string> = {
    reactivation: `Olá {nome}! 👋

Notamos que faz um tempo desde sua última visita à nossa clínica. Gostaríamos de saber como você está e se podemos ajudá-lo com algum tratamento.

Temos novidades e condições especiais para pacientes como você!

Podemos agendar uma avaliação?`,
    confirmation: `Olá {nome}! ✅

Confirmamos seu agendamento para o dia {data} às {hora}.

Endereço: {endereco}

Em caso de dúvidas ou necessidade de remarcação, entre em contato conosco.

Até lá!`,
    reminder: `Olá {nome}! 📅

Lembramos que você tem uma consulta agendada para amanhã, dia {data} às {hora}.

Por favor, confirme sua presença respondendo esta mensagem.

Aguardamos você!`,
    welcome: `Olá {nome}! 🎉

Bem-vindo(a) à nossa clínica! Estamos muito felizes em tê-lo(a) como paciente.

Se precisar de qualquer coisa, estamos à disposição.

Abraços da equipe!`,
  };

  return templates[type] || '';
}
