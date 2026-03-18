import React, { useState, useEffect } from 'react';
import { Bot, ChevronDown, ChevronUp, Copy, Check, Loader2 } from 'lucide-react';

interface AgentConfig {
  enabled: boolean;
  name: string;
  clinic_name: string;
  specialties: string[];
  tone: string;
  custom_instructions: string;
  openai_model: string;
  max_context_messages: number;
}

interface AgentConfigPanelProps {
  /** Current WhatsApp provider ('evolution' | 'meta'), used to show correct webhook URL */
  provider?: 'evolution' | 'meta' | string;
}

const SPECIALTY_OPTIONS = [
  'Implante', 'Ortodontia', 'Clareamento', 'Canal', 'Extração',
  'Limpeza', 'Prótese', 'Pediatria', 'Periodontia', 'Cirurgia',
];

const TONE_OPTIONS = [
  { value: 'friendly', label: 'Amigável' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
];

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (rápido, econômico)' },
  { value: 'gpt-4o', label: 'GPT-4o (mais inteligente)' },
];

function getWebhookUrl(provider: string): string {
  const base =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (provider === 'meta') return `${base}/api/webhook/whatsapp/meta`;
  return `${base}/api/webhook/whatsapp/evolution`;
}

export function AgentConfigPanel({ provider = 'evolution' }: AgentConfigPanelProps) {
  const [config, setConfig] = useState<AgentConfig>({
    enabled: false,
    name: 'Assistente',
    clinic_name: '',
    specialties: [],
    tone: 'friendly',
    custom_instructions: '',
    openai_model: 'gpt-4o-mini',
    max_context_messages: 10,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const webhookUrl = getWebhookUrl(provider);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    fetch('/api/agent/config', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: AgentConfig) => setConfig(data))
      .catch(() => setError('Falha ao carregar configuração do agente'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const token = localStorage.getItem('auth_token');
    try {
      const res = await fetch('/api/agent/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  function toggleSpecialty(s: string) {
    setConfig((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter((x) => x !== s)
        : [...prev.specialties, s],
    }));
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
        <Loader2 className="animate-spin h-4 w-4" /> Carregando configuração do agente...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with enable toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-indigo-500" />
          <span className="text-sm font-semibold text-gray-800 dark:text-white">Agente IA Passivo</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig((p) => ({ ...p, enabled: e.target.checked }))}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
          <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
            {config.enabled ? 'Ativo' : 'Inativo'}
          </span>
        </label>
      </div>

      {config.enabled && (
        <>
          {/* Webhook URL */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              URL do Webhook ({provider === 'meta' ? 'Meta Cloud API' : 'Evolution API'})
            </label>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
              <code className="text-xs text-indigo-600 dark:text-indigo-400 flex-1 truncate">
                {webhookUrl}
              </code>
              <button
                type="button"
                onClick={copyWebhook}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                title="Copiar"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Configure esta URL no painel do seu provedor de WhatsApp para receber mensagens.
            </p>
          </div>

          {/* Agent name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome do Agente
            </label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => setConfig((p) => ({ ...p, name: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Sofia, Ana, Assistente Allo"
            />
          </div>

          {/* Tone */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tom de Comunicação
            </label>
            <select
              value={config.tone}
              onChange={(e) => setConfig((p) => ({ ...p, tone: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              {TONE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Specialties */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Especialidades da Clínica
            </label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialty(s)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    config.specialties.includes(s)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced settings (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Configurações avançadas
            </button>
            {expanded && (
              <div className="mt-3 space-y-3 pl-1">
                {/* Custom instructions */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Instruções Personalizadas
                  </label>
                  <textarea
                    value={config.custom_instructions}
                    onChange={(e) => setConfig((p) => ({ ...p, custom_instructions: e.target.value }))}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: Nunca informe preços. Direcione agendamentos para o telefone (11) 9999-9999."
                  />
                </div>

                {/* Model */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Modelo OpenAI
                  </label>
                  <select
                    value={config.openai_model}
                    onChange={(e) => setConfig((p) => ({ ...p, openai_model: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {MODEL_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Max context messages */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mensagens de Contexto ({config.max_context_messages})
                  </label>
                  <input
                    type="range"
                    min={4}
                    max={20}
                    step={2}
                    value={config.max_context_messages}
                    onChange={(e) => setConfig((p) => ({ ...p, max_context_messages: Number(e.target.value) }))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <><Loader2 size={14} className="animate-spin" /> Salvando...</>
          ) : saved ? (
            <><Check size={14} /> Salvo!</>
          ) : (
            'Salvar Agente'
          )}
        </button>
      </div>
    </div>
  );
}
