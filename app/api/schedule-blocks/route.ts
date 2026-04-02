import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../lib/auth';
import { getSupabaseClient } from '../lib/supabase';
import { parseBody, createScheduleBlockSchema } from '../lib/validators';

/**
 * GET /api/schedule-blocks?start_date=&end_date=&dentist_id=
 * List schedule blocks within a date range.
 */
export async function GET(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const dentistId = searchParams.get('dentist_id');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'start_date e end_date são obrigatórios' }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  let query = supabase
    .from('schedule_blocks')
    .select('*, dentists(id, name)')
    .eq('user_id', auth.data.userId)
    .lte('start_time', endDate + 'T23:59:59')
    .gte('end_time', startDate + 'T00:00:00')
    .order('start_time', { ascending: true });

  if (dentistId) {
    query = query.or(`dentist_id.eq.${dentistId},dentist_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ blocks: data || [] });
}

/**
 * POST /api/schedule-blocks — Create a new schedule block
 */
export async function POST(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = await parseBody(request, createScheduleBlockSchema);
  if (parsed.error) return parsed.error;
  const { dentist_id, start_time, end_time, reason, source } = parsed.data;

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('schedule_blocks')
    .insert({
      user_id: auth.data.userId,
      dentist_id: dentist_id || null,
      start_time,
      end_time,
      reason: reason || null,
      source,
    })
    .select('*, dentists(id, name)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ block: data }, { status: 201 });
}

/**
 * DELETE /api/schedule-blocks?id= — Delete a schedule block
 */
export async function DELETE(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
  }

  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('schedule_blocks')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.data.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
