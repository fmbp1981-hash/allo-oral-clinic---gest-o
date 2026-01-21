import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TrelloClient, buildCardDescription, getListIdFromStatus, TrelloListMapping } from '../../lib/trello';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Helper to get user ID and Trello client from request
 */
async function getAuthAndClient(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return { error: 'Unauthorized', status: 401 };
    }

    const token = authHeader.substring(7);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = payload.userId;

    if (!userId) {
        return { error: 'Invalid token', status: 401 };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: config, error } = await supabase
        .from('trello_config')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !config?.api_key || !config?.token) {
        return { error: 'Trello not configured', status: 400 };
    }

    const client = new TrelloClient(config.api_key, config.token);

    return { userId, config, client, supabase };
}

/**
 * GET /api/trello/cards
 * Get cards from a board or list
 */
export async function GET(request: NextRequest) {
    try {
        const result = await getAuthAndClient(request);
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { client, config } = result;
        const { searchParams } = new URL(request.url);
        const boardId = searchParams.get('boardId') || config.board_id;
        const listId = searchParams.get('listId');

        if (!boardId && !listId) {
            return NextResponse.json(
                { error: 'Either boardId or listId is required' },
                { status: 400 }
            );
        }

        const cards = await client.getCards({ boardId: boardId || undefined, listId: listId || undefined });

        return NextResponse.json(cards);
    } catch (error) {
        console.error('Error in GET /api/trello/cards:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/trello/cards
 * Create a new card
 */
export async function POST(request: NextRequest) {
    try {
        const result = await getAuthAndClient(request);
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { client, config, supabase, userId } = result;
        const body = await request.json();
        const { name, desc, listId, due, opportunityId, status } = body;

        // Determine list ID
        let targetListId = listId;
        if (!targetListId && status && config.list_mapping) {
            targetListId = getListIdFromStatus(status, config.list_mapping as TrelloListMapping);
        }

        if (!targetListId) {
            return NextResponse.json(
                { error: 'listId or valid status is required' },
                { status: 400 }
            );
        }

        if (!name) {
            return NextResponse.json(
                { error: 'Card name is required' },
                { status: 400 }
            );
        }

        const card = await client.createCard({
            name,
            desc: desc || '',
            idList: targetListId,
            due: due || undefined,
        });

        // Create mapping if opportunityId provided
        if (opportunityId) {
            await supabase.from('trello_card_mappings').insert({
                user_id: userId,
                opportunity_id: opportunityId,
                trello_card_id: card.id,
                trello_board_id: config.board_id,
                trello_list_id: targetListId,
            });
        }

        return NextResponse.json(card);
    } catch (error) {
        console.error('Error in POST /api/trello/cards:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
