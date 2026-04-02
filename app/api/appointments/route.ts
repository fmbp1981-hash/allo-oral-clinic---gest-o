import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../lib/auth';
import { getSupabaseClient } from '../lib/supabase';
import { parseBody, createAppointmentSchema } from '../lib/validators';
import { logAudit } from '../lib/audit';

/**
 * GET /api/appointments — List appointments with date range and filters
 * Query: from, to, dentist_id, status, patient_id
 */
export async function GET(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseClient();
  const searchParams = request.nextUrl.searchParams;

  // Default: current week
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const from = searchParams.get('from') || startOfWeek.toISOString();
  const to = searchParams.get('to') || endOfWeek.toISOString();

  let query = supabase
    .from('appointments')
    .select('*, patients(id, name, phone), dentists(id, name, specialty, color)')
    .eq('user_id', auth.data.userId)
    .gte('start_time', from)
    .lte('start_time', to)
    .order('start_time');

  const dentistId = searchParams.get('dentist_id');
  if (dentistId) query = query.eq('dentist_id', dentistId);

  const status = searchParams.get('status');
  if (status) query = query.eq('status', status);

  const patientId = searchParams.get('patient_id');
  if (patientId) query = query.eq('patient_id', patientId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ appointments: data ?? [] });
}

/**
 * POST /api/appointments — Create a new appointment
 */
export async function POST(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = await parseBody(request, createAppointmentSchema);
  if (parsed.error) return parsed.error;
  const { patient_id, dentist_id, procedure, start_time, end_time, notes, source } = parsed.data;

  const supabase = getSupabaseClient();

  // Verify dentist belongs to user
  const { data: dentist } = await supabase
    .from('dentists')
    .select('id')
    .eq('id', dentist_id)
    .eq('user_id', auth.data.userId)
    .single();

  if (!dentist) {
    return NextResponse.json({ error: 'Dentista não encontrado' }, { status: 404 });
  }

  // Check for time conflicts with existing appointments
  const { data: conflicts } = await supabase
    .from('appointments')
    .select('id, start_time, end_time')
    .eq('dentist_id', dentist_id)
    .not('status', 'in', '("cancelled","rescheduled")')
    .lt('start_time', end_time)
    .gt('end_time', start_time);

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json(
      { error: 'Conflito de horário: já existe uma consulta agendada neste período' },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      user_id: auth.data.userId,
      patient_id,
      dentist_id,
      procedure: procedure?.trim() || null,
      start_time,
      end_time,
      notes: notes?.trim() || null,
      source: source || 'manual',
    })
    .select('*, patients(id, name, phone), dentists(id, name, specialty, color)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log history
  await supabase.from('appointment_history').insert({
    appointment_id: data.id,
    to_status: 'scheduled',
    changed_by: source === 'agent' ? 'agent' : auth.data.userId,
    notes: 'Consulta criada',
  });

  // Create reminders (24h before + 2h before)
  const apptStart = new Date(start_time);
  const reminder24h = new Date(apptStart.getTime() - 24 * 60 * 60 * 1000);
  const reminder2h = new Date(apptStart.getTime() - 2 * 60 * 60 * 1000);
  const now = new Date();

  const reminders = [];
  if (reminder24h > now) {
    reminders.push({
      appointment_id: data.id,
      user_id: auth.data.userId,
      reminder_type: '24h_before',
      scheduled_at: reminder24h.toISOString(),
      status: 'pending',
    });
  }
  if (reminder2h > now) {
    reminders.push({
      appointment_id: data.id,
      user_id: auth.data.userId,
      reminder_type: '2h_before',
      scheduled_at: reminder2h.toISOString(),
      status: 'pending',
    });
  }
  if (reminders.length > 0) {
    await supabase.from('appointment_reminders').insert(reminders);
  }

  logAudit({ userId: auth.data.userId, action: 'appointment_create', entityType: 'appointment', entityId: data.id, details: { dentist_id: data.dentist_id, patient_id: data.patient_id }, request });

  return NextResponse.json({ appointment: data }, { status: 201 });
}
