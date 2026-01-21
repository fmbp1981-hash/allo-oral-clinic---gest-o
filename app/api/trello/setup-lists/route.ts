import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TrelloClient, setupDefaultLists } from '../../lib/trello';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * POST /api/trello/setup-lists
 * Setup default CRM lists on the selected Trello board
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
        const { boardId } = body;

        if (!boardId) {
            return NextResponse.json(
                { error: 'Board ID is required' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get user's Trello credentials
        const { data: config, error: configError } = await supabase
            .from('trello_config')
            .select('api_key, token')
            .eq('user_id', userId)
            .single();

        if (configError || !config?.api_key || !config?.token) {
            return NextResponse.json(
                { error: 'Trello not configured. Please save your credentials first.' },
                { status: 400 }
            );
        }

        // Setup lists on the board
        const client = new TrelloClient(config.api_key, config.token);
        const listMapping = await setupDefaultLists(client, boardId);

        // Get board info
        const board = await client.getBoard(boardId);

        // Update config with list mapping and board info
        const { error: updateError } = await supabase
            .from('trello_config')
            .update({
                board_id: boardId,
                board_name: board.name,
                list_mapping: listMapping,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        if (updateError) {
            console.error('Error updating config:', updateError);
            return NextResponse.json(
                { error: 'Failed to save list mapping' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Lists created/mapped successfully!',
            listMapping,
            boardName: board.name,
        });
    } catch (error) {
        console.error('Error in /api/trello/setup-lists:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
