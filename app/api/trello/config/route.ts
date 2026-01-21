import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TrelloClient, TrelloListMapping } from '../../lib/trello';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * GET /api/trello/config
 * Get current Trello configuration
 */
export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const userId = payload.userId;

        if (!userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: config, error } = await supabase
            .from('trello_config')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
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
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/trello/config
 * Save or update Trello configuration
 */
export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const userId = payload.userId;

        if (!userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

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
                { error: 'API Key and Token are required' },
                { status: 400 }
            );
        }

        // Test connection before saving
        const client = new TrelloClient(apiKey, trelloToken);
        try {
            await client.testConnection();
        } catch {
            return NextResponse.json(
                { error: 'Invalid Trello credentials' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

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

        let result;
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
            message: 'Trello configuration saved successfully',
            config: {
                boardId: result.board_id,
                boardName: result.board_name,
                syncEnabled: result.sync_enabled,
                listMapping: result.list_mapping,
            },
        });
    } catch (error) {
        console.error('Error in POST /api/trello/config:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * Setup webhook for bidirectional sync
 */
async function setupWebhook(
    client: TrelloClient,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    userId: string,
    boardId: string,
    existingWebhookId?: string
): Promise<void> {
    try {
        // Get the base URL for webhooks
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
        if (!baseUrl) {
            console.warn('No base URL configured for webhooks');
            return;
        }

        const callbackUrl = `${baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`}/api/trello/webhook`;

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
