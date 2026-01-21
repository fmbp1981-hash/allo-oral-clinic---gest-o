import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TrelloClient } from '../../../../lib/trello';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * GET /api/trello/boards/[boardId]/labels
 * Get labels from a specific board
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ boardId: string }> }
) {
    try {
        const { boardId } = await params;
        
        // Get auth token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const userId = payload.userId;

        if (!userId) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get user's Trello config
        const { data: config, error } = await supabase
            .from('trello_config')
            .select('api_key, token')
            .eq('user_id', userId)
            .single();

        if (error || !config?.api_key || !config?.token) {
            return NextResponse.json(
                { error: 'Trello not configured' },
                { status: 400 }
            );
        }

        const client = new TrelloClient(config.api_key, config.token);
        const labels = await client.getLabels(boardId);

        return NextResponse.json(labels);
    } catch (error) {
        console.error('Error in GET /api/trello/boards/[boardId]/labels:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
