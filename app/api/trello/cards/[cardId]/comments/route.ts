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
 * GET /api/trello/cards/[cardId]/comments
 * Get comments from a card
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
        const comments = await client.getCardComments(cardId);

        return NextResponse.json(comments);
    } catch (error) {
        console.error('Error in GET /api/trello/cards/[cardId]/comments:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar comentários' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/trello/cards/[cardId]/comments
 * Add a comment to a card
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

        const { client } = result;
        const body = await request.json();
        const { text } = body;

        if (!text) {
            return NextResponse.json(
                { error: 'Texto do comentário é obrigatório' },
                { status: 400 }
            );
        }

        const comment = await client.addCardComment(cardId, text);

        return NextResponse.json(comment);
    } catch (error) {
        console.error('Error in POST /api/trello/cards/[cardId]/comments:', error);
        return NextResponse.json(
            { error: 'Erro ao adicionar comentário' },
            { status: 500 }
        );
    }
}
