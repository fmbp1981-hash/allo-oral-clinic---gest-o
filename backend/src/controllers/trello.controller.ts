import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import trelloService, { TrelloConfig, TrelloListMapping } from '../services/trello.service';
import supabase from '../lib/supabase';
import logger from '../lib/logger';

// Type for Trello config from database
interface TrelloConfigDB {
    id: string;
    tenant_id: string;
    api_key: string;
    token: string;
    board_id: string | null;
    board_name: string | null;
    sync_enabled: boolean;
    list_mapping: TrelloListMapping | null;
    webhook_id: string | null;
    webhook_callback_url: string | null;
    created_at: string;
    updated_at: string;
}

// Helper to access trello_config table (not in generated types yet)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const trelloConfigTable = () => (supabase as any).from('trello_config');

/**
 * Get Trello connection status
 */
export const getStatus = async (req: AuthRequest, res: Response) => {
    try {
        const status = trelloService.getStatus();
        
        // Also get saved config from database if exists
        const tenantId = req.user?.tenantId;
        let savedConfig = null;
        
        if (tenantId) {
            const { data } = await trelloConfigTable()
                .select('board_id, board_name, sync_enabled, list_mapping, created_at, updated_at')
                .eq('tenant_id', tenantId)
                .single();
            
            savedConfig = data as Partial<TrelloConfigDB> | null;
        }

        res.json({
            ...status,
            savedConfig,
        });
    } catch (error: any) {
        logger.error('Error getting Trello status:', error);
        res.status(500).json({ error: 'Error getting Trello status' });
    }
};

/**
 * Test Trello connection with provided credentials
 */
export const testConnection = async (req: AuthRequest, res: Response) => {
    try {
        const { apiKey, token } = req.body;

        if (!apiKey || !token) {
            return res.status(400).json({ error: 'API Key and Token are required' });
        }

        // Temporarily configure service with provided credentials
        trelloService.configure({
            apiKey,
            token,
        });

        const result = await trelloService.testConnection();

        if (result.success) {
            res.json({
                success: true,
                message: 'Conexão com Trello estabelecida com sucesso!',
                user: result.member,
            });
        } else {
            res.status(401).json({
                success: false,
                error: result.error || 'Falha na autenticação com o Trello',
            });
        }
    } catch (error: any) {
        logger.error('Error testing Trello connection:', error);
        res.status(500).json({ error: 'Error testing connection' });
    }
};

/**
 * Save Trello configuration
 */
