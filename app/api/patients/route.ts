import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../lib/supabase';
import { validateAuthHeader, isAuthError } from '../lib/auth';

// GET /api/patients - Lista todos os pacientes do usuário
export async function GET(request: NextRequest) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', auth.data.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Converter para formato esperado pelo frontend
    const patients = (data || []).map(p => ({
      id: p.id,
      name: p.name,
      phone: p.phone || '',
      email: p.email || undefined,
      history: p.history || [],
      lastVisit: p.last_visit || undefined,
    }));

    return NextResponse.json(patients);
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

    const body = await request.json();
    const { name, phone, email, history } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('patients')
      .insert({
        user_id: auth.data.userId,
        name: name.trim(),
        phone: phone || '',
        email: email || null,
        history: history || [],
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
