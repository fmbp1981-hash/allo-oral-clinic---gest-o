import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient, isNotFoundError } from '../../lib/supabase';
import { TrelloClient, getListIdFromStatus, TrelloListMapping } from '../../lib/trello';

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
                { error: 'boardId ou listId é obrigatório' },
                { status: 400 }
            );
        }

        let cards = await client.getCards({ boardId: boardId || undefined, listId: listId || undefined });

        // Filter out null/invalid cards defensively
        if (!Array.isArray(cards)) cards = [];
        cards = cards.filter(card => card && typeof card === 'object' && typeof card.name === 'string' && card.name.trim() !== '');

        return NextResponse.json(cards);
    } catch (error) {
        console.error('Error in GET /api/trello/cards:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar cards do Trello' },
            { status: 500 }
        );
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
                { error: 'listId ou status válido é obrigatório' },
                { status: 400 }
            );
        }

        if (!name) {
            return NextResponse.json(
                { error: 'Nome do card é obrigatório' },
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
        return NextResponse.json(
            { error: 'Erro ao criar card no Trello' },
            { status: 500 }
        );
    }
}
