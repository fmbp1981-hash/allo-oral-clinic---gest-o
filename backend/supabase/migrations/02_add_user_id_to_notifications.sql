-- Migration: Add user_id field to notifications table
-- Description: Permite notificações direcionadas a usuários específicos
-- Date: 2025-12-02

-- Adicionar coluna user_id (nullable para permitir notificações globais)
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Criar índice para melhor performance em queries por usuário
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Criar índice composto para queries de notificações não lidas por usuário
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, read)
WHERE read = false;

-- Comentários
COMMENT ON COLUMN notifications.user_id IS 'ID do usuário destinatário. NULL = notificação global para todos';
COMMENT ON INDEX idx_notifications_user_id IS 'Índice para queries por usuário';
COMMENT ON INDEX idx_notifications_user_unread IS 'Índice para queries de notificações não lidas por usuário';
