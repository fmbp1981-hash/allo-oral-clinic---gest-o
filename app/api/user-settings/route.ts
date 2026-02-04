import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../lib/auth';
import { getSupabaseClient } from '../lib/supabase';

/**
 * GET /api/user-settings
 * Busca as configurações do usuário (WhatsApp, templates, etc.)
 */
export async function GET(request: NextRequest) {
    try {
        const auth = validateAuthHeader(request);
        if (isAuthError(auth)) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId } = auth.data;
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching user settings:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Return empty config if no settings found
        if (!data) {
            return NextResponse.json({
                provider: 'evolution',
                evolutionApiUrl: '',
                evolutionApiKey: '',
                evolutionInstanceName: '',
                zapiUrl: '',
                zapiInstanceId: '',
                zapiToken: '',
                businessPhoneNumberId: '',
                businessAccessToken: '',
                reactivationMessage: '',
                appointmentConfirmation: '',
                appointmentReminder: '',
                welcomeMessage: '',
                integrationConfigured: false
            });
        }

        // Map snake_case to camelCase for frontend
        return NextResponse.json({
            provider: data.provider || 'evolution',
            evolutionApiUrl: data.evolution_api_url || '',
            evolutionApiKey: data.evolution_api_key || '',
            evolutionInstanceName: data.evolution_instance_name || '',
            zapiUrl: data.zapi_url || '',
            zapiInstanceId: data.zapi_instance_id || '',
            zapiToken: data.zapi_token || '',
            businessPhoneNumberId: data.business_phone_number_id || '',
            businessAccessToken: data.business_access_token || '',
            reactivationMessage: data.reactivation_message || '',
            appointmentConfirmation: data.appointment_confirmation || '',
            appointmentReminder: data.appointment_reminder || '',
            welcomeMessage: data.welcome_message || '',
            integrationConfigured: data.integration_configured || false
        });
    } catch (error) {
        console.error('Error in GET /api/user-settings:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

/**
 * POST /api/user-settings
 * Salva/atualiza as configurações do usuário
 */
export async function POST(request: NextRequest) {
    try {
        const auth = validateAuthHeader(request);
        if (isAuthError(auth)) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId } = auth.data;
        const supabase = getSupabaseClient();
        const body = await request.json();

        // Map camelCase to snake_case for database
        const dbPayload = {
            user_id: userId,
            provider: body.provider || 'evolution',
            evolution_api_url: body.evolutionApiUrl || null,
            evolution_api_key: body.evolutionApiKey || null,
            evolution_instance_name: body.evolutionInstanceName || null,
            zapi_url: body.zapiUrl || null,
            zapi_instance_id: body.zapiInstanceId || null,
            zapi_token: body.zapiToken || null,
            business_phone_number_id: body.businessPhoneNumberId || null,
            business_access_token: body.businessAccessToken || null,
            reactivation_message: body.reactivationMessage || null,
            appointment_confirmation: body.appointmentConfirmation || null,
            appointment_reminder: body.appointmentReminder || null,
            welcome_message: body.welcomeMessage || null,
            integration_configured: isConfigComplete(body),
            pending_setup: !isConfigComplete(body),
            updated_at: new Date().toISOString()
        };

        // Upsert - insert or update if exists
        const { error } = await supabase
            .from('user_settings')
            .upsert(dbPayload, {
                onConflict: 'user_id',
                ignoreDuplicates: false
            });

        if (error) {
            console.error('Error saving user settings:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Configurações salvas com sucesso',
            integrationConfigured: isConfigComplete(body)
        });
    } catch (error) {
        console.error('Error in POST /api/user-settings:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

/**
 * Verifica se a configuração do provedor está completa
 */
function isConfigComplete(config: any): boolean {
    const provider = config.provider || 'evolution';

    switch (provider) {
        case 'evolution':
            return !!(
                config.evolutionApiUrl &&
                config.evolutionApiKey &&
                config.evolutionInstanceName
            );
        case 'zapi':
            return !!(
                config.zapiUrl &&
                config.zapiInstanceId &&
                config.zapiToken
            );
        case 'business_cloud':
        case 'business-cloud':
            return !!(
                config.businessPhoneNumberId &&
                config.businessAccessToken
            );
        case 'whatsapp-web':
            return true; // Always "configured" for fallback
        default:
            return false;
    }
}
