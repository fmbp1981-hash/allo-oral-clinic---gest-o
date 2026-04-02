import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient } from '../../lib/supabase';
import { parseBody, updateDentistSchema } from '../../lib/validators';
import { logAudit } from '../../lib/audit';

/**
 * PUT /api/dentists/[id] — Update a dentist
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
  const parsed = await parseBody(request, updateDentistSchema);
  if (parsed.error) return parsed.error;
  const { name, specialty, crm, color, phone, email, is_active } = parsed.data;

  const supabase = getSupabaseClient();

  // Verify dentist belongs to user
  const { data: existing } = await supabase
    .from('dentists')
    .select('id')
    .eq('id', id)
    .eq('user_id', auth.data.userId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Dentista não encontrado' }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (specialty !== undefined) updates.specialty = specialty || null;
  if (crm !== undefined) updates.crm = crm || null;
  if (color !== undefined) updates.color = color;
  if (phone !== undefined) updates.phone = phone || null;
  if (email !== undefined) updates.email = email || null;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabase
    .from('dentists')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logAudit({ userId: auth.data.userId, action: 'dentist_update', entityType: 'dentist', entityId: id, request });

  return NextResponse.json({ dentist: data });
}

/**
 * DELETE /api/dentists/[id] — Soft-delete (deactivate) a dentist
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('dentists')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', auth.data.userId)
    .select('id, is_active')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Dentista não encontrado' }, { status: 404 });
  }

  logAudit({ userId: auth.data.userId, action: 'dentist_delete', entityType: 'dentist', entityId: id, request });

  return NextResponse.json({ dentist: data });
}
