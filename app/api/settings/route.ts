import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../lib/auth';
import { getSupabaseClient, isNotFoundError } from '../lib/supabase';

/**
 * GET /api/settings
 * Retorna as configurações do usuário atual
 */
export async function GET(request: NextRequest) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId } = auth.data;
    const supabase = getSupabaseClient();

    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && !isNotFoundError(error)) {
      console.error('Error fetching settings:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar configurações' },
        { status: 500 }
      );
    }

    if (!settings) {
      return NextResponse.json({
        configured: false,
        provider: 'evolution',
        reactivationMessage: null,
        appointmentConfirmation: null,
        appointmentReminder: null,
        welcomeMessage: null,
      });
    }

    return NextResponse.json({
      configured: true,
      provider: settings.provider || 'evolution',
      evolutionApiUrl: settings.evolution_api_url,
      evolutionInstanceName: settings.evolution_instance_name,
      webhookUrl: settings.whatsapp_webhook_url,
      reactivationMessage: settings.reactivation_message,
      appointmentConfirmation: settings.appointment_confirmation,
      appointmentReminder: settings.appointment_reminder,
      welcomeMessage: settings.welcome_message,
      integrationConfigured: settings.integration_configured,
    });
  } catch (error) {
    console.error('Error in GET /api/settings:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings
 * Atualiza as configurações do usuário atual
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId } = auth.data;
    const body = await request.json();
    const supabase = getSupabaseClient();

    // Check if settings exist
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    const settingsData: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    // Map incoming fields to database columns
    if (body.provider !== undefined) settingsData.provider = body.provider;
    if (body.evolutionApiUrl !== undefined) settingsData.evolution_api_url = body.evolutionApiUrl;
    if (body.evolutionApiKey !== undefined) settingsData.evolution_api_key = body.evolutionApiKey;
    if (body.evolutionInstanceName !== undefined) settingsData.evolution_instance_name = body.evolutionInstanceName;
    if (body.zapiUrl !== undefined) settingsData.zapi_url = body.zapiUrl;
    if (body.zapiInstanceId !== undefined) settingsData.zapi_instance_id = body.zapiInstanceId;
    if (body.zapiToken !== undefined) settingsData.zapi_token = body.zapiToken;
    if (body.businessPhoneNumberId !== undefined) settingsData.business_phone_number_id = body.businessPhoneNumberId;
    if (body.businessAccessToken !== undefined) settingsData.business_access_token = body.businessAccessToken;
    if (body.webhookUrl !== undefined) settingsData.whatsapp_webhook_url = body.webhookUrl;
    if (body.reactivationMessage !== undefined) settingsData.reactivation_message = body.reactivationMessage;
    if (body.appointmentConfirmation !== undefined) settingsData.appointment_confirmation = body.appointmentConfirmation;
    if (body.appointmentReminder !== undefined) settingsData.appointment_reminder = body.appointmentReminder;
    if (body.welcomeMessage !== undefined) settingsData.welcome_message = body.welcomeMessage;

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('user_settings')
        .update(settingsData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('user_settings')
        .insert(settingsData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações atualizadas com sucesso',
    });
  } catch (error) {
    console.error('Error in PUT /api/settings:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
