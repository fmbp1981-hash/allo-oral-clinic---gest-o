/**
 * Trello API Helper Library
 * Centralizes all Trello API calls and utilities for Next.js API Routes
 */

// ============================================
// TYPES
// ============================================

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

export interface TrelloMember {
    id: string;
    fullName: string;
    username: string;
}

export interface TrelloListMapping {
    NEW: string;
    SENT: string;
    RESPONDED: string;
    SCHEDULED: string;
    ARCHIVED: string;
}

export interface TrelloConfig {
    id?: string;
    user_id: string;
    api_key: string;
    token: string;
    board_id?: string;
    board_name?: string;
    sync_enabled: boolean;
    list_mapping: TrelloListMapping;
    webhook_id?: string;
}

export interface TrelloCardMapping {
    id?: string;
    user_id: string;
    opportunity_id: string;
    trello_card_id: string;
    trello_board_id: string;
    trello_list_id?: string;
    last_synced_at?: string;
    sync_direction?: 'to_trello' | 'from_trello' | 'bidirectional';
}

// ============================================
// TRELLO API CLIENT
// ============================================

const TRELLO_API_BASE = 'https://api.trello.com/1';

export class TrelloClient {
    private apiKey: string;
    private token: string;

    constructor(apiKey: string, token: string) {
        this.apiKey = apiKey;
        this.token = token;
    }