export const saveConfig = async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.userId;

        if (!tenantId || !userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { apiKey, token, boardId, boardName, syncEnabled, listMapping } = req.body;

        if (!apiKey || !token) {
            return res.status(400).json({ error: 'API Key and Token are required' });
        }

        // Test connection first
        trelloService.configure({ apiKey, token, boardId, listMapping, syncEnabled });
        const testResult = await trelloService.testConnection();

        if (!testResult.success) {
            return res.status(401).json({
                error: 'Credenciais inválidas do Trello',
                details: testResult.error,
            });
        }

        // Check if config exists
        const { data: existing } = await trelloConfigTable()
            .select('id')
            .eq('tenant_id', tenantId)
            .single();

        const configData = {
            tenant_id: tenantId,
            api_key: apiKey,
            token: token,
            board_id: boardId || null,
            board_name: boardName || null,
            sync_enabled: syncEnabled || false,
            list_mapping: listMapping || null,
            updated_at: new Date().toISOString(),
        };

        let savedConfig: TrelloConfigDB;

        if (existing) {
            const { data, error } = await trelloConfigTable()
                .update(configData)
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            savedConfig = data as TrelloConfigDB;
            logger.info('Trello config updated', { tenantId });
        } else {
            const { data, error } = await trelloConfigTable()
                .insert({
                    ...configData,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;
            savedConfig = data as TrelloConfigDB;
            logger.info('Trello config created', { tenantId });
        }

        res.json({
            success: true,
            message: 'Configuração do Trello salva com sucesso!',
            config: {
                boardId: savedConfig.board_id,
                boardName: savedConfig.board_name,
                syncEnabled: savedConfig.sync_enabled,
                listMapping: savedConfig.list_mapping,
            },
        });
    } catch (error: any) {
        logger.error('Error saving Trello config:', error);
        res.status(500).json({ error: 'Error saving configuration' });
    }
};

/**
 * Get all accessible Trello boards
 */
export const getBoards = async (req: AuthRequest, res: Response) => {
    try {
        // Load config from database first
        await loadTenantConfig(req.user?.tenantId);

        if (!trelloService.isConfigured()) {
            return res.status(400).json({ error: 'Trello não está configurado' });
        }

        const boards = await trelloService.getBoards();
        res.json(boards);
    } catch (error: any) {
        logger.error('Error getting Trello boards:', error);
        res.status(500).json({ error: 'Error fetching boards' });
    }
};

/**
 * Get lists from a board
 */
export const getLists = async (req: AuthRequest, res: Response) => {
    try {
        await loadTenantConfig(req.user?.tenantId);

        if (!trelloService.isConfigured()) {
            return res.status(400).json({ error: 'Trello não está configurado' });
        }

        const { boardId } = req.params;
        const lists = await trelloService.getLists(boardId);
        res.json(lists);
    } catch (error: any) {
        logger.error('Error getting Trello lists:', error);
        res.status(500).json({ error: 'Error fetching lists' });
    }
};

/**
 * Get cards from a board or list
 */
export const getCards = async (req: AuthRequest, res: Response) => {
    try {
        await loadTenantConfig(req.user?.tenantId);

        if (!trelloService.isConfigured()) {
            return res.status(400).json({ error: 'Trello não está configurado' });
        }

        const { boardId, listId } = req.query;

        let cards;
        if (listId) {
            cards = await trelloService.getCardsFromList(listId as string);
        } else if (boardId) {
            cards = await trelloService.getCardsFromBoard(boardId as string);
        } else {
            cards = await trelloService.getCardsFromBoard();
        }

        res.json(cards);
    } catch (error: any) {
        logger.error('Error getting Trello cards:', error);
        res.status(500).json({ error: 'Error fetching cards' });
    }
};

/**
 * Create a card on Trello
 */
export const createCard = async (req: AuthRequest, res: Response) => {
    try {
        await loadTenantConfig(req.user?.tenantId);

        if (!trelloService.isConfigured()) {
            return res.status(400).json({ error: 'Trello não está configurado' });
        }

        const { name, desc, listId, due, labels } = req.body;

        if (!name || !listId) {
            return res.status(400).json({ error: 'Nome e ID da lista são obrigatórios' });
        }

        const card = await trelloService.createCard({
            name,
            desc,
            idList: listId,
            due,
            labels,
        });

        res.json(card);
    } catch (error: any) {
        logger.error('Error creating Trello card:', error);
        res.status(500).json({ error: 'Error creating card' });
    }
};

/**
 * Update a card on Trello
 */
export const updateCard = async (req: AuthRequest, res: Response) => {
    try {
        await loadTenantConfig(req.user?.tenantId);

        if (!trelloService.isConfigured()) {
            return res.status(400).json({ error: 'Trello não está configurado' });
        }

        const { cardId } = req.params;
        const updates = req.body;

        const card = await trelloService.updateCard(cardId, updates);
        res.json(card);
    } catch (error: any) {
        logger.error('Error updating Trello card:', error);
        res.status(500).json({ error: 'Error updating card' });
    }
};

/**
 * Move a card to a different list
 */
export const moveCard = async (req: AuthRequest, res: Response) => {
    try {
        await loadTenantConfig(req.user?.tenantId);

        if (!trelloService.isConfigured()) {
            return res.status(400).json({ error: 'Trello não está configurado' });
        }

        const { cardId } = req.params;
        const { listId } = req.body;

        if (!listId) {
            return res.status(400).json({ error: 'ID da lista de destino é obrigatório' });
        }

        const card = await trelloService.moveCard(cardId, listId);
        res.json(card);
    } catch (error: any) {
        logger.error('Error moving Trello card:', error);
        res.status(500).json({ error: 'Error moving card' });
    }
};

/**
 * Delete a card from Trello
 */
export const deleteCard = async (req: AuthRequest, res: Response) => {
    try {
        await loadTenantConfig(req.user?.tenantId);

        if (!trelloService.isConfigured()) {
            return res.status(400).json({ error: 'Trello não está configurado' });
        }

        const { cardId } = req.params;
        await trelloService.deleteCard(cardId);
        res.json({ success: true, message: 'Card deletado com sucesso' });
    } catch (error: any) {
        logger.error('Error deleting Trello card:', error);
        res.status(500).json({ error: 'Error deleting card' });
    }
};

/**
 * Add a comment to a card
 */
export const addComment = async (req: AuthRequest, res: Response) => {
    try {
        await loadTenantConfig(req.user?.tenantId);

        if (!trelloService.isConfigured()) {
            return res.status(400).json({ error: 'Trello não está configurado' });
        }

        const { cardId } = req.params;
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Texto do comentário é obrigatório' });
        }

        const comment = await trelloService.addComment(cardId, text);
        res.json(comment);
    } catch (error: any) {
        logger.error('Error adding comment to Trello card:', error);
        res.status(500).json({ error: 'Error adding comment' });
    }
};

/**
 * Get comments from a card
 */
export const getComments = async (req: AuthRequest, res: Response) => {
    try {
        await loadTenantConfig(req.user?.tenantId);

        if (!trelloService.isConfigured()) {
            return res.status(400).json({ error: 'Trello não está configurado' });
        }

        const { cardId } = req.params;
        const comments = await trelloService.getComments(cardId);
        res.json(comments);
    } catch (error: any) {
        logger.error('Error getting Trello card comments:', error);
        res.status(500).json({ error: 'Error fetching comments' });
    }
};

