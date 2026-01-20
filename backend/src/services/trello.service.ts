/**
 * Trello Integration Service
 * Full bidirectional sync between the system and Trello boards
 * 
 * Features:
 * - Connect to Trello using API Key + Token
 * - Read boards, lists, and cards
 * - Create, update, and move cards
 * - Map local opportunity statuses to Trello lists
 * - Bidirectional sync with conflict resolution
 */

import logger from '../lib/logger';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface TrelloConfig {
    apiKey: string;
    token: string;
    boardId?: string;
    listMapping?: TrelloListMapping;
    syncEnabled?: boolean;
    webhookCallbackUrl?: string;
}

export interface TrelloListMapping {
    NEW: string;          // List ID for new opportunities
    SENT: string;         // List ID for sent/contacted
    RESPONDED: string;    // List ID for responded
    SCHEDULED: string;    // List ID for scheduled
    ARCHIVED: string;     // List ID for archived/done
}

export interface TrelloBoard {
    id: string;
    name: string;
    desc: string;
    url: string;
    closed: boolean;
}

export interface TrelloList {
    id: string;
    name: string;
    idBoard: string;
    closed: boolean;
    pos: number;
}

export interface TrelloCard {
    id: string;
    name: string;
    desc: string;
    idList: string;
    idBoard: string;
    url: string;
    shortUrl: string;
    pos: number;
    due: string | null;
    dueComplete: boolean;
    closed: boolean;
    labels: TrelloLabel[];
    idMembers: string[];
    dateLastActivity: string;
}

export interface TrelloLabel {
    id: string;
    name: string;
    color: string;
}

export interface TrelloWebhook {
    id: string;
    description: string;
    idModel: string;
    callbackURL: string;
    active: boolean;
}

export interface CreateCardParams {
    name: string;
    desc?: string;
    idList: string;
    due?: string;
    labels?: string[];
    pos?: 'top' | 'bottom' | number;
}

export interface UpdateCardParams {
    name?: string;
    desc?: string;
    idList?: string;
    due?: string | null;
    dueComplete?: boolean;
    closed?: boolean;
    pos?: 'top' | 'bottom' | number;
}

export interface SyncResult {
    success: boolean;
    cardsCreated: number;
    cardsUpdated: number;
    cardsMoved: number;
    errors: string[];
}

// ============================================
// TRELLO SERVICE CLASS
// ============================================

class TrelloService {
    private config: TrelloConfig | null = null;
    private readonly baseUrl = 'https://api.trello.com/1';

    constructor() {
        this.loadConfig();
    }

    /**
     * Load configuration from environment variables
     */
    private loadConfig(): void {
        const apiKey = process.env.TRELLO_API_KEY;
        const token = process.env.TRELLO_TOKEN;
        const boardId = process.env.TRELLO_BOARD_ID;

        if (apiKey && token) {
            this.config = {
                apiKey,
                token,
                boardId,
                syncEnabled: process.env.TRELLO_SYNC_ENABLED === 'true',
                webhookCallbackUrl: process.env.TRELLO_WEBHOOK_CALLBACK_URL,
            };

            // Load list mapping if configured
            if (process.env.TRELLO_LIST_NEW || process.env.TRELLO_LIST_MAPPING) {
                try {
                    if (process.env.TRELLO_LIST_MAPPING) {
                        this.config.listMapping = JSON.parse(process.env.TRELLO_LIST_MAPPING);
                    } else {
                        this.config.listMapping = {
                            NEW: process.env.TRELLO_LIST_NEW || '',
                            SENT: process.env.TRELLO_LIST_SENT || '',
                            RESPONDED: process.env.TRELLO_LIST_RESPONDED || '',
                            SCHEDULED: process.env.TRELLO_LIST_SCHEDULED || '',
                            ARCHIVED: process.env.TRELLO_LIST_ARCHIVED || '',
                        };
                    }
                } catch (e) {
                    logger.warn('Failed to parse Trello list mapping');
                }
            }

            logger.info('Trello Service configured successfully');
        } else {
            logger.info('Trello Service not configured - missing API credentials');
        }
    }

    /**
     * Configure the service with new credentials
     */
    public configure(config: TrelloConfig): void {
        this.config = config;
        logger.info('Trello Service reconfigured');
    }

    /**
     * Check if service is configured
     */
    public isConfigured(): boolean {
        return this.config !== null && !!this.config.apiKey && !!this.config.token;
    }

