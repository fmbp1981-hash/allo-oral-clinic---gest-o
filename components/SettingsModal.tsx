import React, { useState, useEffect } from 'react';
import { X, Database, Link2, Key, MessageCircle, Workflow, FileText } from 'lucide-react';
import { getSettings, saveSettings } from '../services/mockN8nService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [msgUrl, setMsgUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [template, setTemplate] = useState('');

  useEffect(() => {
    if (isOpen) {
      const settings = getSettings();
      setUrl(settings.webhookUrl || '');
      setMsgUrl(settings.messagingWebhookUrl || '');
      setApiKey(settings.apiKey || '');
      setTemplate(settings.messageTemplate || 'Olá {name}, somos da Allo Oral Clinic. Verificamos seu histórico sobre "{keyword}" e gostaríamos de saber como está a saúde do seu sorriso. Podemos agendar uma avaliação?');
    }
  }, [isOpen]);

  const handleSave = () => {
    saveSettings({ 
      webhookUrl: url, 
      messagingWebhookUrl: msgUrl,
      apiKey,
      messageTemplate: template
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-md">
              <Workflow size={16} className="text-indigo-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Configuração de Integrações</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Seção Busca */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Database size={16} className="text-gray-500" />
              <h4 className="text-sm font-bold text-gray-800">1. Busca de Pacientes (Neon DB)</h4>
            </div>
            <p className="text-xs text-gray-500">
              Webhook n8n que recebe a "keyword", consulta o banco SQL e retorna a lista de pacientes.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Webhook de Busca URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Link2 className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm"
                  placeholder="https://n8n.suaclinica.com/webhook/busca-pacientes"
                />
              </div>
            </div>
          </div>

          {/* Seção Mensagens */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <MessageCircle size={16} className="text-gray-500" />
              <h4 className="text-sm font-bold text-gray-800">2. Envio de Mensagens</h4>
            </div>
             <p className="text-xs text-gray-500">
              Configuração para disparo automático (via Webhook) ou manual (via WhatsApp Web).
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Webhook de Disparo URL (Opcional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Link2 className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={msgUrl}
                  onChange={(e) => setMsgUrl(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm"
                  placeholder="https://n8n.suaclinica.com/webhook/envia-whatsapp"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm"
                  placeholder="Olá {name}, aqui é da clínica..."
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Variáveis disponíveis: <span className="font-mono bg-gray-100 px-1 rounded">{`{name}`}</span> (Nome do paciente), <span className="font-mono bg-gray-100 px-1 rounded">{`{keyword}`}</span> (Termo buscado).
              </p>
            </div>
          </div>

          {/* Seção Autenticação */}
          <div className="pt-4 border-t border-gray-100">
             <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 mb-3">
                <p className="text-xs text-yellow-800">
                  A chave abaixo é enviada no Header <code>Authorization: Bearer KEY</code> para ambos os webhooks.
                </p>
             </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                API Key Global (Segurança)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm shadow-sm"
                  placeholder="Token de segurança do n8n"
                />
              </div>
            </div>
          </div>

        </div>
        
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancelar
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
            Salvar Configuração
          </button>
        </div>
      </div>
    </div>
  );
};