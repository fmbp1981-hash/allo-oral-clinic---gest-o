import * as XLSX from 'xlsx';
import { normalizePhone } from '../whatsapp/normalize-phone';
import type { PatientHistoryEntry } from '@/types';

/** Uma linha bruta da planilha (antes de agrupar) */
interface RawPatientRow {
  name: string;
  category: string;
  dentist_name: string;
  phone: string;
  observations: string;
}

/** Registro final do paciente após agrupar múltiplas linhas pelo telefone */
export interface PatientRecord {
  name: string;
  phone: string;
  category: string;        // Procedimento da última ocorrência
  dentist_name: string;    // Dentista da última ocorrência
  observations: string;    // Observações da última ocorrência
  history: PatientHistoryEntry[];  // Todos os procedimentos (ordem de aparição)
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

/**
 * Parseia linhas brutas da planilha e retorna um registro por telefone.
 * Pacientes com múltiplas linhas têm todos os procedimentos em `history`.
 * Os campos `category`, `dentist_name` e `observations` refletem a última ocorrência.
 */
export function parsePatientRows(rows: RawRow[]): PatientRecord[] {
  const rawRows: RawPatientRow[] = [];

  for (const row of rows) {
    const name = findColumn(row, 'Nome do Paciente', 'nome do paciente', 'nome');
    const rawPhone = findColumn(row, 'Telefone Celular', 'telefone celular', 'telefone', 'celular');
    const category = findColumn(row, 'Categoria', 'categoria');
    const dentist_name = findColumn(row, 'Nome do Dentista', 'nome do dentista', 'dentista');
    const observations = findColumn(row, 'Observações', 'observações', 'observacoes', 'obs');

    if (!name) continue;

    const phone = normalizePhone(rawPhone);
    if (!phone) continue;

    rawRows.push({ name, category, dentist_name, phone, observations });
  }

  // Agrupa por telefone — múltiplas linhas do mesmo paciente formam o histórico
  const byPhone = new Map<string, RawPatientRow[]>();
  for (const row of rawRows) {
    const existing = byPhone.get(row.phone);
    if (existing) {
      existing.push(row);
    } else {
      byPhone.set(row.phone, [row]);
    }
  }

  const result: PatientRecord[] = [];

  for (const [phone, entries] of byPhone) {
    const last = entries[entries.length - 1];

    const history: PatientHistoryEntry[] = entries
      .filter(e => e.category || e.observations)  // pula linhas sem dados úteis
      .map(e => ({
        category: e.category,
        dentist_name: e.dentist_name,
        observations: e.observations,
      }));

    result.push({
      name: last.name,
      phone,
      category: last.category,
      dentist_name: last.dentist_name,
      observations: last.observations,
      history,
    });
  }

  return result;
}

/**
 * Parseia um buffer de arquivo Excel e retorna registros de pacientes agrupados por telefone.
 * Lê a primeira planilha.
 */
export function parseExcelBuffer(buffer: ArrayBuffer): { records: PatientRecord[]; rawRowCount: number; skippedRows: number } {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { records: [], rawRowCount: 0, skippedRows: 0 };

  const sheet = workbook.Sheets[sheetName];
  const rawRows: RawRow[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  const rawRowCount = rawRows.length;

  const records = parsePatientRows(rawRows);
  const skippedRows = rawRowCount - records.reduce((sum, r) => sum + Math.max(r.history.length, 1), 0);

  return { records, rawRowCount, skippedRows };
}