    /**
     * Get current configuration status (safe for client)
     */
    public getStatus(): {
        configured: boolean;
        boardId: string | null;
        syncEnabled: boolean;
        hasListMapping: boolean;
    } {
        return {
            configured: this.isConfigured(),
            boardId: this.config?.boardId || null,
            syncEnabled: this.config?.syncEnabled || false,
            hasListMapping: !!this.config?.listMapping,
        };
    }

    /**
     * Build API URL with auth parameters
     */
    private buildUrl(endpoint: string, params: Record<string, string> = {}): string {
        if (!this.config) throw new Error('Trello Service not configured');

        const url = new URL(`${this.baseUrl}${endpoint}`);
        url.searchParams.set('key', this.config.apiKey);
        url.searchParams.set('token', this.config.token);

        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }

        return url.toString();
    }

    /**
     * Make authenticated API request
     */
    private async request<T>(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        endpoint: string,
        body?: Record<string, any>,
        params: Record<string, string> = {}
    ): Promise<T> {
        if (!this.config) {
            throw new Error('Trello Service not configured. Please configure API Key and Token.');
        }

        const url = this.buildUrl(endpoint, params);

        const options: RequestInit = {
            method,
            headers: {
                'Accept': 'application/json',
            },
        };

        if (body && (method === 'POST' || method === 'PUT')) {
            options.headers = {
                ...options.headers,
                'Content-Type': 'application/json',
            };
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                const errorText = await response.text();
                logger.error('Trello API Error', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText,
                    endpoint,
                });
                throw new Error(`Trello API Error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            return data as T;
        } catch (error: any) {
            logger.error('Trello Request Failed', { error: error.message, endpoint });
            throw error;
        }
    }

    // ============================================
    // BOARDS
    // ============================================

    /**
     * Get all boards accessible by the user
     */
    public async getBoards(): Promise<TrelloBoard[]> {
        return this.request<TrelloBoard[]>('GET', '/members/me/boards', undefined, {
            filter: 'open',
            fields: 'id,name,desc,url,closed',
        });
    }

    /**
     * Get a specific board by ID
     */
    public async getBoard(boardId: string): Promise<TrelloBoard> {
        return this.request<TrelloBoard>('GET', `/boards/${boardId}`);
    }

    // ============================================
    // LISTS
    // ============================================

    /**
     * Get all lists from a board
     */
    public async getLists(boardId?: string): Promise<TrelloList[]> {
        const id = boardId || this.config?.boardId;
        if (!id) throw new Error('Board ID not provided');

        return this.request<TrelloList[]>('GET', `/boards/${id}/lists`, undefined, {
            filter: 'open',
            fields: 'id,name,idBoard,closed,pos',
        });
    }

    /**
     * Create a new list on a board
     */
    public async createList(name: string, boardId?: string): Promise<TrelloList> {
        const id = boardId || this.config?.boardId;
        if (!id) throw new Error('Board ID not provided');

        return this.request<TrelloList>('POST', '/lists', {
            name,
            idBoard: id,
            pos: 'bottom',
        });
    }

    // ============================================
    // CARDS
    // ============================================

    /**
     * Get all cards from a list
     */
    public async getCardsFromList(listId: string): Promise<TrelloCard[]> {
        return this.request<TrelloCard[]>('GET', `/lists/${listId}/cards`, undefined, {
            fields: 'id,name,desc,idList,idBoard,url,shortUrl,pos,due,dueComplete,closed,labels,idMembers,dateLastActivity',
        });
    }

    /**
     * Get all cards from a board
     */
    public async getCardsFromBoard(boardId?: string): Promise<TrelloCard[]> {
        const id = boardId || this.config?.boardId;
        if (!id) throw new Error('Board ID not provided');

        return this.request<TrelloCard[]>('GET', `/boards/${id}/cards`, undefined, {
            fields: 'id,name,desc,idList,idBoard,url,shortUrl,pos,due,dueComplete,closed,labels,idMembers,dateLastActivity',
        });
    }

    /**
     * Get a specific card by ID
     */
    public async getCard(cardId: string): Promise<TrelloCard> {
        return this.request<TrelloCard>('GET', `/cards/${cardId}`, undefined, {
            fields: 'id,name,desc,idList,idBoard,url,shortUrl,pos,due,dueComplete,closed,labels,idMembers,dateLastActivity',
        });
    }

    /**
     * Create a new card
     */
    public async createCard(params: CreateCardParams): Promise<TrelloCard> {
        const body: Record<string, any> = {
            name: params.name,
            idList: params.idList,
        };

        if (params.desc) body.desc = params.desc;
        if (params.due) body.due = params.due;
        if (params.pos) body.pos = params.pos;
        if (params.labels) body.idLabels = params.labels.join(',');

        return this.request<TrelloCard>('POST', '/cards', body);
    }

    /**
     * Update an existing card
     */
    public async updateCard(cardId: string, params: UpdateCardParams): Promise<TrelloCard> {
        return this.request<TrelloCard>('PUT', `/cards/${cardId}`, params);
    }

    /**
     * Move a card to a different list
     */
    public async moveCard(cardId: string, listId: string): Promise<TrelloCard> {
        return this.updateCard(cardId, { idList: listId });
    }

    /**
     * Archive (close) a card
     */
    public async archiveCard(cardId: string): Promise<TrelloCard> {
        return this.updateCard(cardId, { closed: true });
    }

    /**
     * Delete a card permanently
     */
    public async deleteCard(cardId: string): Promise<void> {
        await this.request<void>('DELETE', `/cards/${cardId}`);
    }

    /**
     * Add a comment to a card
     */
    public async addComment(cardId: string, text: string): Promise<{ id: string; data: { text: string } }> {
        return this.request('POST', `/cards/${cardId}/actions/comments`, { text });
    }

    /**
     * Get comments from a card
     */
    public async getComments(cardId: string): Promise<Array<{ id: string; data: { text: string }; date: string; memberCreator: { fullName: string } }>> {
        return this.request('GET', `/cards/${cardId}/actions`, undefined, {
            filter: 'commentCard',
        });
    }

    // ============================================
    // WEBHOOKS
    // ============================================

    /**
     * Create a webhook for a board or card
     */
    public async createWebhook(
        modelId: string,
        callbackUrl: string,
        description: string = 'CRM Sync Webhook'
    ): Promise<TrelloWebhook> {
        return this.request<TrelloWebhook>('POST', '/webhooks', {
            idModel: modelId,
            callbackURL: callbackUrl,
            description,
        });
    }

    /**
     * Get all webhooks for the current token
     */
    public async getWebhooks(): Promise<TrelloWebhook[]> {
        if (!this.config?.token) throw new Error('Token not configured');
        return this.request<TrelloWebhook[]>('GET', `/tokens/${this.config.token}/webhooks`);
    }

    /**
     * Delete a webhook
     */
    public async deleteWebhook(webhookId: string): Promise<void> {
        await this.request<void>('DELETE', `/webhooks/${webhookId}`);
    }

    // ============================================
    // LABELS
    // ============================================

    /**
     * Get all labels from a board
     */
    public async getLabels(boardId?: string): Promise<TrelloLabel[]> {
        const id = boardId || this.config?.boardId;
        if (!id) throw new Error('Board ID not provided');

        return this.request<TrelloLabel[]>('GET', `/boards/${id}/labels`);
    }

    /**
     * Create a new label on a board
     */
    public async createLabel(name: string, color: string, boardId?: string): Promise<TrelloLabel> {
        const id = boardId || this.config?.boardId;
        if (!id) throw new Error('Board ID not provided');

        return this.request<TrelloLabel>('POST', '/labels', {
            name,
            color,
            idBoard: id,
        });
    }

    // ============================================
    // SYNC UTILITIES
    // ============================================

    /**
     * Map opportunity status to Trello list ID
     */
    public getListIdForStatus(status: string): string | null {
        if (!this.config?.listMapping) return null;

        const mapping = this.config.listMapping;
        switch (status.toUpperCase()) {
            case 'NEW':
                return mapping.NEW || null;
            case 'SENT':
                return mapping.SENT || null;
            case 'RESPONDED':
                return mapping.RESPONDED || null;
            case 'SCHEDULED':
                return mapping.SCHEDULED || null;
            case 'ARCHIVED':
                return mapping.ARCHIVED || null;
            default:
                return null;
        }
    }

    /**
     * Map Trello list ID to opportunity status
     */
    public getStatusForListId(listId: string): string | null {
        if (!this.config?.listMapping) return null;

        const mapping = this.config.listMapping;
        if (listId === mapping.NEW) return 'NEW';
        if (listId === mapping.SENT) return 'SENT';
        if (listId === mapping.RESPONDED) return 'RESPONDED';
        if (listId === mapping.SCHEDULED) return 'SCHEDULED';
        if (listId === mapping.ARCHIVED) return 'ARCHIVED';
        return null;
    }

    /**
     * Setup default lists on a board for the CRM workflow
     */
    public async setupDefaultLists(boardId: string): Promise<TrelloListMapping> {
        logger.info('Setting up default Trello lists for CRM workflow...');

        const statuses = ['NEW', 'SENT', 'RESPONDED', 'SCHEDULED', 'ARCHIVED'];
        const listNames: Record<string, string> = {
            NEW: '📥 Novos Leads',
            SENT: '📤 Mensagem Enviada',
            RESPONDED: '💬 Respondeu',
            SCHEDULED: '📅 Agendado',
            ARCHIVED: '✅ Arquivado',
        };

        const mapping: TrelloListMapping = {
            NEW: '',
            SENT: '',
            RESPONDED: '',
            SCHEDULED: '',
            ARCHIVED: '',
        };

        // Get existing lists
        const existingLists = await this.getLists(boardId);
        const existingNames = existingLists.map(l => l.name.toLowerCase());

        for (const status of statuses) {
            const listName = listNames[status];
            const existingList = existingLists.find(
                l => l.name.toLowerCase() === listName.toLowerCase()
            );

            if (existingList) {
                mapping[status as keyof TrelloListMapping] = existingList.id;
                logger.info(`Found existing list: ${listName}`);
            } else {
                const newList = await this.createList(listName, boardId);
                mapping[status as keyof TrelloListMapping] = newList.id;
                logger.info(`Created list: ${listName}`);
            }
        }

        // Update config with new mapping
        if (this.config) {
            this.config.listMapping = mapping;
            this.config.boardId = boardId;
        }

        return mapping;
    }

    /**
     * Create a Trello card from an opportunity
     */
    public async createCardFromOpportunity(opportunity: {
        id: string;
        patientName: string;
        patientPhone: string;
        keyword: string;
        status: string;
        notes?: string;
        scheduledDate?: string;
    }): Promise<TrelloCard | null> {
        const listId = this.getListIdForStatus(opportunity.status);
        if (!listId) {
            logger.warn(`No list mapping for status: ${opportunity.status}`);
            return null;
        }

        const description = [
            `**Paciente:** ${opportunity.patientName}`,
            `**Telefone:** ${opportunity.patientPhone}`,
            `**Palavra-chave:** ${opportunity.keyword}`,
            `**ID Sistema:** ${opportunity.id}`,
            opportunity.notes ? `\n**Notas:**\n${opportunity.notes}` : '',
        ].filter(Boolean).join('\n');

        const card = await this.createCard({
            name: `${opportunity.patientName} - ${opportunity.keyword}`,
            desc: description,
            idList: listId,
            due: opportunity.scheduledDate,
        });

        logger.info(`Created Trello card for opportunity ${opportunity.id}`, { cardId: card.id });
        return card;
    }

    /**
     * Update Trello card when opportunity changes
     */
    public async updateCardFromOpportunity(
        cardId: string,
        opportunity: {
            patientName: string;
            patientPhone: string;
            keyword: string;
            status: string;
            notes?: string;
            scheduledDate?: string;
        }
    ): Promise<TrelloCard> {
        const listId = this.getListIdForStatus(opportunity.status);

        const description = [
            `**Paciente:** ${opportunity.patientName}`,
            `**Telefone:** ${opportunity.patientPhone}`,
            `**Palavra-chave:** ${opportunity.keyword}`,
            opportunity.notes ? `\n**Notas:**\n${opportunity.notes}` : '',
        ].filter(Boolean).join('\n');

        const params: UpdateCardParams = {
            name: `${opportunity.patientName} - ${opportunity.keyword}`,
            desc: description,
        };

        if (listId) {
            params.idList = listId;
        }

        if (opportunity.scheduledDate) {
            params.due = opportunity.scheduledDate;
        }

        return this.updateCard(cardId, params);
    }

    /**
     * Verify API connection by fetching user info
     */
    public async testConnection(): Promise<{ success: boolean; member?: { fullName: string; username: string }; error?: string }> {
        try {
            const member = await this.request<{ fullName: string; username: string }>('GET', '/members/me', undefined, {
                fields: 'fullName,username',
            });
            return { success: true, member };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}

// Export singleton instance
export const trelloService = new TrelloService();
export default trelloService;
