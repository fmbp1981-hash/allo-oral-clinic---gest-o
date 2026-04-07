import React, { useState, useMemo } from 'react';
import { Opportunity, OpportunityStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { MessageCircle, CheckCircle, XCircle, MoreHorizontal, Calendar, Loader2, Eye, FileText, Search, Filter, X } from 'lucide-react';
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

  // Estados dos filtros
  const [searchName, setSearchName] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const statusLabels: Record<string, string> = {
    [OpportunityStatus.NEW]: 'Novo',
    [OpportunityStatus.SENT]: 'Contatado',
    [OpportunityStatus.RESPONDED]: 'Respondido',
    [OpportunityStatus.SCHEDULED]: 'Agendado',
    [OpportunityStatus.ARCHIVED]: 'Arquivado',
  };

  // Tags únicas extraídas dos dados
  const uniqueTags = useMemo(() => {
    const tags = new Set(items.map(i => i.keywordFound).filter(Boolean));
    return Array.from(tags).sort();
  }, [items]);

  // Filtragem
  const filteredItems = useMemo(() => {
    return items.filter(opp => {
      if (searchName && !opp.name.toLowerCase().includes(searchName.toLowerCase()) && !opp.phone.includes(searchName)) return false;
      if (filterTag && opp.keywordFound !== filterTag) return false;
      if (filterStatus && opp.status !== filterStatus) return false;
      return true;
    });
  }, [items, searchName, filterTag, filterStatus]);

  const hasActiveFilters = searchName || filterTag || filterStatus;
  const clearFilters = () => { setSearchName(''); setFilterTag(''); setFilterStatus(''); };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      onSelectionChange(filteredItems.map(i => i.id));
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

  const allSelected = filteredItems.length > 0 && selectedIds.length === filteredItems.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filteredItems.length;

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
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
        <Filter size={16} className="text-gray-400 flex-shrink-0" />

        {/* Busca por nome/telefone */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar nome ou telefone..."
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          />
        </div>

        {/* Filtro por Tag/Motivo */}
        <select
          value={filterTag}
          onChange={e => setFilterTag(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 min-w-[140px]"
        >
          <option value="">Todos os motivos</option>
          {uniqueTags.map(tag => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>

        {/* Filtro por Status */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-700 min-w-[130px]"
        >
          <option value="">Todos os status</option>
          {Object.entries(statusLabels).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        {/* Limpar filtros + contador */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            <X size={14} /> Limpar filtros
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400">
          {filteredItems.length} de {items.length} pacientes
        </span>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
      <table className="min-w-[900px] w-full divide-y divide-gray-200">
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
          {filteredItems.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400">
                Nenhum paciente encontrado com os filtros aplicados.
              </td>
            </tr>
          ) : filteredItems.map((opp) => (
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
    </div>
  );
};