/**
 * Setup default lists on a board for CRM workflow
 */
export const setupLists = async (req: AuthRequest, res: Response) => {
    try {
        const tenantId = req.user?.tenantId;
        await loadTenantConfig(tenantId);

        if (!trelloService.isConfigured()) {
            return res.status(400).json({ error: 'Trello não está configurado' });
        }

        const { boardId } = req.body;

        if (!boardId) {
            return res.status(400).json({ error: 'ID do board é obrigatório' });
        }

        const listMapping = await trelloService.setupDefaultLists(boardId);

        // Save the mapping to database
        if (tenantId) {
            await trelloConfigTable()
                .update({
                    board_id: boardId,
                    list_mapping: listMapping,
                    updated_at: new Date().toISOString(),
                })
                .eq('tenant_id', tenantId);
        }

        res.json({
            success: true,
            message: 'Listas configuradas com sucesso!',
            listMapping,
        });
    } catch (error: any) {
        logger.error('Error setting up Trello lists:', error);
        res.status(500).json({ error: 'Error setting up lists' });
    }
};

/**
 * Sync opportunity to Trello card
 */
export const syncOpportunity = async (req: AuthRequest, res: Response) => {
    try {
        await loadTenantConfig(req.user?.tenantId);

        if (!trelloService.isConfigured()) {
            return res.status(400).json({ error: 'Trello não está configurado' });
        }

        const { opportunityId, trelloCardId, patientName, patientPhone, keyword, status, notes, scheduledDate } = req.body;

        const opportunityData = {
            id: opportunityId,
            patientName,
            patientPhone,
            keyword,
            status,
            notes,
            scheduledDate,
        };

        let card;

        if (trelloCardId) {
            // Update existing card
            card = await trelloService.updateCardFromOpportunity(trelloCardId, opportunityData);
            logger.info('Synced opportunity to existing Trello card', { opportunityId, trelloCardId });
        } else {
            // Create new card
            card = await trelloService.createCardFromOpportunity(opportunityData);
            logger.info('Created new Trello card for opportunity', { opportunityId, trelloCardId: card?.id });
        }

        res.json({
            success: true,
            card,
        });
    } catch (error: any) {
        logger.error('Error syncing opportunity to Trello:', error);
        res.status(500).json({ error: 'Error syncing opportunity' });
    }
};

/**
 * Handle Trello webhook callback
 */
export const handleWebhook = async (req: AuthRequest, res: Response) => {
    try {
        // Trello sends HEAD request to verify webhook endpoint
        if (req.method === 'HEAD') {
            return res.status(200).end();
        }

        const { action, model } = req.body;

        if (!action) {
            return res.status(200).json({ message: 'No action to process' });
        }

        logger.info('Received Trello webhook', {
            actionType: action.type,
            modelType: model?.modelType,
        });

        // Process different action types
        switch (action.type) {
            case 'updateCard':
                // Card was updated (could be moved to different list)
                if (action.data?.listAfter && action.data?.listBefore) {
                    // Card was moved between lists
                    logger.info('Card moved between lists', {
                        cardId: action.data.card?.id,
                        fromList: action.data.listBefore.name,
                        toList: action.data.listAfter.name,
                    });
                    // Here you would update the opportunity status in the database
                }
                break;

            case 'createCard':
                logger.info('New card created in Trello', {
                    cardId: action.data?.card?.id,
                    listId: action.data?.list?.id,
                });
                break;

            case 'deleteCard':
                logger.info('Card deleted from Trello', {
                    cardId: action.data?.card?.id,
                });
                break;

            case 'commentCard':
                logger.info('Comment added to card', {
                    cardId: action.data?.card?.id,
                    text: action.data?.text,
                });
                break;
        }

        res.status(200).json({ success: true });
    } catch (error: any) {
        logger.error('Error handling Trello webhook:', error);
        res.status(500).json({ error: 'Error processing webhook' });
    }
};

/**
 * Get labels from a board
 */
export const getLabels = async (req: AuthRequest, res: Response) => {
    try {
        await loadTenantConfig(req.user?.tenantId);

        if (!trelloService.isConfigured()) {
            return res.status(400).json({ error: 'Trello não está configurado' });
        }

        const { boardId } = req.params;
        const labels = await trelloService.getLabels(boardId);
        res.json(labels);
    } catch (error: any) {
        logger.error('Error getting Trello labels:', error);
        res.status(500).json({ error: 'Error fetching labels' });
    }
};

/**
 * Helper: Load tenant-specific Trello config
 */
async function loadTenantConfig(tenantId?: string): Promise<void> {
    if (!tenantId) return;

    const { data: config } = await trelloConfigTable()
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

    if (config?.api_key && config?.token) {
        trelloService.configure({
            apiKey: config.api_key,
            token: config.token,
            boardId: config.board_id || undefined,
            listMapping: config.list_mapping || undefined,
            syncEnabled: config.sync_enabled,
        });
    }
}
