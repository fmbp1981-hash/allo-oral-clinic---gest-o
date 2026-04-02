import { describe, it, expect, vi } from 'vitest';

// Mock supabase
vi.mock('@/app/api/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ single: () => ({ data: null }) }) }) }),
    }),
  }),
}));

// We test the iCal parser indirectly via the ICalProvider
// Since the parser is private, we'll test the exported class
import { ICalProvider } from '@/app/lib/calendar/calendar-sync';

describe('ICalProvider', () => {
  it('creates instance with URL', () => {
    const provider = new ICalProvider('https://example.com/cal.ics');
    expect(provider.name).toBe('ical');
  });

  it('handles fetch error gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    const provider = new ICalProvider('https://example.com/404.ics');
    await expect(provider.fetchEvents(new Date(), new Date())).rejects.toThrow('iCal fetch failed: 404');
  });

  it('parses basic iCal events', async () => {
    const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-1
SUMMARY:Consulta Dr. Maria
DTSTART:20250115T090000Z
DTEND:20250115T100000Z
END:VEVENT
BEGIN:VEVENT
UID:event-2
SUMMARY:Bloqueio Almoço
DTSTART:20250115T120000Z
DTEND:20250115T130000Z
END:VEVENT
END:VCALENDAR`;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(ical),
    });

    const provider = new ICalProvider('https://example.com/cal.ics');
    const from = new Date('2025-01-01');
    const to = new Date('2025-02-01');
    const events = await provider.fetchEvents(from, to);

    expect(events).toHaveLength(2);
    expect(events[0].externalId).toBe('event-1');
    expect(events[0].title).toBe('Consulta Dr. Maria');
    expect(events[1].externalId).toBe('event-2');
    expect(events[1].title).toBe('Bloqueio Almoço');
  });

  it('filters events outside date range', async () => {
    const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:old-event
SUMMARY:Old Appointment
DTSTART:20240101T090000Z
DTEND:20240101T100000Z
END:VEVENT
BEGIN:VEVENT
UID:future-event
SUMMARY:Future Appointment
DTSTART:20250215T090000Z
DTEND:20250215T100000Z
END:VEVENT
END:VCALENDAR`;

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(ical),
    });

    const provider = new ICalProvider('https://example.com/cal.ics');
    const from = new Date('2025-02-01');
    const to = new Date('2025-03-01');
    const events = await provider.fetchEvents(from, to);

    expect(events).toHaveLength(1);
    expect(events[0].externalId).toBe('future-event');
  });
});
