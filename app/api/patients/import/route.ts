import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader, isAuthError } from '../../lib/auth';
import { getSupabaseClient } from '../../lib/supabase';
import { parseExcelBuffer, PatientRecord } from '@/app/lib/patients/excel-parser';

/**
 * POST /api/patients/import
 * Accepts multipart/form-data with an Excel file (field: "file").
 * Groups rows by phone number — multiple rows = appointment history per patient.
 * Upserts patients on (user_id, phone) — requires migration 012.
 * Stores structured history (JSONB) — requires migration 018.
 */
export async function POST(request: NextRequest) {
  const auth = validateAuthHeader(request);
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { userId } = auth.data;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Campo "file" ausente' }, { status: 400 });
  }

  const arrayBuffer = await (file as File).arrayBuffer();
  const records: PatientRecord[] = parseExcelBuffer(arrayBuffer);

  if (records.length === 0) {
    return NextResponse.json(
      { error: 'Nenhum paciente válido encontrado no arquivo' },
      { status: 422 }
    );
  }

  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  // Records are already deduplicated by phone (one record per unique phone)
  const dbRecords = records.map((r) => ({
    user_id: userId,
    name: r.name,
    phone: r.phone,
    category: r.category || null,
    dentist_name: r.dentist_name || null,
    observations: r.observations || null,
    history: r.history,
    source: 'import',
    imported_at: now,
  }));

  // Batch upserts in chunks of 500 to avoid payload limits
  const CHUNK = 500;
  let inserted = 0;

  for (let i = 0; i < dbRecords.length; i += CHUNK) {
    const chunk = dbRecords.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('patients')
      .upsert(chunk, { onConflict: 'user_id,phone', ignoreDuplicates: false })
      .select('id');

    if (error) {
      console.error('Import upsert error:', error);
      return NextResponse.json({ error: `Erro ao importar: ${error.message}` }, { status: 500 });
    }

    inserted += data?.length ?? 0;
  }

  return NextResponse.json({
    success: true,
    total: records.length,
    inserted,
    updated: records.length - inserted,
  });
}
