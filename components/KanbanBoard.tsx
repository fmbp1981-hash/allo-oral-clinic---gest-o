

import React, { useState } from 'react';
import { Opportunity, OpportunityStatus } from '../types';
import { MessageCircle, Calendar, Clock, CheckCircle, Phone, AlignLeft } from 'lucide-react';
import { sendWhatsAppMessage } from '../services/whatsappService';

interface KanbanBoardProps {
  opportunities: Opportunity[];
  onUpdateStatus: (id: string, status: OpportunityStatus) => void;
  onViewDetails: (opp: Opportunity) => void;
}

const COLUMNS: { id: OpportunityStatus; title: string; color: string; borderColor: string }[] = [
  { id: OpportunityStatus.NEW, title: 'Identificado', color: 'bg-blue-50 dark:bg-blue-900/40', borderColor: 'border-blue-200 dark:border-blue-700' },
  { id: OpportunityStatus.SENT, title: 'Contatado', color: 'bg-yellow-50 dark:bg-yellow-900/40', borderColor: 'border-yellow-200 dark:border-yellow-700' },
  { id: OpportunityStatus.RESPONDED, title: 'Em Conversa', color: 'bg-purple-50 dark:bg-purple-900/40', borderColor: 'border-purple-200 dark:border-purple-700' },
  { id: OpportunityStatus.SCHEDULED, title: 'Agendado', color: 'bg-green-50 dark:bg-green-900/40', borderColor: 'border-green-200 dark:border-green-700' },
  // Opcional: Arquivado pode ficar fora ou no final
  { id: OpportunityStatus.ARCHIVED, title: 'Arquivado', color: 'bg-gray-50 dark:bg-gray-700', borderColor: 'border-gray-200 dark:border-gray-600' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ opportunities, onUpdateStatus, onViewDetails }) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessário para permitir o drop
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: OpportunityStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');

    if (id) {
      onUpdateStatus(id, targetStatus);
    }
    setDraggedId(null);
  };

  const handleQuickMessage = async (e: React.MouseEvent, opp: Opportunity) => {
    e.stopPropagation();
    try {
      await sendWhatsAppMessage(opp);
      if (opp.status === OpportunityStatus.NEW) {
        onUpdateStatus(opp.id, OpportunityStatus.SENT);
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      alert("Erro ao enviar mensagem.");
    }
  };

  return (
    <div className="h-full overflow-x-auto pb-4">
      <div className="flex space-x-4 min-w-[1200px] h-[calc(100vh-14rem)]">
        {COLUMNS.map((col) => {
          const items = opportunities.filter((o) => o.status === col.id);

          return (
            <div
              key={col.id}
              className={`flex-1 flex flex-col rounded-xl border ${col.borderColor} bg-gray-50/50 dark:bg-gray-800/50 min-w-[280px]`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Header da Coluna */}
              <div className={`p-3 rounded-t-xl border-b ${col.borderColor} ${col.color} flex justify-between items-center`}>
                <h3 className="font-semibold text-gray-700 dark:text-gray-100 text-sm">{col.title}</h3>
                <span className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 dark:text-gray-300 shadow-sm">
                  {items.length}
                </span>
              </div>

              {/* Área de Cards */}
              <div className="flex-1 p-2 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-gray-300">
                {items.map((opp) => (
                  <div
                    key={opp.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, opp.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onClick={() => onViewDetails(opp)}
                    className={`
                      bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 cursor-move
                      hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group relative
                      ${draggedId === opp.id ? 'opacity-50' : 'opacity-100'}
                    `}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white text-sm">{opp.name}</p>
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <Phone size={10} className="mr-1" />
                          {opp.phone}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleQuickMessage(e, opp)}
                        className="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 p-1 rounded transition-colors"
                        title="Enviar Mensagem"
                      >
                        <MessageCircle size={16} />
                      </button>
                    </div>

                    <div className="mb-2 flex justify-between items-center">
                      <span className="inline-block px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium rounded border border-indigo-100 dark:border-indigo-700">
                        {opp.keywordFound}
                      </span>
                      {opp.notes && (
                        <span title="Possui anotações">
                          <AlignLeft size={12} className="text-gray-400 dark:text-gray-500" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-600 text-[10px] text-gray-400 dark:text-gray-500">
                      <div className="flex items-center">
                        <Clock size={10} className="mr-1" />
                        {new Date(opp.createdAt).toLocaleDateString()}
                      </div>
                      {opp.lastContact && (
                        <div className="flex items-center text-orange-400" title="Último contato">
                          <CheckCircle size={10} className="mr-1" />
                          {new Date(opp.lastContact).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="h-24 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Arraste aqui</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
