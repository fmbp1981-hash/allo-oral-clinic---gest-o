import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient } from '../../lib/supabase';
import { parseBody, updateAppointmentSchema } from '../../lib/validators';
import { logAudit } from '../../lib/audit';

/**
 * GET /api/appointments/[id] — Get a single appointment with relations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('appointments')
    .select('*, patients(id, name, phone), dentists(id, name, specialty, color), appointment_history(*)')
    .eq('id', id)
    .eq('user_id', auth.data.userId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 });
  }

  return NextResponse.json({ appointment: data });
}

/**
 * PUT /api/appointments/[id] — Update appointment (status, reschedule, notes)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const parsed = await parseBody(request, updateAppointmentSchema);
  if (parsed.error) return parsed.error;
  const { status, start_time, end_time, notes, procedure, dentist_id, cancellation_reason } = parsed.data;

  const supabase = getSupabaseClient();

  // Fetch existing appointment
  const { data: existing } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .eq('user_id', auth.data.userId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  // Status change
  if (status && status !== existing.status) {
    updates.status = status;

    // Log status change in history
    await supabase.from('appointment_history').insert({
      appointment_id: id,
      from_status: existing.status,
      to_status: status,
      changed_by: auth.data.userId,
      notes: cancellation_reason || null,
    });

    if (status === 'cancelled') {
      updates.cancellation_reason = cancellation_reason || null;
      // Cancel pending reminders
      await supabase
        .from('appointment_reminders')
        .update({ status: 'cancelled' })
        .eq('appointment_id', id)
        .eq('status', 'pending');
    }
  }

  // Reschedule (new times)
  if (start_time && end_time) {
    const targetDentist = dentist_id || existing.dentist_id;

    // Check conflicts (exclude self)
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('dentist_id', targetDentist)
      .not('status', 'in', '("cancelled","rescheduled")')
      .neq('id', id)
      .lt('start_time', end_time)
      .gt('end_time', start_time);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Conflito de horário com outra consulta' },
        { status: 409 }
      );
    }

    updates.start_time = start_time;
    updates.end_time = end_time;

    // Recreate reminders for new time
    await supabase
      .from('appointment_reminders')
      .update({ status: 'cancelled' })
      .eq('appointment_id', id)
      .eq('status', 'pending');

    const apptStart = new Date(start_time);
    const now = new Date();
    const reminders = [];
    const r24h = new Date(apptStart.getTime() - 24 * 60 * 60 * 1000);
    const r2h = new Date(apptStart.getTime() - 2 * 60 * 60 * 1000);
    if (r24h > now) reminders.push({ appointment_id: id, user_id: auth.data.userId, reminder_type: '24h_before', scheduled_at: r24h.toISOString(), status: 'pending' });
    if (r2h > now) reminders.push({ appointment_id: id, user_id: auth.data.userId, reminder_type: '2h_before', scheduled_at: r2h.toISOString(), status: 'pending' });
    if (reminders.length > 0) await supabase.from('appointment_reminders').insert(reminders);
  }

  if (notes !== undefined) updates.notes = notes;
  if (procedure !== undefined) updates.procedure = procedure;
  if (dentist_id !== undefined) updates.dentist_id = dentist_id;

  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select('*, patients(id, name, phone), dentists(id, name, specialty, color)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logAudit({ userId: auth.data.userId, action: 'appointment_update', entityType: 'appointment', entityId: id, details: { changes: Object.keys(updates) }, request });

  return NextResponse.json({ appointment: data });
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const supabase = getSupabaseClient();

  let cancellationReason = 'Cancelado pelo usuário';
  try {
    const body = await request.json();
    if (body.reason) cancellationReason = body.reason;
  } catch {
    // No body — use default reason
  }

  const { data: existing } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', auth.data.userId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 });
  }

  // Log cancellation
  await supabase.from('appointment_history').insert({
    appointment_id: id,
    from_status: existing.status,
    to_status: 'cancelled',
    changed_by: auth.data.userId,
    notes: cancellationReason,
  });

  // Cancel pending reminders
  await supabase
    .from('appointment_reminders')
    .update({ status: 'cancelled' })
    .eq('appointment_id', id)
    .eq('status', 'pending');

  const { data, error } = await supabase
    .from('appointments')
    .update({
      status: 'cancelled',
      cancellation_reason: cancellationReason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, status, cancellation_reason')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logAudit({ userId: auth.data.userId, action: 'appointment_cancel', entityType: 'appointment', entityId: id, details: { reason: cancellationReason }, request });

  return NextResponse.json({ appointment: data });
}
