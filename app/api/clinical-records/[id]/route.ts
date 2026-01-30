import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient } from '../../lib/supabase';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/clinical-records/[id]
 * Obtém um registro clínico específico
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId } = auth.data;
    const { id } = await params;

    const supabase = getSupabaseClient();

    // Buscar registro clínico com validação de ownership
    const { data: record, error } = await supabase
      .from('clinical_records')
      .select(`
        *,
        patient:patients(id, name, user_id)
      `)
      .eq('id', id)
      .single();

    if (error || !record) {
      return NextResponse.json(
        { error: 'Registro não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o paciente pertence ao usuário
    if (record.patient?.user_id !== userId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error in GET /api/clinical-records/[id]:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/clinical-records/[id]
 * Atualiza um registro clínico
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId } = auth.data;
    const { id } = await params;
    const body = await request.json();

    const supabase = getSupabaseClient();

    // Verificar se o registro existe e pertence ao usuário
    const { data: existingRecord, error: fetchError } = await supabase
      .from('clinical_records')
      .select(`
        id,
        patient:patients(id, user_id)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !existingRecord) {
      return NextResponse.json(
        { error: 'Registro não encontrado' },
        { status: 404 }
      );
    }

    // Verificar ownership
    if (existingRecord.patient?.user_id !== userId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // Preparar dados para atualização
    const updateData: Record<string, unknown> = {};

    if (body.date !== undefined) updateData.date = new Date(body.date).toISOString();
    if (body.description !== undefined) updateData.description = body.description;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.diagnosis !== undefined) updateData.diagnosis = body.diagnosis;
    if (body.treatment !== undefined) updateData.treatment = body.treatment;
    if (body.medications !== undefined) updateData.medications = body.medications;
    if (body.observations !== undefined) updateData.observations = body.observations;
    if (body.dentistName !== undefined) updateData.dentist_name = body.dentistName;
    if (body.attachments !== undefined) updateData.attachments = body.attachments;

    // Atualizar registro
    const { data: record, error } = await supabase
      .from('clinical_records')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating clinical record:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar registro clínico' },
        { status: 500 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error in PUT /api/clinical-records/[id]:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clinical-records/[id]
 * Remove um registro clínico
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = validateAuthHeader(request);
    if (isAuthError(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { userId } = auth.data;
    const { id } = await params;

    const supabase = getSupabaseClient();

    // Verificar se o registro existe e pertence ao usuário
    const { data: existingRecord, error: fetchError } = await supabase
      .from('clinical_records')
      .select(`
        id,
        patient:patients(id, user_id)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !existingRecord) {
      return NextResponse.json(
        { error: 'Registro não encontrado' },
        { status: 404 }
      );
    }

    // Verificar ownership
    if (existingRecord.patient?.user_id !== userId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // Deletar registro
    const { error } = await supabase
      .from('clinical_records')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting clinical record:', error);
      return NextResponse.json(
        { error: 'Erro ao deletar registro clínico' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Registro deletado com sucesso' });
  } catch (error) {
    console.error('Error in DELETE /api/clinical-records/[id]:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
