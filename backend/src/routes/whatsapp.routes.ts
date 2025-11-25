/**
 * WhatsApp Routes
 */

import express from 'express';
import {
  getStatus,
  sendMessage,
  sendOpportunityMessage,
  sendTemplateMessage,
  sendBulkMessages,
  verifyWebhook,
  handleWebhook,
} from '../controllers/whatsapp.controller';
import { writeLimiter, criticalLimiter } from '../middlewares/rateLimiter.middleware';

const router = express.Router();

// Get WhatsApp service status
router.get('/status', getStatus);

// Send text message (rate limited)
router.post('/send', writeLimiter, sendMessage);

// Send message to opportunity (rate limited)
router.post('/send/opportunity/:id', writeLimiter, sendOpportunityMessage);

// Send template message (rate limited)
router.post('/send/template', writeLimiter, sendTemplateMessage);

// Bulk send messages (critical rate limit - very restrictive)
router.post('/send/bulk', criticalLimiter, sendBulkMessages);

// Webhook verification (GET)
router.get('/webhook', verifyWebhook);

// Webhook handler (POST)
router.post('/webhook', handleWebhook);

export default router;
