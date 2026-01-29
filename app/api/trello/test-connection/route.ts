import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient } from '../../lib/supabase';
import { TrelloClient } from '../../lib/trello';

/**
 * POST /api/trello/test-connection
 * Test Trello connection with provided credentials
 * Also saves credentials to database if successful (for subsequent API calls)
 */
export async function POST(request: NextRequest) {
    try {
        // Validate authentication
        const auth = validateAuthHeader(request);
        if (isAuthError(auth)) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId } = auth.data;

        const body = await request.json();
        const { apiKey, token: trelloToken } = body;

        if (!apiKey || !trelloToken) {
            return NextResponse.json(
                { error: 'API Key e Token são obrigatórios' },
                { status: 400 }
            );
        }

        // Test connection with Trello
        const client = new TrelloClient(apiKey, trelloToken);

        try {
            const result = await client.testConnection();

            // Save credentials to database for future API calls
            const supabase = getSupabaseClient();

            const { data: existing } = await supabase
                .from('trello_config')
                .select('id')
                .eq('user_id', userId)
                .single();

            const configData = {
                user_id: userId,
                api_key: apiKey,
                token: trelloToken,
                updated_at: new Date().toISOString(),
            };

            if (existing) {
                await supabase
                    .from('trello_config')
                    .update(configData)
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('trello_config')
                    .insert(configData);
            }

            return NextResponse.json({
                success: true,
                user: {
                    fullName: result.user.fullName,
                    username: result.user.username,
                },
            });
        } catch (trelloError: unknown) {
            const message = trelloError instanceof Error ? trelloError.message : 'Falha ao conectar com o Trello';
            return NextResponse.json({
                success: false,
                error: message,
            });
        }
    } catch (error) {
        console.error('Error in /api/trello/test-connection:', error);
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
