/**
 * WhatsApp Controller
 * Handles WhatsApp messaging operations
 */

import { Request, Response } from 'express';
import whatsappService from '../services/whatsapp.service.v2';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

/**
 * Get WhatsApp service status
 */
export const getStatus = async (req: Request, res: Response) => {
  try {
    const status = whatsappService.getStatus();
    res.json(status);
  } catch (error: any) {
    logger.error('Error getting WhatsApp status:', error);
    res.status(500).json({ error: 'Error getting WhatsApp status' });
  }
};

/**
 * Send message to a specific phone number
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        error: 'Phone number and message are required',
      });
    }

    if (!whatsappService.isConfigured()) {
      return res.status(503).json({
        error: 'WhatsApp service not configured',
        details: 'Please configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID',
      });
    }

    const result = await whatsappService.sendTextMessage(phone, message);

    logger.info('Message sent via API', {
      messageId: result.messages[0]?.id,
    });

    res.json({
      success: true,
      messageId: result.messages[0]?.id,
      waId: result.contacts[0]?.wa_id,
    });
  } catch (error: any) {
    logger.error('Error sending WhatsApp message:', error);
    res.status(500).json({
      error: 'Error sending message',
      details: error.message,
    });
  }
};

/**
 * Send message to an opportunity
 */
export const sendOpportunityMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customTemplate } = req.body;

    // Get opportunity from database
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        patient: true,
      },
    });

    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    if (!whatsappService.isConfigured()) {
      return res.status(503).json({
        error: 'WhatsApp service not configured',
        details: 'Please configure WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID',
      });
    }

    // Send message
    const result = await whatsappService.sendOpportunityMessage(
      opportunity.phone,
      opportunity.name,
      opportunity.keywordFound,
      customTemplate
    );

    // Update opportunity status to SENT
    await prisma.opportunity.update({
      where: { id },
      data: {
        status: 'SENT',
        lastContact: new Date(),
      },
    });

    logger.info('Opportunity message sent', {
      opportunityId: id,
      messageId: result.messages[0]?.id,
    });

    res.json({
      success: true,
      messageId: result.messages[0]?.id,
      waId: result.contacts[0]?.wa_id,
      opportunityId: id,
    });
  } catch (error: any) {
    logger.error('Error sending opportunity message:', error);
    res.status(500).json({
      error: 'Error sending opportunity message',
      details: error.message,
    });
  }
};

/**
 * Send template message
 */
export const sendTemplateMessage = async (req: Request, res: Response) => {
  try {
    const { phone, templateName, languageCode, components } = req.body;

    if (!phone || !templateName) {
      return res.status(400).json({
        error: 'Phone number and template name are required',
      });
    }

    if (!whatsappService.isConfigured()) {
      return res.status(503).json({
        error: 'WhatsApp service not configured',
      });
    }

    const result = await whatsappService.sendTemplateMessage(
      phone,
      templateName,
      languageCode || 'pt_BR',
      components
    );

    res.json({
      success: true,
      messageId: result.messages[0]?.id,
      waId: result.contacts[0]?.wa_id,
    });
  } catch (error: any) {
    logger.error('Error sending template message:', error);
    res.status(500).json({
      error: 'Error sending template message',
      details: error.message,
    });
  }
};

/**
 * Webhook handler for receiving messages (GET - verification)
 */
export const verifyWebhook = async (req: Request, res: Response) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'clinicaflow_webhook_token';

    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      logger.warn('Webhook verification failed');
      res.status(403).json({ error: 'Verification failed' });
    }
  } catch (error: any) {
    logger.error('Error verifying webhook:', error);
    res.status(500).json({ error: 'Error verifying webhook' });
  }
};

/**
 * Webhook handler for receiving messages (POST - messages)
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const body = req.body;

    logger.info('Webhook received', {
      object: body.object,
      entry: body.entry?.length,
    });

    // Acknowledge receipt immediately
    res.status(200).json({ success: true });

    // Process webhook data
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') {
            const messages = change.value.messages || [];
            const contacts = change.value.contacts || [];

            for (const message of messages) {
              logger.info('Message received', {
                from: message.from,
                type: message.type,
                messageId: message.id,
              });

              // TODO: Process incoming message
              // - Save to database
              // - Update opportunity status
              // - Trigger notifications
            }
          }
        }
      }
    }
  } catch (error: any) {
    logger.error('Error handling webhook:', error);
    // Don't return error to WhatsApp - already acknowledged
  }
};

/**
 * Bulk send messages to multiple opportunities
 */
export const sendBulkMessages = async (req: Request, res: Response) => {
  try {
    const { opportunityIds, customTemplate } = req.body;

    if (!opportunityIds || !Array.isArray(opportunityIds) || opportunityIds.length === 0) {
      return res.status(400).json({
        error: 'Opportunity IDs array is required',
      });
    }

    if (!whatsappService.isConfigured()) {
      return res.status(503).json({
        error: 'WhatsApp service not configured',
      });
    }

    const results: any[] = [];
    const errors: any[] = [];

    // Rate limiting: Send one message every 1 second to avoid API limits
    for (const oppId of opportunityIds) {
      try {
        const opportunity = await prisma.opportunity.findUnique({
          where: { id: oppId },
        });

        if (!opportunity) {
          errors.push({
            opportunityId: oppId,
            error: 'Opportunity not found',
          });
          continue;
        }

        const result = await whatsappService.sendOpportunityMessage(
          opportunity.phone,
          opportunity.name,
          opportunity.keywordFound,
          customTemplate
        );

        // Update status
        await prisma.opportunity.update({
          where: { id: oppId },
          data: {
            status: 'SENT',
            lastContact: new Date(),
          },
        });

        results.push({
          opportunityId: oppId,
          messageId: result.messages[0]?.id,
          success: true,
        });

        // Wait 1 second before sending next message
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        logger.error('Error in bulk send', {
          opportunityId: oppId,
          error: error.message,
        });
        errors.push({
          opportunityId: oppId,
          error: error.message,
        });
      }
    }

    logger.info('Bulk messages sent', {
      total: opportunityIds.length,
      successful: results.length,
      failed: errors.length,
    });

    res.json({
      success: true,
      results,
      errors,
      summary: {
        total: opportunityIds.length,
        successful: results.length,
        failed: errors.length,
      },
    });
  } catch (error: any) {
    logger.error('Error in bulk send:', error);
    res.status(500).json({
      error: 'Error sending bulk messages',
      details: error.message,
    });
  }
};
