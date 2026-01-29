import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient, isNotFoundError } from '../../lib/supabase';

/**
 * GET /api/trello/status
 * Get Trello connection status for the authenticated user
 */
export async function GET(request: NextRequest) {
    try {
        // Validate authentication
        const auth = validateAuthHeader(request);
        if (isAuthError(auth)) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId } = auth.data;
        const supabase = getSupabaseClient();

        // Get user's Trello config
        const { data: config, error } = await supabase
            .from('trello_config')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && !isNotFoundError(error)) {
            console.error('Error fetching Trello config:', error);
            return NextResponse.json(
                { error: 'Erro ao buscar configuração do Trello' },
                { status: 500 }
            );
        }

        if (!config) {
            return NextResponse.json({
                configured: false,
                boardId: null,
                syncEnabled: false,
                hasListMapping: false,
            });
        }

        const listMapping = config.list_mapping || {};
        const hasListMapping = !!(
            listMapping.NEW &&
            listMapping.SENT &&
            listMapping.RESPONDED &&
            listMapping.SCHEDULED &&
            listMapping.ARCHIVED
        );

        return NextResponse.json({
            configured: !!(config.api_key && config.token),
            boardId: config.board_id || null,
            boardName: config.board_name || null,
            syncEnabled: config.sync_enabled || false,
            hasListMapping,
            webhookActive: !!config.webhook_id,
            savedConfig: {
                board_id: config.board_id,
                board_name: config.board_name,
                sync_enabled: config.sync_enabled,
                list_mapping: listMapping,
                created_at: config.created_at,
                updated_at: config.updated_at,
            },
        });
    } catch (error) {
        console.error('Error in /api/trello/status:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
