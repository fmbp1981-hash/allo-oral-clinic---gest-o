import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    TrelloClient,
    TrelloListMapping,
    parseCardDescription,
    getStatusFromListId,
} from '../../lib/trello';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Use any type for Supabase client to avoid complex type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

interface TrelloWebhookConfig {
    id: string;
    user_id: string;
    api_key: string;
    token: string;
    board_id: string;
    list_mapping: TrelloListMapping;
}

interface TrelloCardMapping {
    id: string;
    opportunity_id: string;
    trello_card_id: string;
}

/**
 * HEAD /api/trello/webhook
 * Trello webhook verification (Trello sends HEAD request to verify callback URL)
 */
export async function HEAD() {
    return new NextResponse(null, { status: 200 });
}

/**
 * GET /api/trello/webhook
 * Also needed for Trello webhook verification
 */
export async function GET() {
    return new NextResponse('Webhook endpoint active', { status: 200 });
}

/**
 * POST /api/trello/webhook
 * Handle Trello webhook events for bidirectional sync
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Trello webhook payload structure
        const { action, model } = body;

        if (!action || !model) {
            // This might be a verification request
            return new NextResponse('OK', { status: 200 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get the board ID from the webhook
        const boardId = model.id || action.data?.board?.id;

        if (!boardId) {
            console.log('Webhook received but no board ID found');
            return new NextResponse('OK', { status: 200 });
        }

        // Find user(s) with this board configured
        const { data: configs, error: configError } = await supabase
            .from('trello_config')
            .select('*')
            .eq('board_id', boardId)
            .eq('sync_enabled', true);

        if (configError || !configs || configs.length === 0) {
            console.log('No active sync config found for board:', boardId);
            return new NextResponse('OK', { status: 200 });
        }

        // Process each user's sync
        for (const config of configs) {
            await processWebhookForUser(supabase, config as TrelloWebhookConfig, action);
        }

        return new NextResponse('OK', { status: 200 });
    } catch (error) {
        console.error('Error processing Trello webhook:', error);
        // Always return 200 to Trello to prevent retry storms
        return new NextResponse('OK', { status: 200 });
    }
}

/**
 * Process webhook action for a specific user
 */
async function processWebhookForUser(
    supabase: SupabaseClient,
    config: TrelloWebhookConfig,
    action: {
        type: string;
        data: {
            card?: {
                id: string;
                name: string;
                desc?: string;
                idList?: string;
            };
            listBefore?: { id: string; name: string };
            listAfter?: { id: string; name: string };
            old?: Record<string, unknown>;
        };
        memberCreator?: { fullName: string };
    }
) {
    const actionType = action.type;
    const cardData = action.data?.card;

    if (!cardData) {
        return; // No card data, skip
    }

    const client = new TrelloClient(config.api_key, config.token);

    try {
        switch (actionType) {
            case 'createCard':
                await handleCardCreated(supabase, config, cardData, client);
                break;

            case 'updateCard':
                if (action.data?.listBefore && action.data?.listAfter) {
                    // Card was moved to a different list
                    await handleCardMoved(supabase, config, cardData, action.data.listAfter.id);
                } else if (action.data?.old) {
                    // Card details were updated
                    await handleCardUpdated(supabase, config, cardData, client);
                }
                break;

            case 'deleteCard':
                await handleCardDeleted(supabase, config, cardData.id);
                break;

            case 'commentCard':
                // Could add comment sync if needed
                break;

            default:
                // Ignore other action types
                break;
        }
    } catch (error) {
        console.error(`Error processing action ${actionType}:`, error);

        // Log the error
        await supabase.from('trello_sync_logs').insert({
            user_id: config.user_id,
            action: actionType,
            direction: 'from_trello',
            trello_card_id: cardData.id,
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            details: { cardData },
        });
    }
}

/**
 * Handle new card created in Trello → Create opportunity
 */
async function handleCardCreated(
    supabase: SupabaseClient,
    config: TrelloWebhookConfig,
    cardData: { id: string; name: string; desc?: string; idList?: string },
    client: TrelloClient
) {
    // Check if we already have this card mapped (it might have been created by us)
    const { data: existingMapping } = await supabase
        .from('trello_card_mappings')
        .select('*')
        .eq('trello_card_id', cardData.id)
        .single();

    if (existingMapping) {
        // Card was created by our system, ignore
        return;
    }

    // Get full card details
    const fullCard = await client.getCard(cardData.id);

    // Parse card description for any existing data
    const parsedData = parseCardDescription(fullCard.desc || '');

    // If card has our ID marker, it was created by us (edge case)
    if (parsedData.opportunityId) {
        return;
    }

    // Determine status from list
    const status = getStatusFromListId(fullCard.idList, config.list_mapping) || 'NEW';

    // Create new opportunity in database
    const opportunityData = {
        user_id: config.user_id,
        patient_name: fullCard.name.split(' - ')[0].trim(), // Remove any date suffix
        patient_phone: parsedData.patientPhone || '',
        keyword: parsedData.keyword || 'Trello',
        status: status,
        notes: parsedData.notes || `Imported from Trello: ${fullCard.name}`,
        scheduled_date: fullCard.due ? new Date(fullCard.due) : null,
        created_from: 'trello',
    };

    const { data: newOpportunity, error: insertError } = await supabase
        .from('opportunities')
        .insert(opportunityData)
        .select()
        .single();

    if (insertError || !newOpportunity) {
        console.error('Failed to create opportunity from Trello card:', insertError);
        throw insertError || new Error('Failed to create opportunity');
    }

    // Create mapping
    await supabase.from('trello_card_mappings').insert({
        user_id: config.user_id,
        opportunity_id: newOpportunity.id,
        trello_card_id: cardData.id,
        trello_board_id: config.board_id,
        trello_list_id: fullCard.idList,
        sync_direction: 'from_trello',
    });

    // Log sync
    await supabase.from('trello_sync_logs').insert({
        user_id: config.user_id,
        action: 'create_opportunity',
        direction: 'from_trello',
        opportunity_id: newOpportunity.id,
        trello_card_id: cardData.id,
        details: { cardName: fullCard.name, status },
        status: 'success',
    });

    console.log(`Created opportunity ${newOpportunity.id} from Trello card ${cardData.id}`);
}

