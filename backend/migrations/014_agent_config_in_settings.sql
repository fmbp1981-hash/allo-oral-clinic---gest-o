-- Migration 014: Adicionar agent_config à tabela user_settings
-- Data: 2026-03-17

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS agent_config JSONB DEFAULT '{}';

COMMENT ON COLUMN user_settings.agent_config IS
  'Configuração do agente IA: { enabled, name, clinic_name, specialties, tone, custom_instructions, openai_model, max_context_messages }';