    private async request<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
        body?: Record<string, unknown>
    ): Promise<T> {
        const url = new URL(`${TRELLO_API_BASE}${endpoint}`);
        url.searchParams.set('key', this.apiKey);
        url.searchParams.set('token', this.token);

        const options: RequestInit = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (body && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url.toString(), options);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Trello API Error: ${response.status} - ${errorText}`);
        }

        return response.json();
    }

    // ============================================
    // MEMBER (USER) ENDPOINTS
    // ============================================

    async getMe(): Promise<TrelloMember> {
        return this.request<TrelloMember>('/members/me');
    }

    async testConnection(): Promise<{ success: boolean; user: TrelloMember }> {
        try {
            const user = await this.getMe();
            return { success: true, user };
        } catch (error) {
            throw new Error('Failed to connect to Trello. Please check your API Key and Token.');
        }
    }

    // ============================================
    // BOARD ENDPOINTS
    // ============================================

    async getBoards(): Promise<TrelloBoard[]> {
        return this.request<TrelloBoard[]>('/members/me/boards?filter=open');
    }

    async getBoard(boardId: string): Promise<TrelloBoard> {
        return this.request<TrelloBoard>(`/boards/${boardId}`);
    }

    // ============================================
    // LIST ENDPOINTS
    // ============================================

    async getLists(boardId: string): Promise<TrelloList[]> {
        return this.request<TrelloList[]>(`/boards/${boardId}/lists?filter=open`);
    }

    async createList(boardId: string, name: string, pos?: number): Promise<TrelloList> {
        const body: Record<string, unknown> = { name, idBoard: boardId };
        if (pos !== undefined) body.pos = pos;
        return this.request<TrelloList>('/lists', 'POST', body);
    }

    // ============================================
    // CARD ENDPOINTS
    // ============================================

    async getCards(options: { boardId?: string; listId?: string }): Promise<TrelloCard[]> {
        if (options.listId) {
            return this.request<TrelloCard[]>(`/lists/${options.listId}/cards`);
        }
        if (options.boardId) {
            return this.request<TrelloCard[]>(`/boards/${options.boardId}/cards`);
        }
        throw new Error('Either boardId or listId is required');
    }

    async getCard(cardId: string): Promise<TrelloCard> {
        return this.request<TrelloCard>(`/cards/${cardId}`);
    }

    async createCard(params: {
        name: string;
        desc?: string;
        idList: string;
        due?: string;
        pos?: number | 'top' | 'bottom';
    }): Promise<TrelloCard> {
        return this.request<TrelloCard>('/cards', 'POST', params as Record<string, unknown>);
    }

    async updateCard(
        cardId: string,
        updates: {
            name?: string;
            desc?: string;
            idList?: string;
            due?: string | null;
            dueComplete?: boolean;
            closed?: boolean;
            pos?: number | 'top' | 'bottom';
        }
    ): Promise<TrelloCard> {
        return this.request<TrelloCard>(`/cards/${cardId}`, 'PUT', updates as Record<string, unknown>);
    }

    async moveCard(cardId: string, listId: string): Promise<TrelloCard> {
        return this.updateCard(cardId, { idList: listId });
    }

    async deleteCard(cardId: string): Promise<void> {
        await this.request(`/cards/${cardId}`, 'DELETE');
    }

    // ============================================
    // COMMENT ENDPOINTS
    // ============================================

    async getCardComments(cardId: string): Promise<Array<{
        id: string;
        data: { text: string };
        date: string;
        memberCreator: { fullName: string };
    }>> {
        return this.request(`/cards/${cardId}/actions?filter=commentCard`);
    }

    async addCardComment(cardId: string, text: string): Promise<{ id: string; data: { text: string } }> {
        return this.request(`/cards/${cardId}/actions/comments`, 'POST', { text });
    }

    // ============================================
    // LABEL ENDPOINTS
    // ============================================

    async getLabels(boardId: string): Promise<TrelloLabel[]> {
        return this.request<TrelloLabel[]>(`/boards/${boardId}/labels`);
    }

    // ============================================
    // WEBHOOK ENDPOINTS
    // ============================================

    async createWebhook(callbackURL: string, idModel: string, description?: string): Promise<{
        id: string;
        description: string;
        idModel: string;
        callbackURL: string;
        active: boolean;
    }> {
        return this.request('/webhooks', 'POST', {
            callbackURL,
            idModel,
            description: description || 'Allo Oral Clinic Sync',
        });
    }

    async deleteWebhook(webhookId: string): Promise<void> {
        await this.request(`/webhooks/${webhookId}`, 'DELETE');
    }

    async getWebhooks(): Promise<Array<{
        id: string;
        description: string;
        idModel: string;
        callbackURL: string;
        active: boolean;
    }>> {
        return this.request(`/tokens/${this.token}/webhooks`);
    }
}

// ============================================
// DEFAULT LIST NAMES
// ============================================

export const DEFAULT_LIST_NAMES: Record<keyof TrelloListMapping, string> = {
    NEW: '📥 Novos Leads',
    SENT: '📤 Mensagem Enviada',
    RESPONDED: '💬 Respondeu',
    SCHEDULED: '📅 Agendado',
    ARCHIVED: '✅ Arquivado',
};

// ============================================
// HELPER: Setup default lists on a board
// ============================================

export async function setupDefaultLists(
    client: TrelloClient,
    boardId: string
): Promise<TrelloListMapping> {
    // Get existing lists
    const existingLists = await client.getLists(boardId);
    const listMapping: Partial<TrelloListMapping> = {};

    // Check for each list or create it
    const statuses: (keyof TrelloListMapping)[] = ['ARCHIVED', 'SCHEDULED', 'RESPONDED', 'SENT', 'NEW'];

    for (const status of statuses) {
        const expectedName = DEFAULT_LIST_NAMES[status];
        const existing = existingLists.find(
            (l) => l.name.toLowerCase() === expectedName.toLowerCase() ||
                   l.name.toLowerCase().includes(status.toLowerCase())
        );

        if (existing) {
            listMapping[status] = existing.id;
        } else {
            // Create the list (at the top, so they appear in order)
            const newList = await client.createList(boardId, expectedName, 'top' as unknown as number);
            listMapping[status] = newList.id;
        }
    }

    return listMapping as TrelloListMapping;
}

// ============================================
// HELPER: Parse card description for opportunity data
// ============================================

export interface OpportunityFromCard {
    patientName?: string;
    patientPhone?: string;
    keyword?: string;
    notes?: string;
    opportunityId?: string;
}

export function parseCardDescription(desc: string): OpportunityFromCard {
    const data: OpportunityFromCard = {};

    // Extract data from description format:
    // ---
    // 📱 Telefone: +55 11 99999-9999
    // 🔍 Busca: Implante
    // 📝 Notas: Interessado em orçamento
    // 🔗 ID: uuid-here
    // ---

    const phoneMatch = desc.match(/📱\s*Telefone:\s*([^\n]+)/i);
    if (phoneMatch) data.patientPhone = phoneMatch[1].trim();

    const keywordMatch = desc.match(/🔍\s*Busca:\s*([^\n]+)/i);
    if (keywordMatch) data.keyword = keywordMatch[1].trim();

    const notesMatch = desc.match(/📝\s*Notas:\s*([^\n]+)/i);
    if (notesMatch) data.notes = notesMatch[1].trim();

    const idMatch = desc.match(/🔗\s*ID:\s*([^\n]+)/i);
    if (idMatch) data.opportunityId = idMatch[1].trim();

    // Name is usually the card title, not in description
    return data;
}

// ============================================
// HELPER: Build card description from opportunity
// ============================================

export function buildCardDescription(opportunity: {
    phone?: string;
    keyword?: string;
    notes?: string;
    opportunityId?: string;
}): string {
    const lines = ['---'];

    if (opportunity.phone) {
        lines.push(`📱 Telefone: ${opportunity.phone}`);
    }
    if (opportunity.keyword) {
        lines.push(`🔍 Busca: ${opportunity.keyword}`);
    }
    if (opportunity.notes) {
        lines.push(`📝 Notas: ${opportunity.notes}`);
    }
    if (opportunity.opportunityId) {
        lines.push(`🔗 ID: ${opportunity.opportunityId}`);
    }

    lines.push('---');
    lines.push('');
    lines.push('🔄 Sincronizado com Allo Oral Clinic');

    return lines.join('\n');
}

// ============================================
// HELPER: Map Trello list to opportunity status
// ============================================

export function getStatusFromListId(
    listId: string,
    listMapping: TrelloListMapping
): keyof TrelloListMapping | null {
    for (const [status, mappedListId] of Object.entries(listMapping)) {
        if (mappedListId === listId) {
            return status as keyof TrelloListMapping;
        }
    }
    return null;
}

// ============================================
// HELPER: Get list ID from opportunity status
// ============================================

export function getListIdFromStatus(
    status: string,
    listMapping: TrelloListMapping
): string | null {
    const statusKey = status.toUpperCase() as keyof TrelloListMapping;
    return listMapping[statusKey] || null;
}
