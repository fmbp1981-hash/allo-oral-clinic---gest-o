import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient, isNotFoundError } from '../../lib/supabase';
import { TrelloClient, setupDefaultLists } from '../../lib/trello';

/**
 * POST /api/trello/setup-lists
 * Setup default CRM lists on the selected Trello board
 */
export async function POST(request: NextRequest) {
    try {
        const auth = validateAuthHeader(request);
        if (isAuthError(auth)) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId } = auth.data;

        const body = await request.json();
        const { boardId } = body;

        if (!boardId) {
            return NextResponse.json(
                { error: 'Board ID é obrigatório' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseClient();

        // Get user's Trello credentials
        const { data: config, error: configError } = await supabase
            .from('trello_config')
            .select('api_key, token')
            .eq('user_id', userId)
            .single();

        if (configError && !isNotFoundError(configError)) {
            console.error('Error fetching Trello config:', configError);
            return NextResponse.json(
                { error: 'Erro ao buscar configuração do Trello' },
                { status: 500 }
            );
        }

        if (!config?.api_key || !config?.token) {
            return NextResponse.json(
                { error: 'Trello não configurado. Salve suas credenciais primeiro.' },
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
                { error: 'Erro ao salvar mapeamento de listas' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Listas criadas/mapeadas com sucesso!',
            listMapping,
            boardName: board.name,
        });
    } catch (error) {
        console.error('Error in /api/trello/setup-lists:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