/**
 * Handle card moved to different list → Update opportunity status
 */
async function handleCardMoved(
    supabase: SupabaseClient,
    config: TrelloWebhookConfig,
    cardData: { id: string; name: string },
    newListId: string
) {
    // Find the opportunity mapped to this card
    const { data: mapping } = await supabase
        .from('trello_card_mappings')
        .select('*')
        .eq('trello_card_id', cardData.id)
        .single();

    if (!mapping) {
        // Card not tracked, might want to create opportunity
        return;
    }

    const typedMapping = mapping as TrelloCardMapping;

    // Get new status from list
    const newStatus = getStatusFromListId(newListId, config.list_mapping);
    if (!newStatus) {
        console.log(`List ${newListId} not mapped to any status`);
        return;
    }

    // Update opportunity status
    const { error: updateError } = await supabase
        .from('opportunities')
        .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
        })
        .eq('id', typedMapping.opportunity_id);

    if (updateError) {
        console.error('Failed to update opportunity status:', updateError);
        throw updateError;
    }

    // Update mapping
    await supabase
        .from('trello_card_mappings')
        .update({
            trello_list_id: newListId,
            last_synced_at: new Date().toISOString(),
        })
        .eq('id', typedMapping.id);

    // Log sync
    await supabase.from('trello_sync_logs').insert({
        user_id: config.user_id,
        action: 'update_opportunity',
        direction: 'from_trello',
        opportunity_id: typedMapping.opportunity_id,
        trello_card_id: cardData.id,
        details: { newStatus, newListId },
        status: 'success',
    });

    console.log(`Updated opportunity ${typedMapping.opportunity_id} status to ${newStatus}`);
}

/**
 * Handle card updated → Update opportunity details
 */
async function handleCardUpdated(
    supabase: SupabaseClient,
    config: TrelloWebhookConfig,
    cardData: { id: string; name: string; desc?: string },
    client: TrelloClient
) {
    // Find the opportunity mapped to this card
    const { data: mapping } = await supabase
        .from('trello_card_mappings')
        .select('*')
        .eq('trello_card_id', cardData.id)
        .single();

    if (!mapping) {
        return; // Card not tracked
    }

    const typedMapping = mapping as TrelloCardMapping;

    // Get full card details
    const fullCard = await client.getCard(cardData.id);

    // Parse card for data
    const parsedData = parseCardDescription(fullCard.desc || '');

    // Update opportunity
    const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    // Update name if changed (remove date suffix)
    const newName = fullCard.name.split(' - ')[0].trim();
    if (newName) {
        updates.patient_name = newName;
    }

    // Update phone if in description
    if (parsedData.patientPhone) {
        updates.patient_phone = parsedData.patientPhone;
    }

    // Update notes if in description
    if (parsedData.notes) {
        updates.notes = parsedData.notes;
    }

    // Update scheduled date if changed
    if (fullCard.due) {
        updates.scheduled_date = fullCard.due;
    }

    const { error: updateError } = await supabase
        .from('opportunities')
        .update(updates)
        .eq('id', typedMapping.opportunity_id);

    if (updateError) {
        console.error('Failed to update opportunity:', updateError);
        throw updateError;
    }

    // Update mapping
    await supabase
        .from('trello_card_mappings')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', typedMapping.id);

    // Log sync
    await supabase.from('trello_sync_logs').insert({
        user_id: config.user_id,
        action: 'update_opportunity',
        direction: 'from_trello',
        opportunity_id: typedMapping.opportunity_id,
        trello_card_id: cardData.id,
        details: { updates },
        status: 'success',
    });

    console.log(`Updated opportunity ${typedMapping.opportunity_id} from Trello`);
}

/**
 * Handle card deleted → Archive opportunity or remove mapping
 */
async function handleCardDeleted(
    supabase: SupabaseClient,
    config: TrelloWebhookConfig,
    cardId: string
) {
    // Find the opportunity mapped to this card
    const { data: mapping } = await supabase
        .from('trello_card_mappings')
        .select('*')
        .eq('trello_card_id', cardId)
        .single();

    if (!mapping) {
        return; // Card not tracked
    }

    const typedMapping = mapping as TrelloCardMapping;

    // Option 1: Archive the opportunity (safer)
    await supabase
        .from('opportunities')
        .update({
            status: 'ARCHIVED',
            updated_at: new Date().toISOString(),
        })
        .eq('id', typedMapping.opportunity_id);

    // Remove mapping
    await supabase
        .from('trello_card_mappings')
        .delete()
        .eq('id', typedMapping.id);

    // Log sync
    await supabase.from('trello_sync_logs').insert({
        user_id: config.user_id,
        action: 'archive_opportunity',
        direction: 'from_trello',
        opportunity_id: typedMapping.opportunity_id,
        trello_card_id: cardId,
        details: { reason: 'Card deleted from Trello' },
        status: 'success',
    });

    console.log(`Archived opportunity ${typedMapping.opportunity_id} (Trello card deleted)`);
}
