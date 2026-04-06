import { z } from 'zod';
import { NextResponse } from 'next/server';

// ─── Helpers ───────────────────────────────────────────

/** Parse request JSON body against a Zod schema. Returns parsed data or a 400 error response. */
export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T>; error?: never } | { data?: never; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: NextResponse.json({ error: 'Corpo da requisição inválido (JSON esperado)' }, { status: 400 }) };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const messages = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).filter(Boolean);
    return {
      error: NextResponse.json(
        { error: 'Dados inválidos', details: messages },
        { status: 400 }
      ),
    };
  }

  return { data: result.data };
}

// ─── Reusable primitives ───────────────────────────────

const uuid = z.string().uuid();
const trimmedString = z.string().trim().min(1);
const optionalString = z.string().trim().optional().nullable();
const isoDatetime = z.string().datetime({ offset: true }).or(z.string().datetime());
const email = z.string().email().trim().toLowerCase();

// ─── Auth ──────────────────────────────────────────────

export const loginSchema = z.object({
  email: email,
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const registerSchema = z.object({
  name: trimmedString,
  email: email,
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  clinicName: z.string().trim().optional(),
  avatarUrl: z.string().url().optional(),
});

export const requestPasswordResetSchema = z.object({
  email: email,
});

export const resetPasswordSchema = z.object({
  email: email,
  token: trimmedString,
  newPassword: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

// ─── Patients ──────────────────────────────────────────

export const createPatientSchema = z.object({
  name: trimmedString,
  phone: z.string().trim().optional().default(''),
  email: z.string().email().trim().optional().nullable(),
  history: z.array(z.string()).optional().default([]),
});

// ─── Appointments ──────────────────────────────────────

const appointmentSource = z.enum(['manual', 'agent', 'online']);
const appointmentStatus = z.enum([
  'scheduled', 'confirmed', 'in_progress', 'completed',
  'cancelled', 'no_show', 'rescheduled',
]);

export const createAppointmentSchema = z.object({
  patient_id: uuid,
  dentist_id: uuid,
  start_time: isoDatetime,
  end_time: isoDatetime,
  procedure: optionalString,
  notes: optionalString,
  source: appointmentSource.optional().default('manual'),
}).refine(d => new Date(d.end_time) > new Date(d.start_time), {
  message: 'end_time deve ser posterior a start_time',
  path: ['end_time'],
});

export const updateAppointmentSchema = z.object({
  status: appointmentStatus.optional(),
  start_time: isoDatetime.optional(),
  end_time: isoDatetime.optional(),
  notes: optionalString,
  procedure: optionalString,
  dentist_id: uuid.optional(),
  cancellation_reason: optionalString,
}).refine(d => {
  if (d.start_time && d.end_time) {
    return new Date(d.end_time) > new Date(d.start_time);
  }
  return true;
}, { message: 'end_time deve ser posterior a start_time', path: ['end_time'] });

// ─── Dentists ──────────────────────────────────────────

export const createDentistSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  specialty: optionalString,
  crm: optionalString,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#6366f1'),
  phone: optionalString,
  email: z.string().email().trim().optional().nullable(),
});

export const updateDentistSchema = z.object({
  name: z.string().trim().min(2).optional(),
  specialty: optionalString,
  crm: optionalString,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  phone: optionalString,
  email: z.string().email().trim().optional().nullable(),
  is_active: z.boolean().optional(),
});

// ─── Schedule Config ───────────────────────────────────

const scheduleDay = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: trimmedString,
  end_time: trimmedString,
  lunch_start: optionalString,
  lunch_end: optionalString,
  slot_duration_minutes: z.number().int().min(5).max(120).optional().default(30),
  is_active: z.boolean().optional().default(true),
});

export const updateScheduleSchema = z.object({
  days: z.array(scheduleDay).min(1, 'Array "days" deve ter pelo menos 1 item'),
});

// ─── Schedule Blocks ───────────────────────────────────

export const createScheduleBlockSchema = z.object({
  dentist_id: uuid.optional(),
  start_time: isoDatetime,
  end_time: isoDatetime,
  reason: optionalString,
  title: optionalString,
  all_day: z.boolean().optional().default(false),
  source: z.string().trim().optional().default('manual'),
}).refine(d => new Date(d.end_time) > new Date(d.start_time), {
  message: 'end_time deve ser posterior a start_time',
  path: ['end_time'],
});

// ─── Agent ─────────────────────────────────────────────

export const updateAgentConfigSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().trim().optional(),
  clinic_name: z.string().trim().optional(),
  specialties: z.array(z.string()).optional(),
  tone: z.string().trim().optional(),
  custom_instructions: z.string().optional(),
  openai_model: z.string().trim().optional(),
  max_context_messages: z.number().int().min(1).max(50).optional(),
});

const conversationStatus = z.enum(['active', 'escalated', 'closed']);

export const updateConversationStatusSchema = z.object({
  status: conversationStatus,
});

export const createMessageSchema = z.object({
  content: z.string().trim().min(1, 'Conteúdo é obrigatório').max(4000, 'Máximo 4000 caracteres'),
});

