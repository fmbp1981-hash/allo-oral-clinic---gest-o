import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * GET /api/trello/status
 * Get Trello connection status for the authenticated user
 */
export async function GET(request: NextRequest) {
    try {
        // Get auth token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        
        // Decode JWT to get user ID (simple decode, already validated by middleware)
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const userId = payload.userId;

        if (!userId) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get user's Trello config
        const { data: config, error } = await supabase
            .from('trello_config')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching Trello config:', error);
            return NextResponse.json(
                { error: 'Failed to fetch Trello configuration' },
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
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
