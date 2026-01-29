import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient, isNotFoundError } from '../../lib/supabase';
import {
    TrelloClient,
    TrelloListMapping,
    buildCardDescription,
    getListIdFromStatus,
} from '../../lib/trello';

/**
 * POST /api/trello/sync-opportunity
 * Sync an opportunity to Trello (create or update card)
 */
export async function POST(request: NextRequest) {
    try {
        const auth = validateAuthHeader(request);
        if (isAuthError(auth)) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const { userId } = auth.data;

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
                { error: 'opportunityId, patientName e status são obrigatórios' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseClient();

        // Get Trello config
        const { data: config, error: configError } = await supabase
            .from('trello_config')
            .select('*')
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
                { error: 'Trello não configurado' },
                { status: 400 }
            );
        }

        if (!config.board_id || !config.list_mapping) {
            return NextResponse.json(
                { error: 'Board do Trello não configurado. Configure as listas primeiro.' },
                { status: 400 }
            );
        }

        const listMapping = config.list_mapping as TrelloListMapping;
        const client = new TrelloClient(config.api_key, config.token);

        // Get target list based on status
        const listId = getListIdFromStatus(status, listMapping);
        if (!listId) {
            return NextResponse.json(
                { error: `Nenhuma lista mapeada para o status: ${status}` },
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
            { error: 'Erro ao sincronizar com Trello' },
            { status: 500 }
        );
    }
}
