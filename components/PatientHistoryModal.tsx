import React from 'react';
import { X, Stethoscope, User2 } from 'lucide-react';
import { Patient, PatientHistoryEntry } from '../types';

interface PatientHistoryModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PatientHistoryModal: React.FC<PatientHistoryModalProps> = ({
  patient,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !patient) return null;

  const history: PatientHistoryEntry[] = Array.isArray(patient.history) ? patient.history : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start bg-gray-50 dark:bg-gray-900 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Stethoscope size={18} className="text-indigo-500" />
              Histórico de Procedimentos
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
              <User2 size={13} />
              {patient.name} · {patient.phone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary bar */}
        {patient.category && (
          <div className="px-5 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800 shrink-0">
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="text-gray-500 dark:text-gray-400">Último procedimento:</span>
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">{patient.category}</span>
              {patient.dentist_name && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span className="text-gray-600 dark:text-gray-300">{patient.dentist_name}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* History list */}
        <div className="overflow-y-auto flex-1 p-5">
          {history.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Stethoscope size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum histórico disponível para este paciente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wider font-medium">
                {history.length} procedimento{history.length !== 1 ? 's' : ''} registrado{history.length !== 1 ? 's' : ''}
              </p>
              {history.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.category ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                          {entry.category}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sem categoria</span>
                      )}
                      {entry.dentist_name && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <User2 size={11} />
                          {entry.dentist_name}
                        </span>
                      )}
                    </div>
                    {entry.observations && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate" title={entry.observations}>
                        {entry.observations}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
