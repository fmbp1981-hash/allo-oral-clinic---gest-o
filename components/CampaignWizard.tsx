import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Filter, Send, Loader2, Check, Users, MessageSquare, Eye } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  phone: string;
  category?: string;
  dentist_name?: string;
}

interface PatientsResponse {
  patients: Patient[];
  total: number;
  page: number;
  limit: number;
}

interface CampaignWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PAGE_SIZE = 50;

export function CampaignWizard({ isOpen, onClose, onSuccess }: CampaignWizardProps) {
  // Step 1: patient selection; Step 2: message template; Step 3: preview; Step 4: sending
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Patient list state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Campaign state
  const [campaignName, setCampaignName] = useState('');
  const [messageTemplate, setMessageTemplate] = useState(
    'Olá {nome}, aqui é da {clinica}. Notamos que faz um tempo desde sua última visita relacionada a {procedimento}. Que tal agendarmos uma avaliação? Estamos à disposição!'
  );
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, failed: 0 });
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview state
  interface PreviewItem { patientId: string; patientName: string; phone: string; personalized: string; error?: boolean }
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const authHeader = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, []);

  const loadPatients = useCallback(async () => {
    setLoadingPatients(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search) params.set('search', search);
      if (filterCategory) params.set('category', filterCategory);

      const res = await fetch(`/api/patients?${params.toString()}`, {
        headers: authHeader(),
      });
      const data: PatientsResponse = await res.json();
      setPatients(data.patients ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError('Erro ao carregar pacientes');
    } finally {
      setLoadingPatients(false);
    }
  }, [page, search, filterCategory, authHeader]);

  useEffect(() => {
    if (isOpen && step === 1) loadPatients();
  }, [isOpen, step, loadPatients]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === patients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(patients.map((p) => p.id)));
    }
  }

  async function handleCreateCampaign() {
    if (!campaignName.trim()) {
      setError('Nome da campanha é obrigatório');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({
          name: campaignName,
          patient_ids: Array.from(selectedIds),
          message_template: messageTemplate,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Erro ao criar campanha');
      }
      const campaign = await res.json() as { id: string };
      setCampaignId(campaign.id);
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar campanha');
    } finally {
      setCreating(false);
    }
  }

  async function handleSend() {
    if (!campaignId) return;
    setSending(true);
    setError(null);

    let done = false;
    let totalSent = 0;
    let totalFailed = 0;

    while (!done) {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/send`, {
          method: 'POST',
          headers: authHeader(),
        });
        if (!res.ok) {
          const err = await res.json() as { error?: string };
          throw new Error(err.error ?? 'Erro ao enviar');
        }
        const data = await res.json() as { completed: boolean; sent: number; failed: number };
        totalSent += data.sent;
        totalFailed += data.failed;
        setSendProgress({ sent: totalSent, failed: totalFailed });
        done = data.completed;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao enviar mensagens');
        break;
      }
    }

    setSending(false);
    if (!error) {
      setCompleted(true);
      onSuccess?.();
    }
  }

  function handleClose() {
    setStep(1);
    setSelectedIds(new Set());
    setCampaignId(null);
    setCompleted(false);
    setError(null);
    setSendProgress({ sent: 0, failed: 0 });
    setPreviews([]);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-2">
            <Send size={16} className="text-indigo-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Nova Campanha de Reativação</h3>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex gap-4 shrink-0">
          {[
            { n: 1, label: 'Selecionar Pacientes' },
            { n: 2, label: 'Mensagem' },
            { n: 3, label: 'Preview' },
            { n: 4, label: 'Enviar' },
          ].map(({ n, label }) => (
            <div key={n} className={`flex items-center gap-1.5 text-xs ${step === n ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === n ? 'bg-indigo-600 text-white' : step > n ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                {step > n ? <Check size={10} /> : n}
              </span>
              {label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* STEP 1: Patient selection */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou telefone..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Categoria..."
                  value={filterCategory}
                  onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
                  className="w-36 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{total} pacientes encontrados · {selectedIds.size} selecionados</span>
                <button onClick={toggleSelectAll} className="text-indigo-600 hover:underline">
                  {selectedIds.size === patients.length ? 'Desmarcar tudo' : 'Selecionar página'}
                </button>
              </div>

              {loadingPatients ? (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <Loader2 className="animate-spin h-5 w-5 mr-2" /> Carregando...
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-3 py-2 text-left"><input type="checkbox" checked={selectedIds.size === patients.length && patients.length > 0} onChange={toggleSelectAll} /></th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Nome</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Telefone</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Categoria</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {patients.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => toggleSelect(p.id)}
                          className={`cursor-pointer transition-colors ${selectedIds.has(p.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                        >
                          <td className="px-3 py-2"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} onClick={(e) => e.stopPropagation()} /></td>
                          <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{p.name}</td>
                          <td className="px-3 py-2 text-gray-500">{p.phone}</td>
                          <td className="px-3 py-2 text-gray-500">{p.category ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              <div className="flex justify-between items-center text-xs text-gray-500">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Anterior</button>
                <span>Página {page} de {Math.ceil(total / PAGE_SIZE)}</span>
                <button disabled={page * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Próxima</button>
              </div>
            </div>
          )}

          {/* STEP 2: Message template */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Campanha</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Reativação Março 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Modelo de Mensagem
                  <span className="ml-1 font-normal text-gray-400">(a IA personalizará para cada paciente)</span>
                </label>
                <textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Variáveis: {'{nome}'}, {'{clinica}'}, {'{procedimento}'}
                </p>
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                <Users size={14} className="shrink-0" />
                <span>{selectedIds.size} pacientes selecionados · A IA vai gerar uma mensagem personalizada para cada um.</span>
              </div>
            </div>
          )}

          {/* STEP 3: Preview */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                  <Eye size={16} className="text-indigo-500" />
                  Pré-visualização da IA
                </h4>
                {!loadingPreview && previews.length > 0 && (
                  <button
                    onClick={async () => {
                      setLoadingPreview(true);
                      try {
                        const res = await fetch('/api/campaigns/preview', {
                          method: 'POST',
                          headers: authHeader(),
                          body: JSON.stringify({ patient_ids: Array.from(selectedIds), message_template: messageTemplate, sample_size: 3 }),
                        });
                        const data = await res.json();
                        setPreviews(data.previews ?? []);
                      } catch { setError('Erro ao gerar preview'); } finally { setLoadingPreview(false); }
                    }}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Gerar novamente
                  </button>
                )}
              </div>

              {loadingPreview ? (
                <div className="flex items-center justify-center py-12 text-gray-400">
                  <Loader2 size={24} className="animate-spin mr-2" />
                  Gerando mensagens com IA...
                </div>
              ) : previews.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Clique &quot;Gerar Preview&quot; para visualizar</div>
              ) : (
                <div className="space-y-3">
                  {previews.map((p) => (
                    <div key={p.patientId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.patientName}</span>
                        <span className="text-xs text-gray-400">{p.phone}</span>
                        {p.error && <span className="text-xs text-amber-500">(fallback)</span>}
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{p.personalized}</p>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 text-center">
                    Mostrando {previews.length} de {selectedIds.size} mensagens. Cada paciente receberá uma mensagem personalizada única.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Send */}
          {step === 4 && (
            <div className="space-y-4 text-center py-6">
              {completed ? (
                <>
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <Check size={32} className="text-green-500" />
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Campanha concluída!</h4>
                  <p className="text-sm text-gray-500">
                    {sendProgress.sent} mensagens enviadas · {sendProgress.failed} falhas
                  </p>
                </>
              ) : sending ? (
                <>
                  <div className="flex justify-center">
                    <Loader2 size={48} className="animate-spin text-indigo-500" />
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Enviando mensagens...</h4>
                  <p className="text-sm text-gray-500">
                    {sendProgress.sent} enviadas · {sendProgress.failed} falhas
                  </p>
                  <p className="text-xs text-gray-400">Não feche esta janela</p>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                      <MessageSquare size={32} className="text-indigo-500" />
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Pronto para enviar</h4>
                  <p className="text-sm text-gray-500">
                    Campanha criada com {selectedIds.size} mensagens personalizadas pela IA.
                  </p>
                  <button
                    onClick={handleSend}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Iniciar Envio
                  </button>
                </>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex justify-between shrink-0">
          <button
            onClick={() => step > 1 && !sending && setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
            disabled={step === 1 || sending}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-40"
          >
            Voltar
          </button>

          {step === 1 && (
            <button
              onClick={() => { if (selectedIds.size > 0) setStep(2); else setError('Selecione pelo menos 1 paciente'); }}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40"
            >
              Próximo ({selectedIds.size})
            </button>
          )}

          {step === 2 && (
            <button
              onClick={async () => {
                if (!campaignName.trim()) { setError('Nome da campanha é obrigatório'); return; }
                setLoadingPreview(true);
                setError(null);
                setStep(3);
                try {
                  const res = await fetch('/api/campaigns/preview', {
                    method: 'POST',
                    headers: authHeader(),
                    body: JSON.stringify({ patient_ids: Array.from(selectedIds), message_template: messageTemplate, sample_size: 3 }),
                  });
                  const data = await res.json();
                  setPreviews(data.previews ?? []);
                } catch { setError('Erro ao gerar preview'); } finally { setLoadingPreview(false); }
              }}
              disabled={!campaignName.trim()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-2"
            >
              <Eye size={14} /> Preview
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleCreateCampaign}
              disabled={creating}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-2"
            >
              {creating ? <><Loader2 size={14} className="animate-spin" /> Processando...</> : 'Criar Campanha'}
            </button>
          )}

          {step === 4 && completed && (
            <button onClick={handleClose} className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
