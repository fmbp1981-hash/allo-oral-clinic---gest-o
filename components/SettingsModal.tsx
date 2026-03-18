import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Workflow, FileText, Smartphone, Check, AlertCircle, Loader2, Settings as SettingsIcon, Bot } from 'lucide-react';
import { getSettings, saveSettings } from '../services/apiService';
import { WhatsAppConfig, WhatsAppProvider, saveWhatsAppConfig } from '../services/whatsappService';
import { AgentConfigPanel } from './AgentConfigPanel';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [template, setTemplate] = useState('');
  const [defaultRole, setDefaultRole] = useState<'admin' | 'user'>('user');

  // WhatsApp Provider State
  const [whatsappProvider, setWhatsappProvider] = useState<WhatsAppProvider>('evolution');
  const [evolutionUrl, setEvolutionUrl] = useState('');
  const [evolutionInstance, setEvolutionInstance] = useState('');
  const [evolutionApiKey, setEvolutionApiKey] = useState('');
  const [businessPhoneId, setBusinessPhoneId] = useState('');
  const [businessToken, setBusinessToken] = useState('');
  const [zApiUrl, setZApiUrl] = useState('');
  const [zApiInstance, setZApiInstance] = useState('');
  const [zApiToken, setZApiToken] = useState('');



  useEffect(() => {
    if (isOpen) {
      // Load settings from API (async)
      getSettings().then((settings) => {
        setTemplate(settings.messageTemplate || 'Olá {name}, somos da Allo Oral Clinic. Verificamos seu histórico sobre "{keyword}" e gostaríamos de saber como está a saúde do seu sorriso. Podemos agendar uma avaliação?');
        setDefaultRole(settings.defaultRole || 'user');
      }).catch((error) => {
        console.warn('Failed to load settings:', error);
        // Use default template on error
        setTemplate('Olá {name}, somos da Allo Oral Clinic. Verificamos seu histórico sobre "{keyword}" e gostaríamos de saber como está a saúde do seu sorriso. Podemos agendar uma avaliação?');
        setDefaultRole('user');
      });

      // Load WhatsApp config from localStorage
      const whatsappConfig = localStorage.getItem('whatsapp_config');
      if (whatsappConfig) {
        try {
          const config: WhatsAppConfig = JSON.parse(whatsappConfig);
          setWhatsappProvider(config.provider || 'evolution');
          setEvolutionUrl(config.evolutionApiUrl || '');
          setEvolutionInstance(config.evolutionInstanceName || '');
          setEvolutionApiKey(config.evolutionApiKey || '');
          setBusinessPhoneId(config.businessCloudPhoneNumberId || '');
          setBusinessToken(config.businessCloudAccessToken || '');
          setZApiUrl(config.zApiUrl || '');
          setZApiInstance(config.zApiInstanceId || '');
          setZApiToken(config.zApiToken || '');
        } catch (e) {
          console.warn('Failed to load WhatsApp config');
        }
      }

    }
  }, [isOpen]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    try {
      // Save global app settings
      saveSettings({
        messageTemplate: template,
        defaultRole: defaultRole
      });

      // Save WhatsApp config to localStorage (for frontend service)
      const whatsappConfig: WhatsAppConfig = {
        provider: whatsappProvider,
        evolutionApiUrl: evolutionUrl,
        evolutionInstanceName: evolutionInstance,
        evolutionApiKey: evolutionApiKey,
        businessCloudPhoneNumberId: businessPhoneId,
        businessCloudAccessToken: businessToken,
        zApiUrl: zApiUrl,
        zApiInstanceId: zApiInstance,
        zApiToken: zApiToken
      };
      saveWhatsAppConfig(whatsappConfig);

      // Also save WhatsApp config to database (for API bulk send)
      const token = localStorage.getItem('auth_token');
      const userSettingsResponse = await fetch('/api/user-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          provider: whatsappProvider,
          evolutionApiUrl: evolutionUrl,
          evolutionInstanceName: evolutionInstance,
          evolutionApiKey: evolutionApiKey,
          zapiUrl: zApiUrl,
          zapiInstanceId: zApiInstance,
          zapiToken: zApiToken,
          businessPhoneNumberId: businessPhoneId,
          businessAccessToken: businessToken
        })
      });

      if (!userSettingsResponse.ok) {
        const errorData = await userSettingsResponse.json();
        console.warn('Failed to save WhatsApp settings to database:', errorData);
        // Continue anyway - localStorage will work for individual sends
      }

      // Only close if all saves succeeded
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar configurações';
      setSaveError(message);
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 dark:bg-gray-900/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900 rounded-md">
              <Workflow size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Configuração de Integrações</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">


          {/* Seção Geral */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <SettingsIcon size={16} className="text-gray-500" />
              <h4 className="text-sm font-bold text-gray-800 dark:text-white">1. Configurações Gerais</h4>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role Padrão para Novos Usuários
              </label>
              <select
                value={defaultRole}
                onChange={(e) => setDefaultRole(e.target.value as 'admin' | 'user')}
                className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm"
              >
                <option value="user">Usuário (Padrão)</option>
                <option value="admin">Administrador</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Define o nível de acesso para usuários criados via importação ou registro direto.
              </p>
            </div>
          </div>

          {/* Seção WhatsApp Provider */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <Smartphone size={16} className="text-gray-500" />
              <h4 className="text-sm font-bold text-gray-800 dark:text-white">2. Provedor WhatsApp</h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Escolha qual provedor de WhatsApp deseja usar para envio de mensagens.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Provedor de WhatsApp
              </label>
              <select
                value={whatsappProvider}
                onChange={(e) => setWhatsappProvider(e.target.value as WhatsAppProvider)}
                className="block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm"
              >
                <option value="evolution">Evolution API</option>
                <option value="business-cloud">WhatsApp Business Cloud (Meta)</option>
                <option value="z-api">Z-API</option>
                <option value="whatsapp-web">WhatsApp Web (Fallback Manual)</option>
              </select>
            </div>

            {/* Evolution API Config */}
            {whatsappProvider === 'evolution' && (
              <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Evolution API URL
                  </label>
                  <input
                    type="text"
                    value={evolutionUrl}
                    onChange={(e) => setEvolutionUrl(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="http://localhost:8080"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Instance Name
                  </label>
                  <input
                    type="text"
                    value={evolutionInstance}
                    onChange={(e) => setEvolutionInstance(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="clinicaflow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={evolutionApiKey}
                    onChange={(e) => setEvolutionApiKey(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Sua API Key do Evolution"
                  />
                </div>
              </div>
            )}

            {/* WhatsApp Business Cloud Config */}
            {whatsappProvider === 'business-cloud' && (
              <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    value={businessPhoneId}
                    onChange={(e) => setBusinessPhoneId(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Access Token
                  </label>
                  <input
                    type="password"
                    value={businessToken}
                    onChange={(e) => setBusinessToken(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Seu token de acesso do Meta Business"
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Obtenha em: <a href="https://developers.facebook.com/apps" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:underline">Meta for Developers</a>
                </p>
              </div>
            )}

            {/* Z-API Config */}
            {whatsappProvider === 'z-api' && (
              <div className="space-y-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Z-API URL
                  </label>
                  <input
                    type="text"
                    value={zApiUrl}
                    onChange={(e) => setZApiUrl(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="https://api.z-api.io"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Instance ID
                  </label>
                  <input
                    type="text"
                    value={zApiInstance}
                    onChange={(e) => setZApiInstance(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Seu Instance ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Token
                  </label>
                  <input
                    type="password"
                    value={zApiToken}
                    onChange={(e) => setZApiToken(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Seu token da Z-API"
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Obtenha em: <a href="https://www.z-api.io" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:underline">Z-API</a>
                </p>
              </div>
            )}

            {whatsappProvider === 'whatsapp-web' && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  ℹ️ WhatsApp Web abrirá uma nova aba com a mensagem pré-preenchida. Não requer configuração adicional.
                </p>
              </div>
            )}
          </div>

          {/* Template de Mensagem */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <MessageCircle size={16} className="text-gray-500" />
              <h4 className="text-sm font-bold text-gray-800 dark:text-white">3. Template de Mensagem</h4>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Modelo de Mensagem Padrão
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <FileText className="h-4 w-4 text-gray-400" />
                </div>
                <textarea
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  rows={4}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm"
                  placeholder="Olá {name}, aqui é da clínica..."
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Variáveis disponíveis: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{`{name}`}</span> (Nome do paciente), <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{`{keyword}`}</span> (Termo buscado).
              </p>
            </div>
          </div>

          {/* Seção Agente IA */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
              <Bot size={16} className="text-indigo-500" />
              <h4 className="text-sm font-bold text-gray-800 dark:text-white">4. Agente IA</h4>
            </div>
            <AgentConfigPanel provider={whatsappProvider} />
          </div>

        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 shrink-0">
          {saveError && (
            <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm flex justify-between items-center">
              <span>{saveError}</span>
              <button onClick={() => setSaveError(null)} className="ml-2 text-red-500 hover:text-red-700 font-bold">×</button>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};