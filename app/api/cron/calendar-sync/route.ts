import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/app/api/lib/supabase';
import { syncCalendarIntegration } from '@/app/lib/calendar/calendar-sync';

/**
 * GET /api/cron/calendar-sync — Vercel Cron Job
 * Syncs all active calendar integrations.
 * Configured in vercel.json to run every 15 minutes.
 *
 * Security: Protected by CRON_SECRET header check.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this automatically for cron jobs)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseClient();

  // Fetch all active integrations that need syncing
  const { data: integrations, error } = await supabase
    .from('calendar_integrations')
    .select('id, user_id, last_synced_at, sync_interval_minutes')
    .eq('sync_enabled', true);

  if (error) {
    console.error('cron/calendar-sync: Failed to fetch integrations', error.message);
    return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
  }

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ message: 'No active integrations', synced: 0 });
  }

  const now = new Date();
  const results: Array<{ id: string; synced: number; errors: number; skipped: boolean }> = [];

  for (const integration of integrations) {
    // Check if enough time has passed since last sync
    const lastSynced = integration.last_synced_at
      ? new Date(integration.last_synced_at)
      : new Date(0);
    const intervalMs = (integration.sync_interval_minutes || 15) * 60 * 1000;

    if (now.getTime() - lastSynced.getTime() < intervalMs) {
      results.push({ id: integration.id, synced: 0, errors: 0, skipped: true });
      continue;
    }

    try {
      const result = await syncCalendarIntegration(integration.id, integration.user_id);
      results.push({ id: integration.id, ...result, skipped: false });
    } catch (err) {
      console.error(`cron/calendar-sync: Error syncing integration ${integration.id}`, err);
      results.push({ id: integration.id, synced: 0, errors: 1, skipped: false });
    }
  }

  const totalSynced = results.reduce((acc, r) => acc + r.synced, 0);
  const totalErrors = results.reduce((acc, r) => acc + r.errors, 0);
  const totalSkipped = results.filter((r) => r.skipped).length;

  return NextResponse.json({
    message: 'Calendar sync completed',
    total_integrations: integrations.length,
    synced_events: totalSynced,
    errors: totalErrors,
    skipped: totalSkipped,
    details: results,
  });
}
