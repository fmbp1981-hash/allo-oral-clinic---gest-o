import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    TrelloClient,
    TrelloListMapping,
    buildCardDescription,
    getListIdFromStatus,
} from '../../lib/trello';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * POST /api/trello/sync-opportunity
 * Sync an opportunity to Trello (create or update card)
 */
export async function POST(request: NextRequest) {
    try {
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

        const body = await request.json();
        const {
            opportunityId,
            trelloCardId,
            patientName,
            patientPhone,
            keyword,
            status,
            notes,
            scheduledDate,
        } = body;

        if (!opportunityId || !patientName || !status) {
            return NextResponse.json(
                { error: 'opportunityId, patientName, and status are required' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get Trello config
        const { data: config, error: configError } = await supabase
            .from('trello_config')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (configError || !config?.api_key || !config?.token) {
            return NextResponse.json(
                { error: 'Trello not configured' },
                { status: 400 }
            );
        }

        if (!config.board_id || !config.list_mapping) {
            return NextResponse.json(
                { error: 'Trello board not configured. Please setup lists first.' },
                { status: 400 }
            );
        }

        const listMapping = config.list_mapping as TrelloListMapping;
        const client = new TrelloClient(config.api_key, config.token);

        // Get target list based on status
        const listId = getListIdFromStatus(status, listMapping);
        if (!listId) {
            return NextResponse.json(
                { error: `No list mapped for status: ${status}` },
                { status: 400 }
            );
        }

        // Build card description
        const description = buildCardDescription({
            phone: patientPhone,
            keyword,
            notes,
            opportunityId,
        });

        // Build card name
        const cardName = patientName + (scheduledDate ? ` - 📅 ${scheduledDate}` : '');

        let card;
        let action: 'create_card' | 'update_card' | 'move_card' = 'create_card';

        // Check if card already exists in mapping
        const { data: existingMapping } = await supabase
            .from('trello_card_mappings')
            .select('*')
            .eq('opportunity_id', opportunityId)
            .single();

        if (existingMapping?.trello_card_id || trelloCardId) {
            // Update existing card
            const cardId = existingMapping?.trello_card_id || trelloCardId;
            
            try {
                // Get current card to check if list changed
                const currentCard = await client.getCard(cardId);
                
                if (currentCard.idList !== listId) {
                    // Move card to new list
                    card = await client.moveCard(cardId, listId);
                    action = 'move_card';
                } else {
                    // Just update card details
                    card = await client.updateCard(cardId, {
                        name: cardName,
                        desc: description,
                    });
                    action = 'update_card';
                }
            } catch {
                // Card doesn't exist anymore, create new one
                card = await client.createCard({
                    name: cardName,
                    desc: description,
                    idList: listId,
                    due: scheduledDate || undefined,
                });
                action = 'create_card';
            }
        } else {
            // Create new card
            card = await client.createCard({
                name: cardName,
                desc: description,
                idList: listId,
                due: scheduledDate || undefined,
            });
        }

        // Update or create card mapping
        const mappingData = {
            user_id: userId,
            opportunity_id: opportunityId,
            trello_card_id: card.id,
            trello_board_id: config.board_id,
            trello_list_id: listId,
            last_synced_at: new Date().toISOString(),
            sync_direction: 'to_trello',
        };

        if (existingMapping) {
            await supabase
                .from('trello_card_mappings')
                .update(mappingData)
                .eq('id', existingMapping.id);
        } else {
            await supabase
                .from('trello_card_mappings')
                .insert(mappingData);
        }

        // Log sync action
        await supabase.from('trello_sync_logs').insert({
            user_id: userId,
            action,
            direction: 'to_trello',
            opportunity_id: opportunityId,
            trello_card_id: card.id,
            details: {
                cardName,
                listId,
                status,
            },
            status: 'success',
        });

        return NextResponse.json({
            success: true,
            card: {
                id: card.id,
                name: card.name,
                url: card.url,
                shortUrl: card.shortUrl,
            },
            action,
        });
    } catch (error) {
        console.error('Error in /api/trello/sync-opportunity:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
