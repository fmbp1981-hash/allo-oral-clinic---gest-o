import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, AlertCircle, Check } from 'lucide-react';
import {
  parsePatients,
  createEmptyPatient,
  isValidPatient,
  toPatientFormat,
  ParsedPatient
} from '../utils/parsePatients';
import { createPatient } from '../services/apiService';

interface TrelloImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  cardDesc: string;
  onImportSuccess: (count: number) => void;
}

export function TrelloImportModal({
  isOpen,
  onClose,
  cardName,
  cardDesc,
  onImportSuccess
}: TrelloImportModalProps) {
  const [patients, setPatients] = useState<ParsedPatient[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);

  // Parse patients when modal opens or content changes
  useEffect(() => {
    if (isOpen && cardDesc) {
      const parsed = parsePatients(cardDesc);
      // Se não encontrou pacientes, criar um vazio para preenchimento manual
      if (parsed.length === 0) {
        setPatients([{
          ...createEmptyPatient(),
          name: cardName // Usar nome do card como sugestão
        }]);
      } else {
        setPatients(parsed);
      }
      setError(null);
      setImportResults(null);
    }
  }, [isOpen, cardDesc, cardName]);

  // Update patient field
  const updatePatient = useCallback((id: string, field: keyof ParsedPatient, value: string) => {
    setPatients(prev => prev.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  }, []);

  // Remove patient from list
  const removePatient = useCallback((id: string) => {
    setPatients(prev => prev.filter(p => p.id !== id));
  }, []);

  // Add new empty patient
  const addPatient = useCallback(() => {
    setPatients(prev => [...prev, createEmptyPatient()]);
  }, []);

  // Import all valid patients
  const handleImport = async () => {
    const validPatients = patients.filter(isValidPatient);

    if (validPatients.length === 0) {
      setError('Adicione pelo menos um paciente com nome para importar.');
      return;
    }

    setImporting(true);
    setError(null);

    let successCount = 0;
    let failedCount = 0;

    for (const parsed of validPatients) {
      try {
        const patientData = toPatientFormat(parsed);
        await createPatient(patientData);
        successCount++;
      } catch (err) {
        console.error('Failed to import patient:', parsed.name, err);
        failedCount++;
      }
    }

    setImporting(false);
    setImportResults({ success: successCount, failed: failedCount });

    if (successCount > 0) {
      // Aguardar um pouco antes de fechar para mostrar resultado
      setTimeout(() => {
        onImportSuccess(successCount);
        onClose();
      }, 1500);
    }
  };

  // Count valid patients
  const validCount = patients.filter(isValidPatient).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Importar Pacientes do Card
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {cardName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Original Content Preview */}
          {cardDesc && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Conteúdo Original do Card:
              </label>
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-32 overflow-y-auto">
                <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono">
                  {cardDesc}
                </pre>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${
              importResults.failed === 0
                ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400'
                : 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400'
            }`}>
              <Check size={18} />
              <span className="text-sm">
                {importResults.success} paciente(s) importado(s) com sucesso
                {importResults.failed > 0 && ` (${importResults.failed} falhou)`}
              </span>
            </div>
          )}

          {/* Patients Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Pacientes Detectados ({patients.length}):
              </label>
              <button
                onClick={addPatient}
                className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
              >
                <Plus size={16} />
                Adicionar Paciente
              </button>
            </div>

            {patients.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Nenhum paciente detectado no texto.</p>
                <button
                  onClick={addPatient}
                  className="mt-2 text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Adicionar manualmente
                </button>
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Nome *
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Telefone
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Email
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          Tratamento
                        </th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {patients.map((patient) => (
                        <tr key={patient.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={patient.name}
                              onChange={(e) => updatePatient(patient.id, 'name', e.target.value)}
                              className={`w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500 ${
                                !patient.name.trim()
                                  ? 'border-red-300 dark:border-red-600'
                                  : 'border-gray-200 dark:border-gray-600'
                              }`}
                              placeholder="Nome do paciente"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={patient.phone}
                              onChange={(e) => updatePatient(patient.id, 'phone', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                              placeholder="(00) 00000-0000"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="email"
                              value={patient.email}
                              onChange={(e) => updatePatient(patient.id, 'email', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                              placeholder="email@exemplo.com"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={patient.treatment}
                              onChange={(e) => updatePatient(patient.id, 'treatment', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                              placeholder="Tipo de tratamento"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => removePatient(patient.id)}
                              className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="Remover paciente"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {validCount} de {patients.length} paciente(s) válido(s) para importar
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Importando...
                </>
              ) : (
                `Importar ${validCount} Paciente${validCount !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
