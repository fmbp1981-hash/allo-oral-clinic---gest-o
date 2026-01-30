import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  Settings,
  MessageSquare,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface UserListItem {
  id: string;
  email: string;
  name: string;
  companyName: string;
  role: 'admin' | 'operador' | 'visualizador';
  status: 'configured' | 'pending';
  createdAt: string;
  integrations: {
    trello: boolean;
    whatsapp: boolean;
  };
}

interface UserConfig {
  trello: {
    configured: boolean;
    apiKey?: string;
    token?: string;
    boardId?: string;
    boardName?: string;
    syncEnabled?: boolean;
  };
  whatsapp: {
    configured: boolean;
    provider?: 'evolution' | 'zapi' | 'business_cloud';
    evolutionApiUrl?: string;
    evolutionApiKey?: string;
    evolutionInstanceName?: string;
    zapiUrl?: string;
    zapiInstanceId?: string;
    zapiToken?: string;
    businessPhoneNumberId?: string;
    businessAccessToken?: string;
    webhookUrl?: string;
  };
  templates: {
    reactivationMessage?: string;
    appointmentConfirmation?: string;
    appointmentReminder?: string;
    welcomeMessage?: string;
    customTemplates?: Array<{
      id: string;
      name: string;
      content: string;
    }>;
  };
}

interface UserConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserListItem;
  onSaved: () => void;
}

type SectionType = 'user' | 'permissions' | 'trello' | 'whatsapp' | 'templates';

