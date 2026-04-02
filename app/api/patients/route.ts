import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../lib/supabase';
import { validateAuthHeader, isAuthError } from '../lib/auth';
import { parseBody, createPatientSchema } from '../lib/validators';
import { logAudit } from '../lib/audit';

// GET /api/patients - Lista pacientes do usuário com filtros opcionais
// Query params: category, dentist, search, page, limit
// Without page/limit → returns flat Patient[] (backwards compatible)
// With page/limit    → returns { patients, total, page, limit }
export async function GET(request: NextRequest) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const dentist = searchParams.get('dentist');
    const search = searchParams.get('search');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const paginated = !!(pageParam || limitParam);
    const page = Math.max(1, parseInt(pageParam ?? '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(limitParam ?? '50', 10)));

    let query = supabase
      .from('patients')
      .select('*', { count: 'exact' })
      .eq('user_id', auth.data.userId)
      .order('name', { ascending: true });

    if (category) query = query.eq('category', category);
    if (dentist) query = query.ilike('dentist_name', `%${dentist}%`);
    if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);

    if (paginated) {
      const from = (page - 1) * limit;
      query = query.range(from, from + limit - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const mapped = (data || []).map(p => ({
      id: p.id,
      name: p.name,
      phone: p.phone || '',
      email: p.email || undefined,
      category: p.category || undefined,
      dentist_name: p.dentist_name || undefined,
      observations: p.observations || undefined,
      source: p.source || 'manual',
      history: p.history || [],
      lastVisit: p.last_visit || undefined,
      imported_at: p.imported_at || undefined,
    }));

    if (paginated) {
      return NextResponse.json({ patients: mapped, total: count ?? 0, page, limit });
    }
    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Get patients error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pacientes' },
      { status: 500 }
    );
  }
}

// POST /api/patients - Cria um novo paciente
export async function POST(request: NextRequest) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = await parseBody(request, createPatientSchema);
    if (parsed.error) return parsed.error;
    const { name, phone, email, history } = parsed.data;

    const { data, error } = await supabase
      .from('patients')
      .insert({
        user_id: auth.data.userId,
        name,
        phone,
        email: email || null,
        history,
      })
      .select()
      .single();

    if (error) throw error;

    // Converter para formato esperado pelo frontend
    const patient = {
      id: data.id,
      name: data.name,
      phone: data.phone || '',
      email: data.email || undefined,
      history: data.history || [],
      lastVisit: data.last_visit || undefined,
    };

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    console.error('Create patient error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar paciente' },
      { status: 500 }
    );
  }
}

// DELETE /api/patients - Apaga todos os pacientes do usuário
export async function DELETE(request: NextRequest) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId } = auth.data;

    // Delete all patients belonging to this user
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting patients:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Base de pacientes apagada com sucesso' });
  } catch (error) {
    console.error('Delete patients error:', error);
    return NextResponse.json(
      { error: 'Erro ao apagar base de pacientes' },
      { status: 500 }
    );
  }
}
