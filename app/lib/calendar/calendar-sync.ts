import { getSupabaseClient } from '@/app/api/lib/supabase';

// --- Calendar Provider Interface ---
export interface ICalendarProvider {
  name: string;
  fetchEvents(from: Date, to: Date): Promise<ExternalCalendarEvent[]>;
}

export interface ExternalCalendarEvent {
  externalId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  description?: string;
}

// === iCal/ICS Provider (for dental software) ===
export class ICalProvider implements ICalendarProvider {
  name = 'ical';
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async fetchEvents(from: Date, to: Date): Promise<ExternalCalendarEvent[]> {
    const res = await fetch(this.url);
    if (!res.ok) throw new Error(`iCal fetch failed: ${res.status}`);
    const text = await res.text();
    return parseICalEvents(text, from, to);
  }
}

// === Google Calendar Provider (read-only) ===
export class GoogleCalendarProvider implements ICalendarProvider {
  name = 'google_calendar';
  private calendarId: string;
  private apiKey: string;

  constructor(calendarId: string, apiKey: string) {
    this.calendarId = calendarId;
    this.apiKey = apiKey;
  }

  async fetchEvents(from: Date, to: Date): Promise<ExternalCalendarEvent[]> {
    const params = new URLSearchParams({
      key: this.apiKey,
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '100',
    });

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Calendar fetch failed: ${res.status}`);
    const data = await res.json();

    return (data.items || []).map((item: Record<string, unknown>) => {
      const start = item.start as Record<string, string> | undefined;
      const end = item.end as Record<string, string> | undefined;
      const isAllDay = !!start?.date;
      return {
        externalId: item.id as string,
        title: (item.summary as string) || 'Sem título',
        startTime: new Date(start?.dateTime || start?.date || ''),
        endTime: new Date(end?.dateTime || end?.date || ''),
        allDay: isAllDay,
        description: item.description as string | undefined,
      };
    });
  }
}

// === Sync Logic ===
export async function syncCalendarIntegration(
  integrationId: string,
  userId: string,
): Promise<{ synced: number; errors: number }> {
  const supabase = getSupabaseClient();

  const { data: integration } = await supabase
    .from('calendar_integrations')
    .select('*')
    .eq('id', integrationId)
    .eq('user_id', userId)
    .single();

  if (!integration || !integration.sync_enabled) {
    return { synced: 0, errors: 0 };
  }

  const credentials = (integration.credentials || {}) as Record<string, string>;
  let provider: ICalendarProvider;

  if (integration.provider === 'ical_url') {
    provider = new ICalProvider(credentials.url || integration.calendar_id);
  } else if (integration.provider === 'google_calendar') {
    provider = new GoogleCalendarProvider(integration.calendar_id, credentials.api_key || '');
  } else {
    return { synced: 0, errors: 0 };
  }

  // Sync window: next 30 days
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 30);

  let events: ExternalCalendarEvent[];
  try {
    events = await provider.fetchEvents(from, to);
  } catch (err) {
    console.error(`calendar-sync: fetch error for integration ${integrationId}`, err);
    return { synced: 0, errors: 1 };
  }

  let synced = 0;
  let errors = 0;

  for (const event of events) {
    try {
      // Create schedule_block for each external event (read-only import)
      const { error } = await supabase
        .from('schedule_blocks')
        .upsert(
          {
            user_id: userId,
            dentist_id: integration.dentist_id,
            start_time: event.startTime.toISOString(),
            end_time: event.endTime.toISOString(),
            reason: event.title,
            source: `calendar_sync:${integration.provider}`,
          },
          { onConflict: 'user_id,dentist_id,start_time,source' }
        );

      if (error) {
        errors++;
      } else {
        synced++;
      }
    } catch {
      errors++;
    }
  }

  // Update last_synced_at
  await supabase
    .from('calendar_integrations')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', integrationId);

  return { synced, errors };
}

// === iCal Parser (minimal) ===
function parseICalEvents(text: string, from: Date, to: Date): ExternalCalendarEvent[] {
  const events: ExternalCalendarEvent[] = [];
  const blocks = text.split('BEGIN:VEVENT');

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0];
    const uid = extractICalProp(block, 'UID');
    const summary = extractICalProp(block, 'SUMMARY');
    const dtstart = extractICalProp(block, 'DTSTART');
    const dtend = extractICalProp(block, 'DTEND');
    const description = extractICalProp(block, 'DESCRIPTION');

    if (!dtstart) continue;

    const startTime = parseICalDate(dtstart);
    const endTime = dtend ? parseICalDate(dtend) : new Date(startTime.getTime() + 60 * 60 * 1000);
    const allDay = dtstart.length === 8; // YYYYMMDD format

    if (endTime < from || startTime > to) continue;

    events.push({
      externalId: uid || `ical-${i}`,
      title: summary || 'Evento',
      startTime,
      endTime,
      allDay,
      description: description || undefined,
    });
  }

  return events;
}

function extractICalProp(block: string, prop: string): string {
  const regex = new RegExp(`(?:^|\\n)${prop}[^:]*:(.+?)(?:\\r?\\n|$)`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
}

function parseICalDate(str: string): Date {
  // Handle YYYYMMDD and YYYYMMDDTHHMMSS and YYYYMMDDTHHMMSSZ
  const clean = str.replace(/[^0-9TZ]/g, '');
  if (clean.length === 8) {
    return new Date(`${clean.substring(0, 4)}-${clean.substring(4, 6)}-${clean.substring(6, 8)}T00:00:00`);
  }
  const iso = `${clean.substring(0, 4)}-${clean.substring(4, 6)}-${clean.substring(6, 8)}T${clean.substring(9, 11)}:${clean.substring(11, 13)}:${clean.substring(13, 15)}${clean.endsWith('Z') ? 'Z' : ''}`;
  return new Date(iso);
}
