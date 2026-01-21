import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TrelloClient } from '../../lib/trello';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * POST /api/trello/test-connection
 * Test Trello connection with provided credentials
 * Also saves credentials to database if successful (for subsequent API calls)
 */
export async function POST(request: NextRequest) {
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
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const body = await request.json();
        const { apiKey, token: trelloToken } = body;

        if (!apiKey || !trelloToken) {
            return NextResponse.json(
                { error: 'API Key and Token are required' },
                { status: 400 }
            );
        }

        // Test connection with Trello
        const client = new TrelloClient(apiKey, trelloToken);
        
        try {
            const result = await client.testConnection();
            
            // Save credentials to database for future API calls
            const supabase = createClient(supabaseUrl, supabaseKey);
            
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
            const message = trelloError instanceof Error ? trelloError.message : 'Failed to connect to Trello';
            return NextResponse.json({
                success: false,
                error: message,
            });
        }
    } catch (error) {
        console.error('Error in /api/trello/test-connection:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
