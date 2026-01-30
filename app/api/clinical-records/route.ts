import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../lib/auth';
import { getSupabaseClient } from '../lib/supabase';

/**
 * GET /api/clinical-records
 * Lista registros clínicos de um paciente
 * Query params: patientId (required)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId } = auth.data;
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json(
        { error: 'patientId é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Verificar se o paciente pertence ao usuário
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .eq('user_id', userId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      );
    }

    // Buscar registros clínicos
    const { data: records, error } = await supabase
      .from('clinical_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching clinical records:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar registros clínicos' },
        { status: 500 }
      );
    }

    return NextResponse.json(records || []);
  } catch (error) {
    console.error('Error in GET /api/clinical-records:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clinical-records
 * Cria um novo registro clínico
 */
export async function POST(request: NextRequest) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId } = auth.data;
    const body = await request.json();
    const {
      patientId,
      date,
      description,
      type,
      diagnosis,
      treatment,
      medications,
      observations,
      dentistName,
      attachments,
    } = body;

    if (!patientId || !date || !description) {
      return NextResponse.json(
        { error: 'patientId, date e description são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Verificar se o paciente pertence ao usuário
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .eq('user_id', userId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      );
    }

    // Criar registro clínico
    const { data: record, error } = await supabase
      .from('clinical_records')
      .insert({
        patient_id: patientId,
        user_id: userId,
        date: new Date(date).toISOString(),
        description,
        type: type || 'consultation',
        diagnosis: diagnosis || null,
        treatment: treatment || null,
        medications: medications || null,
        observations: observations || null,
        dentist_name: dentistName || null,
        attachments: attachments || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating clinical record:', error);
      return NextResponse.json(
        { error: 'Erro ao criar registro clínico' },
        { status: 500 }
      );
    }

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/clinical-records:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