const SectionHeader = ({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  status
}: {
  title: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggle: () => void;
  status?: 'configured' | 'pending';
}) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
  >
    <div className="flex items-center gap-3">
      <Icon size={20} className="text-indigo-600 dark:text-indigo-400" />
      <span className="font-medium text-gray-800 dark:text-white">{title}</span>
      {status && (
        <span
          className={`px-2 py-0.5 rounded-full text-xs ${
            status === 'configured'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}
        >
          {status === 'configured' ? 'Configurado' : 'Pendente'}
        </span>
      )}
    </div>
    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
  </button>
);

const PasswordInput = ({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
};

export const UserConfigModal = ({ isOpen, onClose, user, onSaved }: UserConfigModalProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User data
  const [name, setName] = useState(user.name);
  const [companyName, setCompanyName] = useState(user.companyName);
  const [role, setRole] = useState<'admin' | 'operador' | 'visualizador'>(user.role);

  // Config data
  const [config, setConfig] = useState<UserConfig | null>(null);

  // Section toggles
  const [openSections, setOpenSections] = useState<Record<SectionType, boolean>>({
    user: true,
    permissions: true,
    trello: false,
    whatsapp: false,
    templates: false,
  });

  // Custom templates
  const [customTemplates, setCustomTemplates] = useState<Array<{ id: string; name: string; content: string }>>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchConfig();
    }
  }, [isOpen, user]);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/users/${user.id}/config`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar configurações');
      }

      const data = await response.json();
      setConfig(data);
      setCustomTemplates(data.templates?.customTemplates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');

      // Save user data
      await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, companyName, role }),
      });

      // Save config
      if (config) {
        await fetch(`/api/admin/users/${user.id}/config`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            trello: config.trello,
            whatsapp: config.whatsapp,
            templates: {
              ...config.templates,
              customTemplates,
            },
          }),
        });
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (section: SectionType) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const updateTrelloConfig = (key: keyof UserConfig['trello'], value: unknown) => {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            trello: { ...prev.trello, [key]: value },
          }
        : null
    );
  };

  const updateWhatsappConfig = (key: keyof UserConfig['whatsapp'], value: unknown) => {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            whatsapp: { ...prev.whatsapp, [key]: value },
          }
        : null
    );
  };

  const updateTemplate = (key: keyof UserConfig['templates'], value: string) => {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            templates: { ...prev.templates, [key]: value },
          }
        : null
    );
  };

  const addCustomTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) return;

    setCustomTemplates((prev) => [
      ...prev,
      {
        id: `custom_${Date.now()}`,
        name: newTemplateName.trim(),
        content: newTemplateContent.trim(),
      },
    ]);
    setNewTemplateName('');
    setNewTemplateContent('');
  };

  const removeCustomTemplate = (id: string) => {
    setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Configurações do Usuário
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{user.email}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <XCircle className="mx-auto text-red-500 mb-2" size={32} />
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            ) : (
              <>
                {/* User Info Section */}
                <div className="space-y-3">
                  <SectionHeader
                    title="Informações do Usuário"
                    icon={User}
                    isOpen={openSections.user}
                    onToggle={() => toggleSection('user')}
                  />
                  {openSections.user && (
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={user.email}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nome
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Empresa
                          </label>
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Cadastrado em
                        </label>
                        <input
                          type="text"
                          value={new Date(user.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Permissions Section */}
                <div className="space-y-3">
                  <SectionHeader
                    title="Permissões"
                    icon={Shield}
                    isOpen={openSections.permissions}
                    onToggle={() => toggleSection('permissions')}
                  />
                  {openSections.permissions && (
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Role do Usuário
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['admin', 'operador', 'visualizador'] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => setRole(r)}
                            className={`p-3 rounded-lg border-2 transition-colors ${
                              role === r
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                            }`}
                          >
                            <p
                              className={`font-medium ${
                                role === r
                                  ? 'text-indigo-700 dark:text-indigo-400'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {r === 'admin' && 'Administrador'}
                              {r === 'operador' && 'Operador'}
                              {r === 'visualizador' && 'Visualizador'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {r === 'admin' && 'Acesso total ao sistema'}
                              {r === 'operador' && 'Pode operar o pipeline'}
                              {r === 'visualizador' && 'Apenas visualização'}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Trello Section */}
                <div className="space-y-3">
                  <SectionHeader
                    title="Integração Trello"
                    icon={Settings}
                    isOpen={openSections.trello}
                    onToggle={() => toggleSection('trello')}
                    status={config?.trello.configured ? 'configured' : 'pending'}
                  />
                  {openSections.trello && config && (
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <PasswordInput
                          label="API Key"
                          value={config.trello.apiKey || ''}
                          onChange={(v) => updateTrelloConfig('apiKey', v)}
                          placeholder="Trello API Key"
                        />
                        <PasswordInput
                          label="Token"
                          value={config.trello.token || ''}
                          onChange={(v) => updateTrelloConfig('token', v)}
                          placeholder="Trello Token"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Board ID
                          </label>
                          <input
                            type="text"
                            value={config.trello.boardId || ''}
                            onChange={(e) => updateTrelloConfig('boardId', e.target.value)}
                            placeholder="ID do Board"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nome do Board
                          </label>
                          <input
                            type="text"
                            value={config.trello.boardName || ''}
                            onChange={(e) => updateTrelloConfig('boardName', e.target.value)}
                            placeholder="Nome do Board"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="trelloSync"
                          checked={config.trello.syncEnabled || false}
                          onChange={(e) => updateTrelloConfig('syncEnabled', e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label
                          htmlFor="trelloSync"
                          className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                        >
                          Sincronização automática ativa
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* WhatsApp Section */}
                <div className="space-y-3">
                  <SectionHeader
                    title="Integração WhatsApp"
                    icon={MessageSquare}
                    isOpen={openSections.whatsapp}
                    onToggle={() => toggleSection('whatsapp')}
                    status={config?.whatsapp.configured ? 'configured' : 'pending'}
                  />
                  {openSections.whatsapp && config && (
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Provedor
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          {(['evolution', 'zapi', 'business_cloud'] as const).map((p) => (
                            <button
                              key={p}
                              onClick={() => updateWhatsappConfig('provider', p)}
                              className={`p-3 rounded-lg border-2 transition-colors ${
                                config.whatsapp.provider === p
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                              }`}
                            >
                              <p
                                className={`font-medium text-sm ${
                                  config.whatsapp.provider === p
                                    ? 'text-green-700 dark:text-green-400'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {p === 'evolution' && 'Evolution API'}
                                {p === 'zapi' && 'Z-API'}
                                {p === 'business_cloud' && 'Business Cloud'}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {config.whatsapp.provider === 'evolution' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              URL da Evolution API
                            </label>
                            <input
                              type="url"
                              value={config.whatsapp.evolutionApiUrl || ''}
                              onChange={(e) => updateWhatsappConfig('evolutionApiUrl', e.target.value)}
                              placeholder="https://api.evolution.com"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nome da Instância
                              </label>
                              <input
                                type="text"
                                value={config.whatsapp.evolutionInstanceName || ''}
                                onChange={(e) =>
                                  updateWhatsappConfig('evolutionInstanceName', e.target.value)
                                }
                                placeholder="minha-instancia"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>
                            <PasswordInput
                              label="API Key"
                              value={config.whatsapp.evolutionApiKey || ''}
                              onChange={(v) => updateWhatsappConfig('evolutionApiKey', v)}
                              placeholder="Evolution API Key"
                            />
                          </div>
                        </div>
                      )}

                      {config.whatsapp.provider === 'zapi' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              URL da Z-API
                            </label>
                            <input
                              type="url"
                              value={config.whatsapp.zapiUrl || ''}
                              onChange={(e) => updateWhatsappConfig('zapiUrl', e.target.value)}
                              placeholder="https://api.z-api.io"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Instance ID
                              </label>
                              <input
                                type="text"
                                value={config.whatsapp.zapiInstanceId || ''}
                                onChange={(e) => updateWhatsappConfig('zapiInstanceId', e.target.value)}
                                placeholder="Instance ID"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </div>
                            <PasswordInput
                              label="Token"
                              value={config.whatsapp.zapiToken || ''}
                              onChange={(v) => updateWhatsappConfig('zapiToken', v)}
                              placeholder="Z-API Token"
                            />
                          </div>
                        </div>
                      )}

                      {config.whatsapp.provider === 'business_cloud' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Phone Number ID
                            </label>
                            <input
                              type="text"
                              value={config.whatsapp.businessPhoneNumberId || ''}
                              onChange={(e) =>
                                updateWhatsappConfig('businessPhoneNumberId', e.target.value)
                              }
                              placeholder="Phone Number ID"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <PasswordInput
                            label="Access Token"
                            value={config.whatsapp.businessAccessToken || ''}
                            onChange={(v) => updateWhatsappConfig('businessAccessToken', v)}
                            placeholder="Access Token"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Webhook URL (para receber mensagens)
                        </label>
                        <input
                          type="url"
                          value={config.whatsapp.webhookUrl || ''}
                          onChange={(e) => updateWhatsappConfig('webhookUrl', e.target.value)}
                          placeholder="https://seu-servidor.com/webhook"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Templates Section */}
                <div className="space-y-3">
                  <SectionHeader
                    title="Templates de Mensagem"
                    icon={FileText}
                    isOpen={openSections.templates}
                    onToggle={() => toggleSection('templates')}
                  />
                  {openSections.templates && config && (
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-6">
                      {/* Predefined Templates */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-800 dark:text-white">Templates Padrão</h4>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Mensagem de Reativação
                          </label>
                          <textarea
                            value={config.templates.reactivationMessage || ''}
                            onChange={(e) => updateTemplate('reactivationMessage', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Use {nome}, {telefone}, etc. como variáveis"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Confirmação de Agendamento
                          </label>
                          <textarea
                            value={config.templates.appointmentConfirmation || ''}
                            onChange={(e) => updateTemplate('appointmentConfirmation', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Use {nome}, {data}, {hora}, {endereco} como variáveis"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Lembrete de Agendamento
                          </label>
                          <textarea
                            value={config.templates.appointmentReminder || ''}
                            onChange={(e) => updateTemplate('appointmentReminder', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Use {nome}, {data}, {hora} como variáveis"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Mensagem de Boas-vindas
                          </label>
                          <textarea
                            value={config.templates.welcomeMessage || ''}
                            onChange={(e) => updateTemplate('welcomeMessage', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Use {nome} como variável"
                          />
                        </div>
                      </div>

                      {/* Custom Templates */}
                      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="font-medium text-gray-800 dark:text-white">Templates Personalizados</h4>

                        {customTemplates.map((template) => (
                          <div
                            key={template.id}
                            className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-800 dark:text-white">
                                {template.name}
                              </span>
                              <button
                                onClick={() => removeCustomTemplate(template.id)}
                                className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                              {template.content}
                            </p>
                          </div>
                        ))}

                        {/* Add new template */}
                        <div className="p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg space-y-3">
                          <input
                            type="text"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            placeholder="Nome do template"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <textarea
                            value={newTemplateContent}
                            onChange={(e) => setNewTemplateContent(e.target.value)}
                            rows={3}
                            placeholder="Conteúdo do template..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <button
                            onClick={addCustomTemplate}
                            disabled={!newTemplateName.trim() || !newTemplateContent.trim()}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                          >
                            <Plus size={16} />
                            Adicionar Template
                          </button>
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="font-medium mb-1">Variáveis disponíveis:</p>
                          <p>
                            {'{nome}'}, {'{telefone}'}, {'{email}'}, {'{data}'}, {'{hora}'}, {'{endereco}'}, {'{tratamento}'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserConfigModal;
