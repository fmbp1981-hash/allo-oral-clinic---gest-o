import { Router } from 'express';
import {
    getNotifications,
    getUnreadNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationStats,
} from '../controllers/notification.controller';

const router = Router();

/**
 * @route   GET /api/notifications
 * @desc    Busca todas as notificações
 * @query   userId (optional) - ID do usuário
 * @query   limit (optional) - Limite de notificações (padrão: 50)
 * @access  Public
 */
router.get('/', getNotifications);

/**
 * @route   GET /api/notifications/unread
 * @desc    Busca notificações não lidas
 * @query   userId (optional) - ID do usuário
 * @access  Public
 */
router.get('/unread', getUnreadNotifications);

/**
 * @route   GET /api/notifications/stats
 * @desc    Retorna estatísticas de notificações
 * @query   userId (optional) - ID do usuário
 * @access  Public
 */
router.get('/stats', getNotificationStats);

/**
 * @route   POST /api/notifications
 * @desc    Cria uma nova notificação (e emite via Socket.io)
 * @body    { title, message, type, userId? }
 * @access  Public
 */
router.post('/', createNotification);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Marca uma notificação como lida
 * @param   id - ID da notificação
 * @access  Public
 */
router.patch('/:id/read', markAsRead);

/**
 * @route   PATCH /api/notifications/mark-all-read
 * @desc    Marca todas as notificações como lidas
 * @query   userId (optional) - ID do usuário
 * @access  Public
 */
router.patch('/mark-all-read', markAllAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Deleta uma notificação
 * @param   id - ID da notificação
 * @access  Public
 */
router.delete('/:id', deleteNotification);

export default router;
