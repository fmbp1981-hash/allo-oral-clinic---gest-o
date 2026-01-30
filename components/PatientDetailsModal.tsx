
import React, { useState, useEffect } from 'react';
import { X, Save, User, Calendar, Phone, FileText, Tag, Activity, Clock, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Opportunity, ClinicalRecord } from '../types';
import { StatusBadge } from './StatusBadge';
import { ProntuarioEditor } from './ProntuarioEditor';

interface PatientDetailsModalProps {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveNotes: (id: string, notes: string) => void;
  onSaveClinicalRecord?: (record: ClinicalRecord) => Promise<void>;
  onDeleteClinicalRecord?: (recordId: string) => Promise<void>;
}


export const PatientDetailsModal: React.FC<PatientDetailsModalProps> = ({
  opportunity,
  isOpen,
  onClose,
  onSaveNotes,
  onSaveClinicalRecord,
  onDeleteClinicalRecord
}) => {
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ClinicalRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (opportunity) {
      setNotes(opportunity.notes || '');
      setActiveTab('info'); // Reset tab on open
    }
  }, [opportunity]);

  if (!isOpen || !opportunity) return null;

  const handleSave = () => {
    onSaveNotes(opportunity.id, notes);
    onClose();
  };

  const handleOpenEditor = (record?: ClinicalRecord) => {
    setEditingRecord(record || null);
    setEditorOpen(true);
  };

  const handleSaveRecord = async (record: ClinicalRecord) => {
    if (onSaveClinicalRecord) {
      await onSaveClinicalRecord(record);
    }
    setEditorOpen(false);
    setEditingRecord(null);
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!onDeleteClinicalRecord) return;
    setDeletingId(recordId);
    try {
      await onDeleteClinicalRecord(recordId);
    } finally {
      setDeletingId(null);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-gray-50 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{opportunity.name}</h3>
            <p className="text-sm text-gray-500 flex items-center mt-1">
              ID: {opportunity.patientId} <span className="mx-2">•</span> <span className="text-indigo-600">{opportunity.keywordFound}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-100 flex gap-6">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            Geral e Anotações
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            Histórico Clínico
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white">

          {activeTab === 'info' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Info Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-3">Dados de Contato</h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <Phone size={16} className="text-gray-400 mr-3" />
                      <span className="text-sm text-gray-700">{opportunity.phone}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar size={16} className="text-gray-400 mr-3" />
                      <span className="text-sm text-gray-700">
                        Criado em: {new Date(opportunity.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <User size={16} className="text-gray-400 mr-3" />
                      <StatusBadge status={opportunity.status} />
                    </div>
                  </div>
                </div>

                {/* Context Card */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-indigo-400 uppercase mb-3">Motivo da Oportunidade</h4>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-md shadow-sm text-indigo-600">
                      <Tag size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-indigo-900">Busca por "{opportunity.keywordFound}"</p>
                      <p className="text-xs text-indigo-700 mt-1">
                        Paciente identificado através da busca ativa no banco de dados.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <FileText size={16} />
                  Anotações do Tratamento / Follow-up
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-yellow-50/30"
                  placeholder="Ex: Paciente interessado, mas pediu para ligar na próxima semana..."
                />
                <p className="mt-2 text-xs text-gray-400 text-right">
                  Última atualização: {opportunity.lastContact ? new Date(opportunity.lastContact).toLocaleString() : 'Nunca'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-gray-800 flex items-center">
                  <Activity size={18} className="mr-2 text-indigo-600" />
                  Prontuário - Registros Clínicos
                </h4>
                {onSaveClinicalRecord && (
                  <button
                    onClick={() => handleOpenEditor()}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={14} />
                    Novo Registro
                  </button>
                )}
              </div>

              {!opportunity.clinicalRecords || opportunity.clinicalRecords.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm">Nenhum registro clínico encontrado.</p>
                  {onSaveClinicalRecord && (
                    <button
                      onClick={() => handleOpenEditor()}
                      className="mt-3 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg text-sm font-medium"
                    >
                      <Plus size={14} className="inline mr-1" />
                      Adicionar primeiro registro
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative border-l-2 border-gray-200 ml-3 space-y-4">
                  {opportunity.clinicalRecords.map((record, index) => (
                    <div key={record.id || index} className="ml-6 relative group">
                      {/* Dot */}
                      <div className="absolute -left-[31px] top-3 h-4 w-4 rounded-full border-2 border-white bg-indigo-500 shadow-sm ring-2 ring-indigo-100"></div>

                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700 uppercase tracking-wide">
                                {record.type || 'Consulta'}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center">
                                <Clock size={12} className="mr-1" />
                                {new Date(record.date).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900">{record.description}</p>
                            {record.diagnosis && (
                              <p className="text-xs text-gray-600 mt-1">
                                <strong>Diagnóstico:</strong> {record.diagnosis}
                              </p>
                            )}
                            {record.treatment && (
                              <p className="text-xs text-gray-600 mt-1">
                                <strong>Tratamento:</strong> {record.treatment}
                              </p>
                            )}
                            {record.dentistName && (
                              <p className="text-xs text-gray-500 mt-1 flex items-center">
                                <User size={10} className="mr-1" />
                                {record.dentistName}
                              </p>
                            )}
                          </div>

                          {/* Action buttons */}
                          {(onSaveClinicalRecord || onDeleteClinicalRecord) && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {onSaveClinicalRecord && (
                                <button
                                  onClick={() => handleOpenEditor(record)}
                                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                  title="Editar"
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}
                              {onDeleteClinicalRecord && record.id && (
                                <button
                                  onClick={() => handleDeleteRecord(record.id!)}
                                  disabled={deletingId === record.id}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                  title="Excluir"
                                >
                                  {deletingId === record.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium">
            Fechar
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm">
            <Save size={16} />
            Salvar Alterações
          </button>
        </div>
      </div>

      {/* Prontuário Editor Modal */}
      <ProntuarioEditor
        isOpen={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingRecord(null);
        }}
        patientId={opportunity.patientId}
        patientName={opportunity.name}
        record={editingRecord}
        onSave={handleSaveRecord}
      />
    </div>
  );
};
