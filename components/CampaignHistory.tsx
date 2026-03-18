import React, { useState, useEffect } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, CheckCircle, Clock, XCircle, Send } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  status: string;
  total_patients: number;
  sent_count: number;
  failed_count: number;
  message_template: string;
  created_at: string;
  sent_at?: string;
  completed_at?: string;
}

interface CampaignHistoryProps {
  onNewCampaign?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  draft: { label: 'Rascunho', icon: <Clock size={12} />, className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  sending: { label: 'Enviando', icon: <Send size={12} />, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  completed: { label: 'Concluída', icon: <CheckCircle size={12} />, className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  failed: { label: 'Falha', icon: <XCircle size={12} />, className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

export function CampaignHistory({ onNewCampaign }: CampaignHistoryProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function authHeaders() {
    const token = localStorage.getItem('auth_token');
    return { Authorization: `Bearer ${token}` };
  }

  async function loadCampaigns() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/campaigns', { headers: authHeaders() });
      const data: Campaign[] = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch {
      setError('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCampaigns(); }, []);

  function formatDate(iso?: string) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-4 text-center">Carregando campanhas...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Histórico de Campanhas</h4>
        <div className="flex gap-2">
          <button onClick={loadCampaigns} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Atualizar">
            <RefreshCw size={14} />
          </button>
          {onNewCampaign && (
            <button
              onClick={onNewCampaign}
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700"
            >
              + Nova Campanha
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {campaigns.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          Nenhuma campanha criada ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => (
            <div key={c.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedId((prev) => (prev === c.id ? null : c.id))}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={c.status} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{c.sent_count}/{c.total_patients} enviadas</span>
                  <span>{formatDate(c.created_at)}</span>
                  {expandedId === c.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {expandedId === c.id && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <p><span className="font-medium">Total:</span> {c.total_patients} pacientes</p>
                  <p><span className="font-medium">Enviadas:</span> {c.sent_count}</p>
                  <p><span className="font-medium">Falhas:</span> {c.failed_count}</p>
                  {c.sent_at && <p><span className="font-medium">Início:</span> {formatDate(c.sent_at)}</p>}
                  {c.completed_at && <p><span className="font-medium">Conclusão:</span> {formatDate(c.completed_at)}</p>}
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-500 mb-1">Modelo:</p>
                    <p className="text-xs italic">{c.message_template}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
