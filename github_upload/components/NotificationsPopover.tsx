
import React, { useEffect, useRef } from 'react';
import { Bell, Check, Info, AlertTriangle, X } from 'lucide-react';
import { Notification } from '../types';

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({ 
  isOpen, 
  onClose, 
  notifications, 
  onMarkAsRead 
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div 
      ref={menuRef}
      className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-fade-in"
    >
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800">Notificações</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-4 hover:bg-gray-50 transition-colors flex gap-3 ${notification.read ? 'opacity-60' : 'bg-indigo-50/30'}`}
                onClick={() => onMarkAsRead(notification.id)}
              >
                <div className="mt-1">
                  {notification.type === 'success' && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                  {notification.type === 'info' && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                  {notification.type === 'warning' && <div className="w-2 h-2 rounded-full bg-orange-500"></div>}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{notification.message}</p>
                  <p className="text-[10px] text-gray-400 mt-2">
                    {new Date(notification.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
                {!notification.read && (
                  <div className="flex items-center self-center">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
