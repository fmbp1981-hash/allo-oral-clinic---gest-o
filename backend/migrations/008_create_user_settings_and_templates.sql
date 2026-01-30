-- Migration: Create user_settings and message_templates tables
-- This table stores WhatsApp integration settings and message templates per user

-- ============================================
-- Table: user_settings
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- WhatsApp Provider Selection
    provider VARCHAR(50) DEFAULT 'evolution', -- evolution, zapi, business_cloud

    -- Evolution API Settings
    evolution_api_url TEXT,
    evolution_api_key TEXT,
    evolution_instance_name TEXT,

    -- Z-API Settings
    zapi_url TEXT,
    zapi_instance_id TEXT,
    zapi_token TEXT,

    -- WhatsApp Business Cloud Settings
    business_phone_number_id TEXT,
    business_access_token TEXT,

    -- Webhook Configuration
    whatsapp_webhook_url TEXT,

    -- Message Templates (Default)
    reactivation_message TEXT,
    appointment_confirmation TEXT,
    appointment_reminder TEXT,
    welcome_message TEXT,

    -- Status Flags
    integration_configured BOOLEAN DEFAULT FALSE,
    pending_setup BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one config per user
    UNIQUE(user_id)
);

-- Add index for user lookup
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- ============================================
-- Table: message_templates
-- ============================================
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Template Info
    name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,

    -- Template Type (optional, for categorization)
    type VARCHAR(50), -- reactivation, confirmation, reminder, welcome, custom

    -- Active status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for user lookup
CREATE INDEX IF NOT EXISTS idx_message_templates_user_id ON message_templates(user_id);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Create RLS policies
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can view their own templates" ON message_templates;
DROP POLICY IF EXISTS "Users can manage their own templates" ON message_templates;

-- user_settings policies
CREATE POLICY "Users can view their own settings"
    ON user_settings FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own settings"
    ON user_settings FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own settings"
    ON user_settings FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- message_templates policies
CREATE POLICY "Users can view their own templates"
    ON message_templates FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own templates"
    ON message_templates FOR ALL
    USING (user_id = auth.uid());

-- ============================================
-- Add comments
-- ============================================
COMMENT ON TABLE user_settings IS 'Stores WhatsApp integration settings and default message templates per user';
COMMENT ON TABLE message_templates IS 'Stores custom message templates per user';

COMMENT ON COLUMN user_settings.provider IS 'WhatsApp provider: evolution, zapi, or business_cloud';
COMMENT ON COLUMN user_settings.reactivation_message IS 'Default message template for patient reactivation';
COMMENT ON COLUMN user_settings.appointment_confirmation IS 'Default message template for appointment confirmation';
COMMENT ON COLUMN user_settings.appointment_reminder IS 'Default message template for appointment reminders';
COMMENT ON COLUMN user_settings.welcome_message IS 'Default message template for welcoming new patients';

-- ============================================
-- Insert default templates for existing users
-- ============================================
INSERT INTO user_settings (user_id, reactivation_message, appointment_confirmation, appointment_reminder, welcome_message)
SELECT
    id as user_id,
    'Olá {nome}! 👋

Notamos que faz um tempo desde sua última visita à nossa clínica. Gostaríamos de saber como você está e se podemos ajudá-lo com algum tratamento.

Temos novidades e condições especiais para pacientes como você!

Podemos agendar uma avaliação?' as reactivation_message,
    'Olá {nome}! ✅

Confirmamos seu agendamento para o dia {data} às {hora}.

Endereço: {endereco}

Em caso de dúvidas ou necessidade de remarcação, entre em contato conosco.

Até lá!' as appointment_confirmation,
    'Olá {nome}! 📅

Lembramos que você tem uma consulta agendada para amanhã, dia {data} às {hora}.

Por favor, confirme sua presença respondendo esta mensagem.

Aguardamos você!' as appointment_reminder,
    'Olá {nome}! 🎉

Bem-vindo(a) à nossa clínica! Estamos muito felizes em tê-lo(a) como paciente.

Se precisar de qualquer coisa, estamos à disposição.

Abraços da equipe!' as welcome_message
FROM users
WHERE id NOT IN (SELECT user_id FROM user_settings WHERE user_id IS NOT NULL);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- Migration completed successfully!
-- Tables user_settings and message_templates have been created.
-- Default templates have been inserted for all existing users.
