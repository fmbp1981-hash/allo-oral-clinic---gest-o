import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status: Record<string, unknown> = {
    status: 'ok',
    version: '5.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  // Check Supabase connectivity
  try {
    const { getSupabaseClient } = await import('../lib/supabase');
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('users').select('id').limit(1);
    status.database = error ? 'error' : 'connected';
    if (error) {
      status.databaseError = error.message;
    }
  } catch {
    status.database = 'unavailable';
  }

  const httpStatus = status.database === 'connected' ? 200 : 503;
  return NextResponse.json(status, { status: httpStatus });
}
