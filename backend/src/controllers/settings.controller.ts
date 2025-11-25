import { Request, Response } from 'express';
import supabase from '../lib/supabase';
import logger from '../lib/logger';

export const getSettings = async (req: Request, res: Response) => {
    try {
        const { data: settings, error } = await supabase
            .from('app_settings')
            .select('*')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            logger.error('Error fetching settings:', error);
            return res.status(500).json({ error: 'Error fetching settings' });
        }

        res.json(settings || {});
    } catch (error: any) {
        logger.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Error fetching settings' });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const { webhookUrl, messagingWebhookUrl, apiKey, messageTemplate } = req.body;

        // Check if settings already exist
        const { data: existing } = await supabase
            .from('app_settings')
            .select('id')
            .limit(1)
            .single();

        let settings;

        if (existing) {
            // Update existing settings
            const { data, error } = await supabase
                .from('app_settings')
                .update({
                    webhook_url: webhookUrl,
                    messaging_webhook_url: messagingWebhookUrl,
                    api_key: apiKey,
                    message_template: messageTemplate,
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) {
                logger.error('Error updating settings:', error);
                return res.status(500).json({ error: 'Error updating settings' });
            }

            settings = data;
            logger.info('Settings updated', { settingsId: existing.id });
        } else {
            // Create new settings
            const { data, error } = await supabase
                .from('app_settings')
                .insert({
                    webhook_url: webhookUrl,
                    messaging_webhook_url: messagingWebhookUrl,
                    api_key: apiKey,
                    message_template: messageTemplate,
                })
                .select()
                .single();

            if (error) {
                logger.error('Error creating settings:', error);
                return res.status(500).json({ error: 'Error creating settings' });
            }

            settings = data;
            logger.info('Settings created', { settingsId: data.id });
        }

        res.json(settings);
    } catch (error: any) {
        logger.error('Error updating settings:', error);
        res.status(500).json({ error: 'Error updating settings' });
    }
};
