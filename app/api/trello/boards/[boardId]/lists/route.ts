import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../../../lib/auth';
import { getSupabaseClient, isNotFoundError } from '../../../../lib/supabase';
import { TrelloClient } from '../../../../lib/trello';

/**
 * GET /api/trello/boards/[boardId]/lists
 * Get lists from a specific board
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ boardId: string }> }
) {
    try {
        const { boardId } = await params;

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
            .select('api_key, token')
            .eq('user_id', userId)
            .single();

        if (error && !isNotFoundError(error)) {
            console.error('Error fetching Trello config:', error);
            return NextResponse.json(
                { error: 'Erro ao buscar configuração do Trello' },
                { status: 500 }
            );
        }

        if (!config?.api_key || !config?.token) {
            return NextResponse.json(
                { error: 'Trello não configurado' },
                { status: 400 }
            );
        }

        const client = new TrelloClient(config.api_key, config.token);
        const lists = await client.getLists(boardId);

        return NextResponse.json(lists);
    } catch (error) {
        console.error('Error in GET /api/trello/boards/[boardId]/lists:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar listas do board' },
            { status: 500 }
        );
    }
}
