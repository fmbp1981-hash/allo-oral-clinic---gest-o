import { Request, Response } from 'express';
import supabase from '../lib/supabase';
import logger from '../lib/logger';

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            logger.error('Error fetching notifications:', error);
            return res.status(500).json({ error: 'Error fetching notifications' });
        }

        res.json(notifications || []);
    } catch (error: any) {
        logger.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Error fetching notifications' });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data: notification, error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            logger.error('Error updating notification:', error);
            return res.status(500).json({ error: 'Error updating notification' });
        }

        logger.info('Notification marked as read', { notificationId: id });
        res.json(notification);
    } catch (error: any) {
        logger.error('Error updating notification:', error);
        res.status(500).json({ error: 'Error updating notification' });
    }
};

export const createNotification = async (req: Request, res: Response) => {
    try {
        const { title, message, type } = req.body;

        const { data: notification, error } = await supabase
            .from('notifications')
            .insert({
                title,
                message,
                type: type || 'info',
            })
            .select()
            .single();

        if (error || !notification) {
            logger.error('Error creating notification:', error);
            return res.status(500).json({ error: 'Error creating notification' });
        }

        logger.info('Notification created', { notificationId: notification.id });
        res.json(notification);
    } catch (error: any) {
        logger.error('Error creating notification:', error);
        res.status(500).json({ error: 'Error creating notification' });
    }
};

export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) {
            logger.error('Error deleting notification:', error);
            return res.status(500).json({ error: 'Error deleting notification' });
        }

        logger.info('Notification deleted', { notificationId: id });
        res.json({ message: 'Notification deleted successfully' });
    } catch (error: any) {
        logger.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Error deleting notification' });
    }
};
