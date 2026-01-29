import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient, isNotFoundError, DbTrelloConfig } from '../../lib/supabase';
import { config as appConfig } from '../../lib/config';
import { TrelloClient } from '../../lib/trello';

/**
 * GET /api/trello/config
 * Get current Trello configuration
 */
export async function GET(request: NextRequest) {
    try {
        const auth = validateAuthHeader(request);
        if (isAuthError(auth)) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId } = auth.data;
        const supabase = getSupabaseClient();

        const { data: config, error } = await supabase
            .from('trello_config')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && !isNotFoundError(error)) {
            return NextResponse.json(
                { error: 'Erro ao buscar configuração' },
                { status: 500 }
            );
        }

        if (!config) {
            return NextResponse.json({ configured: false });
        }

        return NextResponse.json({
            configured: true,
            boardId: config.board_id,
            boardName: config.board_name,
            syncEnabled: config.sync_enabled,
            listMapping: config.list_mapping,
            webhookActive: !!config.webhook_id,
        });
    } catch (error) {
        console.error('Error in GET /api/trello/config:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/trello/config
 * Save or update Trello configuration
 */
export async function POST(request: NextRequest) {
    try {
        const auth = validateAuthHeader(request);
        if (isAuthError(auth)) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId } = auth.data;

        const body = await request.json();
        const {
            apiKey,
            token: trelloToken,
            boardId,
            boardName,
            syncEnabled,
            listMapping,
        } = body;

        if (!apiKey || !trelloToken) {
            return NextResponse.json(
                { error: 'API Key e Token são obrigatórios' },
                { status: 400 }
            );
        }

        // Test connection before saving
        const client = new TrelloClient(apiKey, trelloToken);
        try {
            await client.testConnection();
        } catch {
            return NextResponse.json(
                { error: 'Credenciais do Trello inválidas' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseClient();

        // Check if config exists
        const { data: existing } = await supabase
            .from('trello_config')
            .select('id, webhook_id')
            .eq('user_id', userId)
            .single();

        const configData = {
            user_id: userId,
            api_key: apiKey,
            token: trelloToken,
            board_id: boardId || null,
            board_name: boardName || null,
            sync_enabled: syncEnabled || false,
            list_mapping: listMapping || {},
            updated_at: new Date().toISOString(),
        };

        let result: DbTrelloConfig;
        if (existing) {
            // Update existing config
            const { data, error } = await supabase
                .from('trello_config')
                .update(configData)
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // Insert new config
            const { data, error } = await supabase
                .from('trello_config')
                .insert(configData)
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        // Setup webhook if sync is enabled and board is selected
        if (syncEnabled && boardId) {
            await setupWebhook(client, supabase, userId, boardId, existing?.webhook_id);
        }

        return NextResponse.json({
            success: true,
            message: 'Configuração do Trello salva com sucesso',
            config: {
                boardId: result.board_id,
                boardName: result.board_name,
                syncEnabled: result.sync_enabled,
                listMapping: result.list_mapping,
            },
        });
    } catch (error) {
        console.error('Error in POST /api/trello/config:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

/**
 * Setup webhook for bidirectional sync
 */
async function setupWebhook(
    client: TrelloClient,
    supabase: SupabaseClient,
    userId: string,
    boardId: string,
    existingWebhookId?: string
): Promise<void> {
    try {
        const callbackUrl = appConfig.app.webhookUrl;

        if (!callbackUrl || callbackUrl.includes('localhost')) {
            console.warn('Webhook URL not configured or is localhost - skipping webhook setup');
            return;
        }

        // Delete existing webhook if any
        if (existingWebhookId) {
            try {
                await client.deleteWebhook(existingWebhookId);
            } catch {
                // Ignore errors deleting old webhook
            }
        }

        // Create new webhook
        const webhook = await client.createWebhook(
            callbackUrl,
            boardId,
            `Allo Oral Clinic Sync - User ${userId}`
        );

        // Save webhook ID
        await supabase
            .from('trello_config')
            .update({ webhook_id: webhook.id })
            .eq('user_id', userId);

        console.log(`Webhook created for user ${userId}: ${webhook.id}`);
    } catch (error) {
        console.error('Failed to setup webhook:', error);
        // Don't throw - webhook setup failure shouldn't prevent config save
    }
}
