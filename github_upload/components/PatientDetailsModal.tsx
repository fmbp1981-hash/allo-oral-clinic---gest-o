
import React, { useState, useEffect } from 'react';
import { X, Save, User, Calendar, Phone, FileText, Tag, Activity, Clock } from 'lucide-react';
import { Opportunity } from '../types';
import { StatusBadge } from './StatusBadge';

interface PatientDetailsModalProps {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveNotes: (id: string, notes: string) => void;
}

export const PatientDetailsModal: React.FC<PatientDetailsModalProps> = ({ 
  opportunity, 
  isOpen, 
  onClose, 
  onSaveNotes 
}) => {
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');

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
              <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                <Activity size={18} className="mr-2 text-indigo-600" />
                Linha do Tempo de Procedimentos
              </h4>

              {!opportunity.clinicalRecords || opportunity.clinicalRecords.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-gray-500 text-sm">Nenhum histórico clínico registrado para este paciente.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                  {opportunity.clinicalRecords.map((record, index) => (
                    <div key={index} className="mb-6 ml-6 relative group">
                      {/* Dot */}
                      <div className="absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-white bg-indigo-500 shadow-sm ring-2 ring-indigo-100"></div>
                      
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start bg-gray-50 p-3 rounded-lg border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{record.description}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white border border-gray-200 text-gray-500 uppercase tracking-wide">
                            {record.type || 'Geral'}
                          </span>
                        </div>
                        <div className="mt-2 sm:mt-0 sm:ml-4 flex items-center text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-100 shadow-sm">
                          <Clock size={12} className="mr-1.5" />
                          {new Date(record.date).toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
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
    </div>
  );
};
