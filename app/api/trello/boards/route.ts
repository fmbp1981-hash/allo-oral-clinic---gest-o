import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TrelloClient } from '../../lib/trello';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * GET /api/trello/boards
 * Get all accessible Trello boards for the authenticated user
 */
export async function GET(request: NextRequest) {
    try {
        // Get auth token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const userId = payload.userId;

        if (!userId) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 401 }
            );
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
                { error: 'Trello not configured. Please save your API Key and Token first.' },
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
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
