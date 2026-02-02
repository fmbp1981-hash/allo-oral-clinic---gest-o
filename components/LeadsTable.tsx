import React, { useState } from 'react';
import { Opportunity, OpportunityStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { MessageCircle, CheckCircle, XCircle, MoreHorizontal, Calendar, Loader2, Eye, FileText } from 'lucide-react';
import { sendMessageToPatient } from '../services/apiService';

interface PatientsTableProps {
  items: Opportunity[];
  onUpdateStatus: (id: string, status: OpportunityStatus) => void;
  onViewDetails: (opp: Opportunity) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export const PatientsTable: React.FC<PatientsTableProps> = ({
  items,
  onUpdateStatus,
  onViewDetails,
  selectedIds = [],
  onSelectionChange
}) => {
  // Estado para controlar qual linha está enviando mensagem
  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      onSelectionChange(items.map(i => i.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    e.stopPropagation();
    if (!onSelectionChange) return;

    if (e.target.checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < items.length;

  const handleActionClick = async (e: React.MouseEvent, opp: Opportunity) => {
    e.stopPropagation();
    setSendingId(opp.id);

    try {
      await sendMessageToPatient(opp);

      // Se sucesso, atualiza status automaticamente se for novo
      if (opp.status === OpportunityStatus.NEW) {
        onUpdateStatus(opp.id, OpportunityStatus.SENT);
      }
    } catch (error) {
      alert("Erro ao enviar mensagem via integração. Verifique as configurações.");
    } finally {
      setSendingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="bg-gray-50 p-4 rounded-full mb-3">
          <MessageCircle className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-sm font-medium text-gray-900">Nenhum paciente em processo</h3>
        <p className="text-gray-500 text-xs mt-1">Utilize a Busca Ativa para encontrar pacientes para reativação.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50/50">
          <tr>
            <th className="px-6 py-3 w-4">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                checked={allSelected}
                ref={input => {
                  if (input) input.indeterminate = isIndeterminate;
                }}
                onChange={handleSelectAll}
                disabled={!onSelectionChange}
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivo (Tag)</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Procedimento</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Ação</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {items.map((opp) => (
            <tr key={opp.id} className={`hover:bg-gray-50/80 transition-colors group cursor-pointer ${selectedIds.includes(opp.id) ? 'bg-indigo-50/30' : ''}`} onClick={() => onViewDetails(opp)}>
              <td className="px-6 py-4 w-4">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  checked={selectedIds.includes(opp.id)}
                  onChange={(e) => handleSelectOne(e, opp.id)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={!onSelectionChange}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-9 w-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm">
                    {opp.name.charAt(0)}
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{opp.name}</div>
                    <div className="text-xs text-gray-500">{opp.phone}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {opp.keywordFound}
                  </span>
                  {opp.notes && <FileText size={14} className="text-gray-400" />}
                </div>
              </td>
              {/* Coluna de Histórico Recente */}
              <td className="px-6 py-4">
                {opp.clinicalRecords && opp.clinicalRecords.length > 0 ? (
                  <div className="text-xs text-gray-600 max-w-[200px] truncate">
                    <span className="font-semibold text-gray-800">
                      {new Date(opp.clinicalRecords[0].date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}:
                    </span> {opp.clinicalRecords[0].description}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">- Sem histórico -</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={opp.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {opp.lastContact ? new Date(opp.lastContact).toLocaleDateString('pt-BR') : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">

                  <button
                    onClick={(e) => { e.stopPropagation(); onViewDetails(opp); }}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors"
                    title="Ver Detalhes Completos"
                  >
                    <Eye size={18} />
                  </button>

                  <button
                    onClick={(e) => handleActionClick(e, opp)}
                    disabled={sendingId === opp.id}
                    className={`p-1.5 rounded-md transition-colors ${sendingId === opp.id
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      : 'text-green-600 hover:bg-green-50'
                      }`}
                    title="Enviar Mensagem (WhatsApp)"
                  >
                    {sendingId === opp.id ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <MessageCircle size={18} />
                    )}
                  </button>

                  <div className="relative group/menu">
                    <button className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-md">
                      <MoreHorizontal size={18} />
                    </button>
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg py-1 z-20 hidden group-hover/menu:block border border-gray-100 ring-1 ring-black ring-opacity-5">
                      <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Mudar Status</div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onUpdateStatus(opp.id, OpportunityStatus.SENT); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <CheckCircle size={14} className="mr-2 text-yellow-500" /> Contatado
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onUpdateStatus(opp.id, OpportunityStatus.RESPONDED); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <MessageCircle size={14} className="mr-2 text-purple-500" /> Respondido
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onUpdateStatus(opp.id, OpportunityStatus.SCHEDULED); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <Calendar size={14} className="mr-2 text-green-500" /> Agendado
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onUpdateStatus(opp.id, OpportunityStatus.ARCHIVED); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <XCircle size={14} className="mr-2 text-gray-400" /> Arquivar
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};