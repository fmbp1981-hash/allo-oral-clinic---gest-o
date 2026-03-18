import { describe, it, expect } from 'vitest';
import { parsePatientRows } from '@/app/lib/patients/excel-parser';

const VALID_ROW = {
  'Nome do Paciente': 'Maria Silva',
  'Categoria': 'Implante',
  'Nome do Dentista': 'Dr. João',
  'Telefone Celular': '(11) 98765-4321',
  'Observações': 'Retorno pendente',
};

describe('parsePatientRows', () => {
  it('maps valid row to PatientImportRow', () => {
    const [row] = parsePatientRows([VALID_ROW]);
    expect(row.name).toBe('Maria Silva');
    expect(row.category).toBe('Implante');
    expect(row.dentist_name).toBe('Dr. João');
    expect(row.phone).toBe('5511987654321');
    expect(row.observations).toBe('Retorno pendente');
  });

  it('normalizes phone number', () => {
    const [row] = parsePatientRows([{ ...VALID_ROW, 'Telefone Celular': '11987654321' }]);
    expect(row.phone).toBe('5511987654321');
  });

  it('skips rows with missing name', () => {
    const rows = parsePatientRows([{ ...VALID_ROW, 'Nome do Paciente': '' }]);
    expect(rows).toHaveLength(0);
  });

  it('skips rows with invalid phone', () => {
    const rows = parsePatientRows([{ ...VALID_ROW, 'Telefone Celular': '123' }]);
    expect(rows).toHaveLength(0);
  });

  it('handles column name variations (case-insensitive)', () => {
    const row = {
      'nome do paciente': 'Carlos',
      'categoria': 'Ortodontia',
      'nome do dentista': 'Dra. Ana',
      'telefone celular': '21987654321',
      'observações': '',
    };
    const [parsed] = parsePatientRows([row]);
    expect(parsed.name).toBe('Carlos');
    expect(parsed.phone).toBe('5521987654321');
  });

  it('returns empty array for empty input', () => {
    expect(parsePatientRows([])).toHaveLength(0);
  });
});
