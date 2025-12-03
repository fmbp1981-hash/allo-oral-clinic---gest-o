import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import supabase from '../lib/supabase';
import logger from '../lib/logger';

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    read: boolean;
    created_at: string;
    user_id?: string;
}

export interface CreateNotificationData {
    title: string;
    message: string;
    type: NotificationType;
    userId?: string;
}

class NotificationService {
    private io: SocketIOServer | null = null;
    private connectedUsers: Map<string, Socket> = new Map();

    /**
     * Inicializa o servidor Socket.io
     */
    public initializeSocket(httpServer: HTTPServer): void {
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:5173',
                methods: ['GET', 'POST'],
                credentials: true,
            },
            transports: ['websocket', 'polling'],
        });

        this.io.on('connection', (socket: Socket) => {
            logger.info(`Socket conectado: ${socket.id}`);

            // Autenticar usuário via token
            socket.on('authenticate', (userId: string) => {
                this.connectedUsers.set(userId, socket);
                logger.info(`Usuário ${userId} autenticado no socket ${socket.id}`);

                // Enviar notificações não lidas ao conectar
                this.sendUnreadNotifications(userId, socket);
            });

            // Marcar notificação como lida
            socket.on('mark_as_read', async (notificationId: string) => {
                try {
                    await this.markAsRead(notificationId);
                    socket.emit('notification_read', notificationId);
                } catch (error) {
                    logger.error('Erro ao marcar notificação como lida:', error);
                }
            });

            // Desconexão
            socket.on('disconnect', () => {
                // Remove da lista de usuários conectados
                for (const [userId, userSocket] of this.connectedUsers.entries()) {
                    if (userSocket.id === socket.id) {
                        this.connectedUsers.delete(userId);
                        logger.info(`Usuário ${userId} desconectado do socket ${socket.id}`);
                        break;
                    }
                }
            });
        });

        logger.info('🔌 Socket.io inicializado');
    }

    /**
     * Cria uma nova notificação no banco e emite via Socket.io
     */
    public async createNotification(data: CreateNotificationData): Promise<Notification | null> {
        try {
            const { data: notification, error } = await supabase
                .from('notifications')
                .insert({
                    title: data.title,
                    message: data.message,
                    type: data.type,
                    read: false,
                    user_id: data.userId || null,
                })
                .select()
                .single();

            if (error) {
                logger.error('Erro ao criar notificação:', error);
                return null;
            }

            logger.info(`Notificação criada: ${notification.id} - ${notification.title}`);

            // Emitir notificação via Socket.io
            if (data.userId) {
                this.emitToUser(data.userId, 'new_notification', notification);
            } else {
                this.emitToAll('new_notification', notification);
            }

            return notification as Notification;
        } catch (error) {
            logger.error('Exceção ao criar notificação:', error);
            return null;
        }
    }

    /**
     * Busca todas as notificações de um usuário
     */
    public async getUserNotifications(userId?: string, limit: number = 50): Promise<Notification[]> {
        try {
            let query = supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            // Se userId for fornecido, filtra por usuário ou notificações globais
            if (userId) {
                query = query.or(`user_id.eq.${userId},user_id.is.null`);
            } else {
                query = query.is('user_id', null);
            }

            const { data, error } = await query;

            if (error) {
                logger.error('Erro ao buscar notificações:', error);
                return [];
            }

            return (data as Notification[]) || [];
        } catch (error) {
            logger.error('Exceção ao buscar notificações:', error);
            return [];
        }
    }

    /**
     * Busca notificações não lidas
     */
    public async getUnreadNotifications(userId?: string): Promise<Notification[]> {
        try {
            let query = supabase
                .from('notifications')
                .select('*')
                .eq('read', false)
                .order('created_at', { ascending: false });

            if (userId) {
                query = query.or(`user_id.eq.${userId},user_id.is.null`);
            } else {
                query = query.is('user_id', null);
            }

            const { data, error } = await query;

            if (error) {
                logger.error('Erro ao buscar notificações não lidas:', error);
                return [];
            }

            return (data as Notification[]) || [];
        } catch (error) {
            logger.error('Exceção ao buscar notificações não lidas:', error);
            return [];
        }
    }

    /**
     * Marca uma notificação como lida
     */
    public async markAsRead(notificationId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);

            if (error) {
                logger.error('Erro ao marcar notificação como lida:', error);
                return false;
            }

            logger.info(`Notificação ${notificationId} marcada como lida`);
            return true;
        } catch (error) {
            logger.error('Exceção ao marcar notificação como lida:', error);
            return false;
        }
    }

    /**
     * Marca todas as notificações de um usuário como lidas
     */
    public async markAllAsRead(userId?: string): Promise<boolean> {
        try {
            let query = supabase
                .from('notifications')
                .update({ read: true })
                .eq('read', false);

            if (userId) {
                query = query.or(`user_id.eq.${userId},user_id.is.null`);
            } else {
                query = query.is('user_id', null);
            }

            const { error } = await query;

            if (error) {
                logger.error('Erro ao marcar todas notificações como lidas:', error);
                return false;
            }

            logger.info(`Todas notificações marcadas como lidas${userId ? ` para usuário ${userId}` : ''}`);
            return true;
        } catch (error) {
            logger.error('Exceção ao marcar todas notificações como lidas:', error);
            return false;
        }
    }

    /**
     * Deleta uma notificação
     */
    public async deleteNotification(notificationId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);

            if (error) {
                logger.error('Erro ao deletar notificação:', error);
                return false;
            }

            logger.info(`Notificação ${notificationId} deletada`);
            return true;
        } catch (error) {
            logger.error('Exceção ao deletar notificação:', error);
            return false;
        }
    }

    /**
     * Emite um evento para um usuário específico
     */
    private emitToUser(userId: string, event: string, data: any): void {
        const userSocket = this.connectedUsers.get(userId);
        if (userSocket) {
            userSocket.emit(event, data);
            logger.debug(`Evento ${event} emitido para usuário ${userId}`);
        } else {
            logger.debug(`Usuário ${userId} não está conectado, notificação será entregue na próxima conexão`);
        }
    }

    /**
     * Emite um evento para todos os usuários conectados
     */
    private emitToAll(event: string, data: any): void {
        if (this.io) {
            this.io.emit(event, data);
            logger.debug(`Evento ${event} emitido para todos os usuários`);
        }
    }

    /**
     * Envia notificações não lidas quando o usuário se conecta
     */
    private async sendUnreadNotifications(userId: string, socket: Socket): Promise<void> {
        try {
            const unreadNotifications = await this.getUnreadNotifications(userId);

            if (unreadNotifications.length > 0) {
                socket.emit('unread_notifications', unreadNotifications);
                logger.info(`${unreadNotifications.length} notificações não lidas enviadas para usuário ${userId}`);
            }
        } catch (error) {
            logger.error('Erro ao enviar notificações não lidas:', error);
        }
    }

    /**
     * Retorna o número de usuários conectados
     */
    public getConnectedUsersCount(): number {
        return this.connectedUsers.size;
    }

    /**
     * Verifica se um usuário está conectado
     */
    public isUserConnected(userId: string): boolean {
        return this.connectedUsers.has(userId);
    }
}

// Singleton
export default new NotificationService();
