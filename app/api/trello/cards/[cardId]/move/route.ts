import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TrelloClient } from '../../../../lib/trello';

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
 * POST /api/trello/cards/[cardId]/move
 * Move a card to a different list
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ cardId: string }> }
) {
    try {
        const { cardId } = await params;
        const result = await getAuthAndClient(request);
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { client, supabase } = result;
        const body = await request.json();
        const { listId } = body;

        if (!listId) {
            return NextResponse.json(
                { error: 'listId is required' },
                { status: 400 }
            );
        }

        const card = await client.moveCard(cardId, listId);

        // Update mapping
        await supabase
            .from('trello_card_mappings')
            .update({
                trello_list_id: listId,
                last_synced_at: new Date().toISOString(),
            })
            .eq('trello_card_id', cardId);

        return NextResponse.json(card);
    } catch (error) {
        console.error('Error in POST /api/trello/cards/[cardId]/move:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
