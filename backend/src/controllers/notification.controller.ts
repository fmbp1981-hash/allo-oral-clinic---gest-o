import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const notifications = await prisma.notification.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching notifications' });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const notification = await prisma.notification.update({
            where: { id },
            data: {
                read: true,
            },
        });
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Error updating notification' });
    }
};

export const createNotification = async (req: Request, res: Response) => {
    try {
        const { title, message, type } = req.body;
        const notification = await prisma.notification.create({
            data: {
                title,
                message,
                type,
            },
        });
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Error creating notification' });
    }
};
