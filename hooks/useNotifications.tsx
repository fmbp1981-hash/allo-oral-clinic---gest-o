import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import io, { Socket } from 'socket.io-client';
import { useToast } from './useToast';
import { Notification } from '../types';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  isConnected: boolean;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

interface NotificationsProviderProps {
  userId?: string;
  children: ReactNode;
}

export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({ userId, children }) => {
  const toast = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Conectar ao Socket.io
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const newSocket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Event: Conexão estabelecida
    newSocket.on('connect', () => {
      console.log('✅ Socket.io connected');
      setIsConnected(true);

      // Autenticar com userId se disponível
      if (userId) {
        newSocket.emit('authenticate', userId);
        console.log(`🔐 Authenticated as user: ${userId}`);
      }
    });

    // Event: Desconexão
    newSocket.on('disconnect', () => {
      console.log('❌ Socket.io disconnected');
      setIsConnected(false);
    });

    // Event: Nova notificação recebida
    newSocket.on('new_notification', (notification: Notification) => {
      console.log('🔔 New notification received:', notification);

      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Mostrar toast com a nova notificação
      toast.success(notification.message, {
        title: notification.title,
      });
    });

    // Event: Lista de notificações não lidas (ao conectar)
    newSocket.on('unread_notifications', (unread: Notification[]) => {
      console.log(`📬 Received ${unread.length} unread notifications`);
      setNotifications(unread);
      setUnreadCount(unread.length);
    });

    // Event: Notificação marcada como lida
    newSocket.on('notification_read', (notificationId: string) => {
      console.log(`✔️ Notification marked as read: ${notificationId}`);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    // Event: Erro de conexão
    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket.io connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup ao desmontar
    return () => {
      console.log('🔌 Disconnecting Socket.io');
      newSocket.disconnect();
    };
  }, [userId]);

  const markAsRead = (notificationId: string) => {
    if (!socket) {
      console.warn('⚠️ Socket not connected, cannot mark as read');
      return;
    }

    console.log(`📝 Marking notification as read: ${notificationId}`);
    socket.emit('mark_as_read', notificationId);
  };

  const value: NotificationsContextType = {
    notifications,
    unreadCount,
    markAsRead,
    isConnected,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = (): NotificationsContextType => {
  const context = useContext(NotificationsContext);

  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }

  return context;
};
