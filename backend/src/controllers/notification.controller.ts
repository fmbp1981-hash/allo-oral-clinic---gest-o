import { Request, Response } from 'express';
import notificationService from '../services/notification.service';
import logger from '../lib/logger';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.middleware';

// Schema de validação
const createNotificationSchema = z.object({
    title: z.string().min(1, 'Título é obrigatório').max(200, 'Título muito longo'),
    message: z.string().min(1, 'Mensagem é obrigatória').max(500, 'Mensagem muito longa'),
    type: z.enum(['success', 'info', 'warning', 'error']),
    userId: z.string().uuid().optional(),
});

/**
 * GET /api/notifications
 * Busca todas as notificações do usuário
 */
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.user?.tenantId || ''; // Should handle empty tenantId? maybe throw
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

        const notifications = await notificationService.getUserNotifications(userId, tenantId, limit);

        logger.info(`${notifications.length} notificações retornadas${userId ? ` para usuário ${userId}` : ''}`);

        res.json({
            success: true,
            data: notifications,
            count: notifications.length,
        });
    } catch (error) {
        logger.error('Erro ao buscar notificações:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar notificações',
        });
    }
};

/**
 * GET /api/notifications/unread
 * Busca notificações não lidas
 */
export const getUnreadNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.user?.tenantId || '';

        const notifications = await notificationService.getUnreadNotifications(userId, tenantId);

        logger.info(`${notifications.length} notificações não lidas retornadas${userId ? ` para usuário ${userId}` : ''}`);

        res.json({
            success: true,
            data: notifications,
            count: notifications.length,
        });
    } catch (error) {
        logger.error('Erro ao buscar notificações não lidas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar notificações não lidas',
        });
    }
};

/**
 * POST /api/notifications
 * Cria uma nova notificação
 */
export const createNotification = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Validação
        const validationResult = createNotificationSchema.safeParse(req.body);

        if (!validationResult.success) {
            res.status(400).json({
                success: false,
                error: 'Dados inválidos',
                details: validationResult.error.errors,
            });
            return;
        }

        const data = validationResult.data;

        // Criar notificação
        const notification = await notificationService.createNotification({ ...data, tenantId });

        if (!notification) {
            res.status(500).json({
                success: false,
                error: 'Erro ao criar notificação',
            });
            return;
        }

        logger.info(`Notificação criada com sucesso: ${notification.id}`);

        res.status(201).json({
            success: true,
            data: notification,
            message: 'Notificação criada com sucesso',
        });
    } catch (error) {
        logger.error('Erro ao criar notificação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao criar notificação',
        });
    }
};

/**
 * PATCH /api/notifications/:id/read
 * Marca uma notificação como lida
 */
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const success = await notificationService.markAsRead(id);

        if (!success) {
            res.status(500).json({
                success: false,
                error: 'Erro ao marcar notificação como lida',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Notificação marcada como lida',
        });
    } catch (error) {
        logger.error('Erro ao marcar notificação como lida:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao marcar notificação como lida',
        });
    }
};

/**
 * PATCH /api/notifications/mark-all-read
 * Marca todas as notificações como lidas
 */
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.user?.tenantId || '';

        const success = await notificationService.markAllAsRead(userId, tenantId);

        if (!success) {
            res.status(500).json({
                success: false,
                error: 'Erro ao marcar todas notificações como lidas',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Todas notificações marcadas como lidas',
        });
    } catch (error) {
        logger.error('Erro ao marcar todas notificações como lidas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao marcar todas notificações como lidas',
        });
    }
};

/**
 * DELETE /api/notifications/:id
 * Deleta uma notificação
 */
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const success = await notificationService.deleteNotification(id);

        if (!success) {
            res.status(500).json({
                success: false,
                error: 'Erro ao deletar notificação',
            });
            return;
        }

        res.json({
            success: true,
            message: 'Notificação deletada com sucesso',
        });
    } catch (error) {
        logger.error('Erro ao deletar notificação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao deletar notificação',
        });
    }
};

/**
 * GET /api/notifications/stats
 * Retorna estatísticas de notificações
 */
export const getNotificationStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.user?.tenantId || '';

        const allNotifications = await notificationService.getUserNotifications(userId, tenantId, 1000);
        const unreadNotifications = await notificationService.getUnreadNotifications(userId, tenantId);

        const connectedUsers = notificationService.getConnectedUsersCount();
        const isConnected = userId ? notificationService.isUserConnected(userId) : false;

        res.json({
            success: true,
            data: {
                total: allNotifications.length,
                unread: unreadNotifications.length,
                read: allNotifications.length - unreadNotifications.length,
                connectedUsers,
                isConnected,
            },
        });
    } catch (error) {
        logger.error('Erro ao buscar estatísticas de notificações:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar estatísticas',
        });
    }
};
