-- Migration 016: Appointment Scheduling System
-- Date: 2026-03-20
-- Tables: dentists, schedule_config, schedule_blocks, appointments,
--         appointment_history, appointment_reminders, calendar_integrations

-- ============================================
-- Table: dentists (profissionais da clínica)
-- ============================================
CREATE TABLE IF NOT EXISTS dentists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT,
  crm TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dentists_user_name ON dentists(user_id, name);
CREATE INDEX IF NOT EXISTS idx_dentists_user_active ON dentists(user_id, is_active);

ALTER TABLE dentists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dentists_user_policy ON dentists;
CREATE POLICY dentists_user_policy ON dentists
  USING (user_id = auth.uid()::uuid);

-- ============================================
-- Table: schedule_config (horários de atendimento por dentista)
-- ============================================
CREATE TABLE IF NOT EXISTS schedule_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  lunch_start TIME,
  lunch_end TIME,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT schedule_config_time_check CHECK (end_time > start_time),
  CONSTRAINT schedule_config_lunch_check CHECK (
    (lunch_start IS NULL AND lunch_end IS NULL) OR
    (lunch_start IS NOT NULL AND lunch_end IS NOT NULL AND lunch_end > lunch_start)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_config_dentist_day
  ON schedule_config(dentist_id, day_of_week);

-- RLS via dentists join
ALTER TABLE schedule_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS schedule_config_policy ON schedule_config;
CREATE POLICY schedule_config_policy ON schedule_config
  USING (
    EXISTS (
      SELECT 1 FROM dentists d
      WHERE d.id = schedule_config.dentist_id
        AND d.user_id = auth.uid()::uuid
    )
  );

-- ============================================
-- Table: schedule_blocks (bloqueios de horário: feriados, férias, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS schedule_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dentist_id UUID REFERENCES dentists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  source VARCHAR(30) DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT schedule_blocks_time_check CHECK (end_datetime > start_datetime)
);

CREATE INDEX IF NOT EXISTS idx_schedule_blocks_user ON schedule_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_dentist ON schedule_blocks(dentist_id, start_datetime, end_datetime);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_range ON schedule_blocks(start_datetime, end_datetime);

ALTER TABLE schedule_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS schedule_blocks_user_policy ON schedule_blocks;
CREATE POLICY schedule_blocks_user_policy ON schedule_blocks
  USING (user_id = auth.uid()::uuid);

-- ============================================
-- Table: appointments (agendamentos de consultas)
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  procedure TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  notes TEXT,
  cancellation_reason TEXT,
  source VARCHAR(20) NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'agent', 'online')),
  original_appointment_id UUID REFERENCES appointments(id),
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT appointments_time_check CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_appointments_user_time ON appointments(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_time ON appointments(dentist_id, start_time, status);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_source ON appointments(source);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS appointments_user_policy ON appointments;
CREATE POLICY appointments_user_policy ON appointments
  USING (user_id = auth.uid()::uuid);

-- ============================================
-- Table: appointment_history (trilha de auditoria)
-- ============================================
CREATE TABLE IF NOT EXISTS appointment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT NOT NULL DEFAULT 'system',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_history_appt
  ON appointment_history(appointment_id, created_at DESC);

-- RLS via appointments join
ALTER TABLE appointment_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS appointment_history_policy ON appointment_history;
CREATE POLICY appointment_history_policy ON appointment_history
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_history.appointment_id
        AND a.user_id = auth.uid()::uuid
    )
  );

-- ============================================
-- Table: appointment_reminders (lembretes automáticos)
-- ============================================
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_type VARCHAR(20) NOT NULL
    CHECK (reminder_type IN ('24h_before', '2h_before', 'custom')),
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  message_template TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_pending
  ON appointment_reminders(scheduled_at, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reminders_appointment ON appointment_reminders(appointment_id);

ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS appointment_reminders_user_policy ON appointment_reminders;
CREATE POLICY appointment_reminders_user_policy ON appointment_reminders
  USING (user_id = auth.uid()::uuid);

-- ============================================
-- Table: calendar_integrations (sync com Google Calendar / iCal)
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dentist_id UUID NOT NULL REFERENCES dentists(id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL
    CHECK (provider IN ('google_calendar', 'ical_url')),
  calendar_id TEXT NOT NULL,
  credentials JSONB DEFAULT '{}',
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user ON calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_dentist ON calendar_integrations(dentist_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_sync
  ON calendar_integrations(sync_enabled, last_synced_at) WHERE sync_enabled = TRUE;

ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS calendar_integrations_user_policy ON calendar_integrations;
CREATE POLICY calendar_integrations_user_policy ON calendar_integrations
  USING (user_id = auth.uid()::uuid);
