import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getSettings = async (req: Request, res: Response) => {
    try {
        const settings = await prisma.appSettings.findFirst();
        res.json(settings || {});
    } catch (error) {
        res.status(500).json({ error: 'Error fetching settings' });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const { webhookUrl, messagingWebhookUrl, apiKey, messageTemplate } = req.body;

        // Upsert: update if exists, create if not
        // Since we don't have a unique ID to query by easily (unless we enforce one), 
        // we'll assume there's only one settings record or we find the first one.
        // For simplicity, let's check if one exists first.

        const existing = await prisma.appSettings.findFirst();

        let settings;
        if (existing) {
            settings = await prisma.appSettings.update({
                where: { id: existing.id },
                data: { webhookUrl, messagingWebhookUrl, apiKey, messageTemplate },
            });
        } else {
            settings = await prisma.appSettings.create({
                data: { webhookUrl, messagingWebhookUrl, apiKey, messageTemplate },
            });
        }

        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: 'Error updating settings' });
    }
};
