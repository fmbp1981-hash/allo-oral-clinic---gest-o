import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../lib/auth';
import { getSupabaseClient } from '../lib/supabase';
import { parseBody, createNotificationSchema } from '../lib/validators';

/**
 * GET /api/notifications — List notifications for the authenticated user
 * Query: limit (default 50), unread_only (boolean)
 */
export async function GET(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseClient();
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const unreadOnly = searchParams.get('unread_only') === 'true';

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', auth.data.userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const unreadCount = (data || []).filter((n) => !n.read).length;

  return NextResponse.json({
    notifications: data || [],
    unread_count: unreadCount,
  });
}

/**
 * POST /api/notifications — Create a new notification
 */
export async function POST(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = await parseBody(request, createNotificationSchema);
  if (parsed.error) return parsed.error;
  const { title, message, type } = parsed.data;

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: auth.data.userId,
      title,
      message,
      type,
      read: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notification: data }, { status: 201 });
}
