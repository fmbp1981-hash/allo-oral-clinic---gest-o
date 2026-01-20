import { Router } from 'express';
import * as TrelloController from '../controllers/trello.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication except webhook
router.use((req, res, next) => {
    // Skip authentication for webhook endpoint
    if (req.path === '/webhook' && (req.method === 'POST' || req.method === 'HEAD')) {
        return next();
    }
    return authenticate(req, res, next);
});

// ============================================
// Configuration & Connection
// ============================================

// Get Trello connection status
router.get('/status', TrelloController.getStatus);

// Test Trello connection with credentials
router.post('/test-connection', TrelloController.testConnection);

// Save Trello configuration
router.post('/config', TrelloController.saveConfig);

// ============================================
// Boards & Lists
// ============================================

// Get all accessible boards
router.get('/boards', TrelloController.getBoards);

// Get lists from a board
router.get('/boards/:boardId/lists', TrelloController.getLists);

// Setup default CRM lists on a board
router.post('/setup-lists', TrelloController.setupLists);

// Get labels from a board
router.get('/boards/:boardId/labels', TrelloController.getLabels);

// ============================================
// Cards
// ============================================

// Get cards (query params: boardId or listId)
router.get('/cards', TrelloController.getCards);

// Create a new card
router.post('/cards', TrelloController.createCard);

// Update a card
router.put('/cards/:cardId', TrelloController.updateCard);

// Move a card to a different list
router.post('/cards/:cardId/move', TrelloController.moveCard);

// Delete a card
router.delete('/cards/:cardId', TrelloController.deleteCard);

// ============================================
// Comments
// ============================================

// Get comments from a card
router.get('/cards/:cardId/comments', TrelloController.getComments);

// Add a comment to a card
router.post('/cards/:cardId/comments', TrelloController.addComment);

// ============================================
// Sync
// ============================================

// Sync an opportunity to Trello
router.post('/sync-opportunity', TrelloController.syncOpportunity);

// ============================================
// Webhooks
// ============================================

// Trello webhook callback (no auth required)
router.head('/webhook', TrelloController.handleWebhook);
router.post('/webhook', TrelloController.handleWebhook);

export default router;
