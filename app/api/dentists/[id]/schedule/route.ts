import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../../lib/auth';
import { getSupabaseClient } from '../../../lib/supabase';
import { parseBody, updateScheduleSchema } from '../../../lib/validators';

/**
 * GET /api/dentists/[id]/schedule — Get weekly schedule config for a dentist
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

  // Verify dentist belongs to user
  const { data: dentist } = await supabase
    .from('dentists')
    .select('id, name')
    .eq('id', id)
    .eq('user_id', auth.data.userId)
    .single();

  if (!dentist) {
    return NextResponse.json({ error: 'Dentista não encontrado' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('schedule_config')
    .select('*')
    .eq('dentist_id', id)
    .order('day_of_week');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ schedule: data ?? [] });
}

/**
 * PUT /api/dentists/[id]/schedule — Upsert weekly schedule config
 * Body: { days: [{ day_of_week, start_time, end_time, lunch_start?, lunch_end?, slot_duration_minutes?, is_active? }] }
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
  const parsed = await parseBody(request, updateScheduleSchema);
  if (parsed.error) return parsed.error;
  const { days } = parsed.data;

  const supabase = getSupabaseClient();

  // Verify dentist belongs to user
  const { data: dentist } = await supabase
    .from('dentists')
    .select('id')
    .eq('id', id)
    .eq('user_id', auth.data.userId)
    .single();

  if (!dentist) {
    return NextResponse.json({ error: 'Dentista não encontrado' }, { status: 404 });
  }

  const records = days.map((d) => ({
    dentist_id: id,
    day_of_week: d.day_of_week,
    start_time: d.start_time,
    end_time: d.end_time,
    lunch_start: d.lunch_start || null,
    lunch_end: d.lunch_end || null,
    slot_duration_minutes: d.slot_duration_minutes,
    is_active: d.is_active,
  }));

  const { data, error } = await supabase
    .from('schedule_config')
    .upsert(records, { onConflict: 'dentist_id,day_of_week' })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ schedule: data ?? [] });
}
