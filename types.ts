
export enum OpportunityStatus {
  NEW = 'NEW',         // Identificado
  SENT = 'SENT',       // Contatado
  RESPONDED = 'RESPONDED', // Respondeu
  SCHEDULED = 'SCHEDULED', // Agendado
  ARCHIVED = 'ARCHIVED'   // Arquivado/Não interessado
}

export type ClinicalRecordType = 'consultation' | 'procedure' | 'exam' | 'prescription' | 'note' | 'surgery';

export interface ClinicalRecord {
  id?: string;
  patientId?: string;
  date: string;
  description: string;
  type?: ClinicalRecordType;
  diagnosis?: string;
  treatment?: string;
  medications?: string;
  observations?: string;
  dentistName?: string;
  attachments?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  clinicName: string;
  avatarUrl?: string;
  role?: 'admin' | 'user'; // Role para controle de permissões
  tenantId?: string; // Multi-tenancy support
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  history?: string[]; // Tags/Keywords
  clinicalRecords?: ClinicalRecord[]; // Histórico detalhado com datas
  lastVisit?: string;
}

export interface Opportunity {
  id: string;
  patientId: string;
  name: string;
  phone: string;
  keywordFound: string; // O termo que gerou a oportunidade (ex: "Diabetes")
  status: OpportunityStatus;
  createdAt: string;
  lastContact?: string;
  scheduledDate?: string; // Data e hora do agendamento
  notes?: string;
  clinicalRecords?: ClinicalRecord[]; // Trazido do paciente para visualização rápida
}

export interface StatMetric {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  iconName: string;
}

export interface AppSettings {
  webhookUrl: string; // Webhook de Busca (Consulta Banco)
  messagingWebhookUrl?: string; // Webhook de Envio (Disparo Mensagem)
  apiKey?: string;
  messageTemplate?: string; // Template da mensagem de envio
  defaultRole?: 'admin' | 'user'; // Role padrão para novos usuários
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
  createdAt: string;
}

// --- Agent Conversation Types ---

export type ConversationStatus = 'active' | 'escalated' | 'closed';

export interface AgentConversation {
  id: string;
  patient_phone: string;
  status: ConversationStatus;
  created_at: string;
  last_message_at: string;
  patients?: { id: string; name: string } | null;
  agent_messages?: AgentMessage[];
}

export interface AgentMessage {
  id: string;
  role: 'patient' | 'agent' | 'human' | 'system';
  content: string;
  created_at: string;
}

export interface HandoffRequest {
  id: string;
  conversation_id: string;
  reason: string;
  ai_summary: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  agent_conversations?: {
    patient_phone: string;
    patients?: { name: string } | null;
  };
}

// --- Appointment Scheduling Types ---

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

export type AppointmentSource = 'manual' | 'agent' | 'online';

export interface Dentist {
  id: string;
  user_id: string;
  name: string;
  specialty?: string;
  crm?: string;
  color: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleConfig {
  id: string;
  dentist_id: string;
  day_of_week: number; // 0=Dom, 1=Seg, ..., 6=Sáb
  start_time: string;  // HH:MM
  end_time: string;
  lunch_start?: string;
  lunch_end?: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

export interface ScheduleBlock {
  id: string;
  user_id: string;
  dentist_id?: string;
  title: string;
  start_datetime: string;
  end_datetime: string;
  all_day: boolean;
  source: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  patient_id: string;
  dentist_id: string;
  procedure?: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string;
  cancellation_reason?: string;
  source: AppointmentSource;
  original_appointment_id?: string;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
  // Joined relations
  patients?: { id: string; name: string; phone: string } | null;
  dentists?: { id: string; name: string; specialty?: string; color: string } | null;
}

export interface AppointmentHistory {
  id: string;
  appointment_id: string;
  from_status?: string;
  to_status: string;
  changed_by: string;
  notes?: string;
  created_at: string;
}

export interface AppointmentReminder {
  id: string;
  appointment_id: string;
  user_id: string;
  reminder_type: '24h_before' | '2h_before' | 'custom';
  scheduled_at: string;
  message_template?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at?: string;
  created_at: string;
}

export interface AvailableSlot {
  date: string;       // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string;
  dentist_id: string;
  dentist_name: string;
  dentist_color: string;
}

export interface CalendarIntegration {
  id: string;
  user_id: string;
  dentist_id: string;
  provider: 'google_calendar' | 'ical_url';
  calendar_id: string;
  sync_enabled: boolean;
  last_synced_at?: string;
  sync_interval_minutes: number;
  created_at: string;
}

export type CalendarView = 'day' | 'week' | 'month';
