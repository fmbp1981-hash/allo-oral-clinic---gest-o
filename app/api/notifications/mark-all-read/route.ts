import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient } from '../../lib/supabase';

/**
 * POST /api/notifications/mark-all-read — Mark all notifications as read
 */
export async function POST(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseClient();

  const { error, count } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', auth.data.userId)
    .eq('read', false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: count ?? 0 });
}
