import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient } from '../../lib/supabase';
import { parseBody, updateNotificationSchema } from '../../lib/validators';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/notifications/[id] — Mark notification as read/unread
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const parsed = await parseBody(request, updateNotificationSchema);
  if (parsed.error) return parsed.error;
  const { read } = parsed.data;

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('notifications')
    .update({ read })
    .eq('id', id)
    .eq('user_id', auth.data.userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 });
  }

  return NextResponse.json({ notification: data });
}

/**
 * DELETE /api/notifications/[id] — Delete a notification
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.data.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
