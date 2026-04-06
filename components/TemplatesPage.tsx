import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  X,
  Check,
  Loader2,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import {
  MessageTemplate,
  getMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
} from '../services/apiService';

const TEMPLATE_TYPES = [
  { value: 'custom',       label: 'Personalizado' },
  { value: 'reactivation', label: 'Reativação' },
  { value: 'confirmation', label: 'Confirmação' },
  { value: 'reminder',     label: 'Lembrete' },
  { value: 'welcome',      label: 'Boas-vindas' },
];

const TYPE_COLORS: Record<string, string> = {
  custom:       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  reactivation: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  confirmation: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  reminder:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  welcome:      'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

const VARIABLES_HINT = ['{nome}', '{telefone}', '{data}', '{hora}'];

interface FormState {
  name: string;
  content: string;
  type: string;
}

const emptyForm = (): FormState => ({ name: '', content: '', type: 'custom' });

interface TemplateFormProps {
  initial: FormState;
  onSave: (values: FormState) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

const TemplateForm = ({ initial, onSave, onCancel, saving }: TemplateFormProps) => {
  const [values, setValues] = useState<FormState>(initial);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues(prev => ({ ...prev, [field]: e.target.value }));

  const insertVar = (v: string) => {
    setValues(prev => ({ ...prev, content: prev.content + v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome do template *
          </label>
          <input
            required
            value={values.name}
            onChange={set('name')}
            placeholder="Ex: Reativação 6 meses"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tipo
          </label>
          <select
            value={values.type}
            onChange={set('type')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
          >
            {TEMPLATE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Mensagem *
          </label>
          <div className="flex gap-1">
            {VARIABLES_HINT.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => insertVar(v)}
                className="text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-800/30 font-mono"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <textarea
          required
          value={values.content}
          onChange={set('content')}
          rows={5}
          placeholder="Olá {nome}! Estamos com saudades da sua visita..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Clique nas variáveis acima para inserir na mensagem.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Salvar
        </button>
      </div>
    </form>
  );
};

export const TemplatesPage = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // form state: null = closed, 'new' = creating, string = editing by id
  const [formMode, setFormMode] = useState<null | 'new' | string>(null);
  const [formInitial, setFormInitial] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMessageTemplates();
      setTemplates(data);
    } catch {
      setError('Não foi possível carregar os templates. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleOpenNew = () => {
    setFormInitial(emptyForm());
    setFormMode('new');
  };

  const handleOpenEdit = (t: MessageTemplate) => {
    setFormInitial({ name: t.name, content: t.content, type: t.type });
    setFormMode(t.id);
  };

  const handleSave = async (values: FormState) => {
    setSaving(true);
    try {
      if (formMode === 'new') {
        const created = await createMessageTemplate(values);
        setTemplates(prev => [created, ...prev]);
      } else if (formMode) {
        const updated = await updateMessageTemplate(formMode, values);
        setTemplates(prev => prev.map(t => t.id === formMode ? updated : t));
      }
      setFormMode(null);
    } catch {
      alert('Erro ao salvar template. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteMessageTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch {
      alert('Erro ao excluir template. Tente novamente.');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const typeLabel = (type: string) =>
    TEMPLATE_TYPES.find(t => t.value === type)?.label ?? type;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Templates de Mensagem</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gerencie os templates reutilizáveis para disparos via WhatsApp.
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm"
        >
          <Plus size={18} />
          Novo Template
        </button>
      </div>

      {/* New template form */}
      {formMode === 'new' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-indigo-200 dark:border-indigo-800 p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Plus size={18} className="text-indigo-600" />
            Novo Template
          </h3>
          <TemplateForm
            initial={formInitial}
            onSave={handleSave}
            onCancel={() => setFormMode(null)}
            saving={saving}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={loadTemplates}
            className="ml-auto text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-indigo-600" size={36} />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && templates.length === 0 && formMode !== 'new' && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
            <MessageSquare size={32} className="text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Nenhum template criado
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
            Crie templates personalizados para agilizar seus disparos via WhatsApp.
            Use variáveis como <code className="font-mono text-indigo-600">{'{nome}'}</code> para personalizar cada mensagem.
          </p>
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            <Plus size={16} />
            Criar primeiro template
          </button>
        </div>
      )}

      {/* Template cards */}
      {!loading && templates.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {templates.map(template => (
            <div key={template.id}>
              {/* Edit inline form */}
              {formMode === template.id ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-indigo-200 dark:border-indigo-800 p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Pencil size={16} className="text-indigo-600" />
                    Editando: {template.name}
                  </h3>
                  <TemplateForm
                    initial={formInitial}
                    onSave={handleSave}
                    onCancel={() => setFormMode(null)}
                    saving={saving}
                  />
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={18} className="text-indigo-500 shrink-0" />
                      <h4 className="font-semibold text-gray-800 dark:text-white truncate">
                        {template.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[template.type] ?? TYPE_COLORS.custom}`}>
                        {typeLabel(template.type)}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 whitespace-pre-wrap leading-relaxed mb-4">
                    {template.content}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(template.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEdit(template)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                      >
                        <Pencil size={13} />
                        Editar
                      </button>

                      {confirmDeleteId === template.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Confirmar?</span>
                          <button
                            onClick={() => handleDelete(template.id)}
                            disabled={deletingId === template.id}
                            className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
                          >
                            {deletingId === template.id ? <Loader2 size={12} className="animate-spin" /> : 'Sim'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(template.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={13} />
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
