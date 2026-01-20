/**
 * Trello Integration Service - Frontend
 * Handles all Trello-related API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

export interface TrelloListMapping {
    NEW: string;
    SENT: string;
    RESPONDED: string;
    SCHEDULED: string;
    ARCHIVED: string;
}

export interface TrelloConfig {
    apiKey: string;
    token: string;
    boardId?: string;
    boardName?: string;
    syncEnabled?: boolean;
    listMapping?: TrelloListMapping;
}

export interface TrelloStatus {
    configured: boolean;
    boardId: string | null;
    syncEnabled: boolean;
    hasListMapping: boolean;
    savedConfig?: {
        board_id: string;
        board_name: string;
        sync_enabled: boolean;
        list_mapping: TrelloListMapping;
        created_at: string;
        updated_at: string;
    };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || error.message || 'Request failed');
    }
    return response.json();
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get Trello connection status
 */
export async function getTrelloStatus(): Promise<TrelloStatus> {
    const response = await fetch(`${API_BASE_URL}/api/trello/status`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<TrelloStatus>(response);
}

/**
 * Test Trello connection with provided credentials
 */
export async function testTrelloConnection(
    apiKey: string,
    token: string
): Promise<{ success: boolean; user?: { fullName: string; username: string }; error?: string }> {
    const response = await fetch(`${API_BASE_URL}/api/trello/test-connection`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ apiKey, token }),
    });
    return handleResponse(response);
}

/**
 * Save Trello configuration
 */
export async function saveTrelloConfig(config: TrelloConfig): Promise<{
    success: boolean;
    message: string;
    config: {
        boardId: string;
        boardName: string;
        syncEnabled: boolean;
        listMapping: TrelloListMapping;
    };
}> {
    const response = await fetch(`${API_BASE_URL}/api/trello/config`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(config),
    });
    return handleResponse(response);
}

/**
 * Get all accessible Trello boards
 */
export async function getTrelloBoards(): Promise<TrelloBoard[]> {
    const response = await fetch(`${API_BASE_URL}/api/trello/boards`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<TrelloBoard[]>(response);
}

/**
 * Get lists from a board
 */
export async function getTrelloLists(boardId: string): Promise<TrelloList[]> {
    const response = await fetch(`${API_BASE_URL}/api/trello/boards/${boardId}/lists`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<TrelloList[]>(response);
}

/**
 * Setup default CRM lists on a board
 */
export async function setupTrelloLists(boardId: string): Promise<{
    success: boolean;
    message: string;
    listMapping: TrelloListMapping;
}> {
    const response = await fetch(`${API_BASE_URL}/api/trello/setup-lists`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ boardId }),
    });
    return handleResponse(response);
}

/**
 * Get cards from a board or list
 */
export async function getTrelloCards(options?: {
    boardId?: string;
    listId?: string;
}): Promise<TrelloCard[]> {
    const params = new URLSearchParams();
    if (options?.boardId) params.set('boardId', options.boardId);
    if (options?.listId) params.set('listId', options.listId);

    const response = await fetch(`${API_BASE_URL}/api/trello/cards?${params}`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<TrelloCard[]>(response);
}

/**
 * Create a new Trello card
 */
export async function createTrelloCard(params: {
    name: string;
    desc?: string;
    listId: string;
    due?: string;
    labels?: string[];
}): Promise<TrelloCard> {
    const response = await fetch(`${API_BASE_URL}/api/trello/cards`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(params),
    });
    return handleResponse<TrelloCard>(response);
}

/**
 * Update a Trello card
 */
export async function updateTrelloCard(
    cardId: string,
    updates: {
        name?: string;
        desc?: string;
        idList?: string;
        due?: string | null;
        dueComplete?: boolean;
        closed?: boolean;
    }
): Promise<TrelloCard> {
    const response = await fetch(`${API_BASE_URL}/api/trello/cards/${cardId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
    });
    return handleResponse<TrelloCard>(response);
}

/**
 * Move a card to a different list
 */
export async function moveTrelloCard(cardId: string, listId: string): Promise<TrelloCard> {
    const response = await fetch(`${API_BASE_URL}/api/trello/cards/${cardId}/move`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ listId }),
    });
    return handleResponse<TrelloCard>(response);
}

/**
 * Delete a Trello card
 */
export async function deleteTrelloCard(cardId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/trello/cards/${cardId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
}

/**
 * Get comments from a card
 */
export async function getTrelloCardComments(cardId: string): Promise<
    Array<{
        id: string;
        data: { text: string };
        date: string;
        memberCreator: { fullName: string };
    }>
> {
    const response = await fetch(`${API_BASE_URL}/api/trello/cards/${cardId}/comments`, {
        headers: getAuthHeaders(),
    });
    return handleResponse(response);
}

/**
 * Add a comment to a card
 */
export async function addTrelloCardComment(
    cardId: string,
    text: string
): Promise<{ id: string; data: { text: string } }> {
    const response = await fetch(`${API_BASE_URL}/api/trello/cards/${cardId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text }),
    });
    return handleResponse(response);
}

/**
 * Get labels from a board
 */
export async function getTrelloLabels(boardId: string): Promise<TrelloLabel[]> {
    const response = await fetch(`${API_BASE_URL}/api/trello/boards/${boardId}/labels`, {
        headers: getAuthHeaders(),
    });
    return handleResponse<TrelloLabel[]>(response);
}

/**
 * Sync an opportunity to Trello
 */
export async function syncOpportunityToTrello(opportunity: {
    opportunityId: string;
    trelloCardId?: string;
    patientName: string;
    patientPhone: string;
    keyword: string;
    status: string;
    notes?: string;
    scheduledDate?: string;
}): Promise<{ success: boolean; card: TrelloCard }> {
    const response = await fetch(`${API_BASE_URL}/api/trello/sync-opportunity`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(opportunity),
    });
    return handleResponse(response);
}

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

const TRELLO_CONFIG_KEY = 'trello_config';

/**
 * Save Trello config to localStorage (for quick access)
 */
export function saveTrelloConfigLocal(config: Partial<TrelloConfig>): void {
    const existing = getTrelloConfigLocal();
    localStorage.setItem(TRELLO_CONFIG_KEY, JSON.stringify({ ...existing, ...config }));
}

/**
 * Get Trello config from localStorage
 */
export function getTrelloConfigLocal(): Partial<TrelloConfig> | null {
    const stored = localStorage.getItem(TRELLO_CONFIG_KEY);
    if (!stored) return null;
    try {
        return JSON.parse(stored);
    } catch {
        return null;
    }
}

/**
 * Clear Trello config from localStorage
 */
export function clearTrelloConfigLocal(): void {
    localStorage.removeItem(TRELLO_CONFIG_KEY);
}

/**
 * Check if Trello is configured locally
 */
export function isTrelloConfiguredLocal(): boolean {
    const config = getTrelloConfigLocal();
    return !!(config?.apiKey && config?.token);
}