// ─── Opportunities ─────────────────────────────────────

export const createOpportunitySchema = z.object({
  patientId: uuid,
  status: trimmedString,
  name: optionalString,
  phone: optionalString,
  keywordFound: optionalString,
  notes: optionalString,
  scheduledDate: z.string().optional().nullable(),
});

export const updateOpportunityStatusSchema = z.object({
  status: trimmedString,
  scheduledDate: z.string().optional().nullable(),
});

export const updateOpportunityNotesSchema = z.object({
  notes: z.string().optional().nullable(),
});

// ─── Campaigns ─────────────────────────────────────────

export const createCampaignSchema = z.object({
  name: trimmedString,
  patient_ids: z.array(uuid).min(1, 'Selecione pelo menos 1 paciente'),
  message_template: trimmedString,
});

export const campaignPreviewSchema = z.object({
  patient_ids: z.array(uuid).min(1, 'Selecione pelo menos 1 paciente'),
  message_template: trimmedString,
  sample_size: z.number().int().min(1).max(5).optional().default(3),
});

// ─── Clinical Records ──────────────────────────────────

const clinicalRecordType = z.enum([
  'consultation', 'procedure', 'exam', 'prescription', 'note', 'surgery',
]);

export const createClinicalRecordSchema = z.object({
  patientId: uuid,
  date: z.string().min(1, 'Data é obrigatória'),
  description: trimmedString,
  type: clinicalRecordType.optional().default('consultation'),
  diagnosis: optionalString,
  treatment: optionalString,
  medications: optionalString,
  observations: optionalString,
  dentistName: optionalString,
  attachments: z.array(z.string()).optional().default([]),
});

export const updateClinicalRecordSchema = z.object({
  date: z.string().optional(),
  description: z.string().trim().optional(),
  type: clinicalRecordType.optional(),
  diagnosis: optionalString,
  treatment: optionalString,
  medications: optionalString,
  observations: optionalString,
  dentistName: optionalString,
  attachments: z.array(z.string()).optional(),
});

// ─── Notifications ─────────────────────────────────────

const notificationType = z.enum(['info', 'success', 'warning']);

export const createNotificationSchema = z.object({
  title: trimmedString,
  message: trimmedString,
  type: notificationType.optional().default('info'),
});

export const updateNotificationSchema = z.object({
  read: z.boolean(),
});

// ─── Templates ─────────────────────────────────────────

export const createTemplateSchema = z.object({
  name: trimmedString,
  content: trimmedString,
  type: z.string().trim().optional().default('custom'),
});

export const updateTemplateSchema = z.object({
  name: trimmedString.optional(),
  content: trimmedString.optional(),
  type: z.string().trim().optional(),
});

// ─── Settings ──────────────────────────────────────────

export const updateSettingsSchema = z.object({
  defaultRole: z.string().optional(),
  messageTemplate: z.string().optional(),
});

// ─── User Settings ─────────────────────────────────────

const whatsappProvider = z.enum(['evolution', 'zapi', 'business_cloud']);

export const updateUserSettingsSchema = z.object({
  provider: whatsappProvider.optional().default('evolution'),
  evolutionApiUrl: optionalString,
  evolutionApiKey: optionalString,
  evolutionInstanceName: optionalString,
  zapiUrl: optionalString,
  zapiInstanceId: optionalString,
  zapiToken: optionalString,
  businessPhoneNumberId: optionalString,
  businessAccessToken: optionalString,
  reactivationMessage: optionalString,
  appointmentConfirmation: optionalString,
  appointmentReminder: optionalString,
  welcomeMessage: optionalString,
});

// ─── Calendar Sync ─────────────────────────────────────

const calendarProvider = z.enum(['google_calendar', 'ical_url']);

export const createCalendarSyncSchema = z.object({
  dentist_id: uuid,
  provider: calendarProvider,
  calendar_id: trimmedString,
  credentials: z.record(z.string(), z.unknown()).optional().default({}),
  sync_interval_minutes: z.number().int().min(5).max(1440).optional().default(15),
});

export const triggerCalendarSyncSchema = z.object({
  integration_id: uuid,
});

// ─── WhatsApp Send Bulk ────────────────────────────────

const recipient = z.object({
  id: trimmedString,
  name: trimmedString,
  phone: trimmedString,
});

export const sendBulkSchema = z.object({
  recipients: z.array(recipient).min(1, 'Nenhum destinatário selecionado'),
  templateId: z.string().optional(),
  customMessage: z.string().optional(),
  templateVariables: z.record(z.string(), z.string()).optional(),
});

// ─── Admin ─────────────────────────────────────────────

export const approveUserSchema = z.object({
  approved: z.boolean(),
});

const adminRole = z.enum(['admin', 'operador', 'visualizador']);

export const updateUserSchema = z.object({
  name: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  role: adminRole.optional(),
});

// ─── Agent Handoffs ────────────────────────────────────

export const handleHandoffSchema = z.object({
  handoffId: uuid,
  action: z.enum(['accept', 'reject']),
});
