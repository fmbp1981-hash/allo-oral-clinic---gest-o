import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient, isNotFoundError } from '../../lib/supabase';
import { TrelloClient } from '../../lib/trello';

/**
 * GET /api/trello/boards
 * Get all accessible Trello boards for the authenticated user
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
                { error: 'Trello não configurado. Salve sua API Key e Token primeiro.' },
                { status: 400 }
            );
        }

        // Get boards from Trello
        const client = new TrelloClient(config.api_key, config.token);
        const boards = await client.getBoards();

        return NextResponse.json(boards);
    } catch (error) {
        console.error('Error in /api/trello/boards:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar boards do Trello' },
            { status: 500 }
        );
    }
}
