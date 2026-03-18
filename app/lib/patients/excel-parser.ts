import * as XLSX from 'xlsx';
import { normalizePhone } from '../whatsapp/normalize-phone';

export interface PatientImportRow {
  name: string;
  category: string;
  dentist_name: string;
  phone: string;
  observations: string;
}

type RawRow = Record<string, unknown>;

function findColumn(row: RawRow, ...candidates: string[]): string {
  const lowerKeys = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
  );
  for (const candidate of candidates) {
    const val = lowerKeys[candidate.toLowerCase()];
    if (val !== undefined) return String(val ?? '').trim();
  }
  return '';
}

export function parsePatientRows(rows: RawRow[]): PatientImportRow[] {
  const result: PatientImportRow[] = [];

  for (const row of rows) {
    const name = findColumn(row, 'Nome do Paciente', 'nome do paciente', 'nome');
    const rawPhone = findColumn(row, 'Telefone Celular', 'telefone celular', 'telefone', 'celular');
    const category = findColumn(row, 'Categoria', 'categoria');
    const dentist_name = findColumn(row, 'Nome do Dentista', 'nome do dentista', 'dentista');
    const observations = findColumn(row, 'Observações', 'observações', 'observacoes', 'obs');

    if (!name) continue;

    const phone = normalizePhone(rawPhone);
    if (!phone) continue;

    result.push({ name, category, dentist_name, phone, observations });
  }

  return result;
}

/**
 * Parses an Excel file buffer and returns normalized patient rows.
 * Reads the first sheet.
 */
export function parseExcelBuffer(buffer: ArrayBuffer): PatientImportRow[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rawRows: RawRow[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return parsePatientRows(rawRows);
}
