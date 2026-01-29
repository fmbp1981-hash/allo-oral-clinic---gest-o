import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../../lib/auth';
import { getSupabaseClient, isNotFoundError } from '../../../lib/supabase';
import { TrelloClient } from '../../../lib/trello';

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
 * GET /api/trello/cards/[cardId]
 * Get a specific card
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ cardId: string }> }
) {
    try {
        const { cardId } = await params;
        const result = await getAuthAndClient(request);
        if ('error' in result) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        }

        const { client } = result;
        const card = await client.getCard(cardId);

        return NextResponse.json(card);
    } catch (error) {
        console.error('Error in GET /api/trello/cards/[cardId]:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar card' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/trello/cards/[cardId]
 * Update a card
 */
export async function PUT(
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
        const { name, desc, idList, due, dueComplete, closed } = body;

        const card = await client.updateCard(cardId, {
            name,
            desc,
            idList,
            due,
            dueComplete,
            closed,
        });

        // Update mapping if list changed
        if (idList) {
            await supabase
                .from('trello_card_mappings')
                .update({
                    trello_list_id: idList,
                    last_synced_at: new Date().toISOString(),
                })
                .eq('trello_card_id', cardId);
        }

        return NextResponse.json(card);
    } catch (error) {
        console.error('Error in PUT /api/trello/cards/[cardId]:', error);
        return NextResponse.json(
            { error: 'Erro ao atualizar card' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/trello/cards/[cardId]
 * Delete a card
 */
export async function DELETE(
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

        await client.deleteCard(cardId);

        // Remove mapping
        await supabase
            .from('trello_card_mappings')
            .delete()
            .eq('trello_card_id', cardId);

        return NextResponse.json({ success: true, message: 'Card excluído com sucesso' });
    } catch (error) {
        console.error('Error in DELETE /api/trello/cards/[cardId]:', error);
        return NextResponse.json(
            { error: 'Erro ao excluir card' },
            { status: 500 }
        );
    }
}
