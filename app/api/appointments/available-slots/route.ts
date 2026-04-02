import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient } from '../../lib/supabase';

/**
 * GET /api/appointments/available-slots?dentist_id=&date=&duration_minutes=30
 * Computes available slots for a dentist on a specific date.
 */
export async function GET(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const dentistId = searchParams.get('dentist_id');
  const dateStr = searchParams.get('date'); // YYYY-MM-DD
  const durationMinutes = parseInt(searchParams.get('duration_minutes') || '30', 10);

  if (!dentistId || !dateStr) {
    return NextResponse.json({ error: 'dentist_id e date são obrigatórios' }, { status: 400 });
  }

  const targetDate = new Date(dateStr + 'T00:00:00');
  if (isNaN(targetDate.getTime())) {
    return NextResponse.json({ error: 'Data inválida' }, { status: 400 });
  }

  const dayOfWeek = targetDate.getDay(); // 0=Sunday
  const supabase = getSupabaseClient();

  // 1. Get schedule config for this day
  const { data: config } = await supabase
    .from('schedule_config')
    .select('*')
    .eq('dentist_id', dentistId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .single();

  if (!config) {
    return NextResponse.json({ slots: [], message: 'Dentista não atende neste dia' });
  }

  const slotDuration = config.slot_duration_minutes || durationMinutes;

  // 2. Generate all possible slots from schedule config
  const allSlots = generateTimeSlots(
    dateStr,
    config.start_time,
    config.end_time,
    config.lunch_start,
    config.lunch_end,
    slotDuration
  );

  // 3. Fetch existing appointments for this dentist on this date
  const dayStart = dateStr + 'T00:00:00';
  const dayEnd = dateStr + 'T23:59:59';

  const { data: appointments } = await supabase
    .from('appointments')
    .select('start_time, end_time')
    .eq('dentist_id', dentistId)
    .not('status', 'in', '("cancelled","rescheduled")')
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd);

  // 4. Fetch schedule blocks for this date
  const { data: blocks } = await supabase
    .from('schedule_blocks')
    .select('start_datetime, end_datetime')
    .eq('user_id', auth.data.userId)
    .lte('start_datetime', dayEnd)
    .gte('end_datetime', dayStart)
    .or(`dentist_id.eq.${dentistId},dentist_id.is.null`);

  // 5. Filter out occupied slots
  const occupiedRanges = [
    ...(appointments || []).map(a => ({ start: new Date(a.start_time), end: new Date(a.end_time) })),
    ...(blocks || []).map(b => ({ start: new Date(b.start_datetime), end: new Date(b.end_datetime) })),
  ];

  const availableSlots = allSlots.filter(slot => {
    const slotStart = new Date(slot.start_time);
    const slotEnd = new Date(slot.end_time);
    return !occupiedRanges.some(range =>
      slotStart < range.end && slotEnd > range.start
    );
  });

  // Filter out slots in the past
  const now = new Date();
  const futureSlots = availableSlots.filter(s => new Date(s.start_time) > now);

  return NextResponse.json({
    slots: futureSlots,
    total_possible: allSlots.length,
    total_available: futureSlots.length,
    dentist_id: dentistId,
    date: dateStr,
    slot_duration_minutes: slotDuration,
  });
}

/**
 * Generate time slots for a given date based on start/end times and lunch break.
 */
function generateTimeSlots(
  dateStr: string,
  startTime: string,   // "08:00:00"
  endTime: string,     // "18:00:00"
  lunchStart: string | null,
  lunchEnd: string | null,
  slotDurationMinutes: number
) {
  const slots: { start_time: string; end_time: string }[] = [];

  const dayBase = dateStr + 'T';
  const workStart = new Date(dayBase + startTime);
  const workEnd = new Date(dayBase + endTime);
  const lunchStartTime = lunchStart ? new Date(dayBase + lunchStart) : null;
  const lunchEndTime = lunchEnd ? new Date(dayBase + lunchEnd) : null;

  let cursor = new Date(workStart);

  while (cursor < workEnd) {
    const slotEnd = new Date(cursor.getTime() + slotDurationMinutes * 60 * 1000);

    // Don't exceed work end
    if (slotEnd > workEnd) break;

    // Skip lunch break
    if (lunchStartTime && lunchEndTime) {
      if (cursor < lunchEndTime && slotEnd > lunchStartTime) {
        cursor = new Date(lunchEndTime);
        continue;
      }
    }

    slots.push({
      start_time: cursor.toISOString(),
      end_time: slotEnd.toISOString(),
    });

    cursor = new Date(slotEnd);
  }

  return slots;
}
