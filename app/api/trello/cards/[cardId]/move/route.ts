import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../../../lib/auth';
import { getSupabaseClient, isNotFoundError } from '../../../../lib/supabase';
import { TrelloClient } from '../../../../lib/trello';

/**
 * Helper to get user ID and Trello client from request
 */
async function getAuthAndClient(request: NextRequest) {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
        return { error: auth.error, status: auth.status };
    }

    const { userId } = auth.data;
    const supabase = getSupabaseClient();

    const { data: config, error } = await supabase
        .from('trello_config')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && !isNotFoundError(error)) {
        console.error('Error fetching Trello config:', error);
        return { error: 'Erro ao buscar configuração do Trello', status: 500 };
    }

    if (!config?.api_key || !config?.token) {
        return { error: 'Trello não configurado', status: 400 };
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
                { error: 'listId é obrigatório' },
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
        return NextResponse.json(
            { error: 'Erro ao mover card' },
            { status: 500 }
        );
    }
}
