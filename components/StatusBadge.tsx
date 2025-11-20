import React from 'react';
import { OpportunityStatus } from '../types';

interface StatusBadgeProps {
  status: OpportunityStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles = {
    [OpportunityStatus.NEW]: 'bg-blue-50 text-blue-700 border-blue-200',
    [OpportunityStatus.SENT]: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    [OpportunityStatus.RESPONDED]: 'bg-purple-50 text-purple-700 border-purple-200',
    [OpportunityStatus.SCHEDULED]: 'bg-green-50 text-green-700 border-green-200',
    [OpportunityStatus.ARCHIVED]: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  const labels = {
    [OpportunityStatus.NEW]: 'Identificado',
    [OpportunityStatus.SENT]: 'Contatado',
    [OpportunityStatus.RESPONDED]: 'Em Conversa',
    [OpportunityStatus.SCHEDULED]: 'Agendado',
    [OpportunityStatus.ARCHIVED]: 'Arquivado',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};
