import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../lib/auth';
import { getSupabaseClient } from '../lib/supabase';
import { parseBody, createDentistSchema } from '../lib/validators';
import { logAudit } from '../lib/audit';

/**
 * GET /api/dentists — List dentists for the authenticated user
 */
export async function GET(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getSupabaseClient();
  const activeOnly = request.nextUrl.searchParams.get('active') !== 'false';

  let query = supabase
    .from('dentists')
    .select('*')
    .eq('user_id', auth.data.userId)
    .order('name');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ dentists: data ?? [] });
}

/**
 * POST /api/dentists — Create a new dentist
 */
export async function POST(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = await parseBody(request, createDentistSchema);
  if (parsed.error) return parsed.error;
  const { name, specialty, crm, color, phone, email } = parsed.data;

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('dentists')
    .insert({
      user_id: auth.data.userId,
      name,
      specialty: specialty || null,
      crm: crm || null,
      color,
      phone: phone || null,
      email: email || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Já existe um dentista com este nome' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  logAudit({ userId: auth.data.userId, action: 'dentist_create', entityType: 'dentist', entityId: data.id, request });

  return NextResponse.json({ dentist: data }, { status: 201 });
}
