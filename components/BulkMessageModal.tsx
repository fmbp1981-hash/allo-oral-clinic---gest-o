import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Users,
  MessageSquare,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  Eye
} from 'lucide-react';
import { Opportunity, Patient } from '../types';

interface Template {
  id: string;
  name: string;
  content: string;
  type: 'default' | 'custom';
}

interface Recipient {
  id: string;
  name: string;
  phone: string;
  selected: boolean;
}

interface SendResult {
  recipientId: string;
  phone: string;
  success: boolean;
  error?: string;
}

interface BulkMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: Array<Opportunity | Patient>;
  onSent?: () => void;
}

export const BulkMessageModal = ({
  isOpen,
  onClose,
  recipients: initialRecipients,
  onSent
}: BulkMessageModalProps) => {
  const [step, setStep] = useState<'select' | 'compose' | 'preview' | 'sending' | 'result'>('select');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Mapear destinatários
      const mappedRecipients = initialRecipients.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        selected: true,
      }));
      setRecipients(mappedRecipients);
      setStep('select');
      setResults([]);
      setError(null);

      // Buscar templates
      fetchTemplates();
    }
  }, [isOpen, initialRecipients]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');

      // Buscar configurações do usuário para templates padrão
      const configResponse = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const defaultTemplates: Template[] = [];

      if (configResponse.ok) {
        const config = await configResponse.json();

        if (config.reactivationMessage) {
          defaultTemplates.push({
            id: 'reactivation',
            name: 'Reativação de Paciente',
            content: config.reactivationMessage,
            type: 'default',
          });
        }
        if (config.appointmentConfirmation) {
          defaultTemplates.push({
            id: 'confirmation',
            name: 'Confirmação de Agendamento',
            content: config.appointmentConfirmation,
            type: 'default',
          });
        }
        if (config.appointmentReminder) {
          defaultTemplates.push({
            id: 'reminder',
            name: 'Lembrete de Consulta',
            content: config.appointmentReminder,
            type: 'default',
          });
        }
        if (config.welcomeMessage) {
          defaultTemplates.push({
            id: 'welcome',
            name: 'Boas-vindas',
            content: config.welcomeMessage,
            type: 'default',
          });
        }
      }

      // Buscar templates customizados
      const templatesResponse = await fetch('/api/templates', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (templatesResponse.ok) {
        const customTemplates = await templatesResponse.json();
        const mappedCustom = customTemplates.map((t: { id: string; name: string; content: string }) => ({
          ...t,
          type: 'custom' as const,
        }));
        setTemplates([...defaultTemplates, ...mappedCustom]);
      } else {
        setTemplates(defaultTemplates);
      }

      // Se não houver templates, adicionar um padrão
      if (defaultTemplates.length === 0) {
        setTemplates([
          {
            id: 'default',
            name: 'Mensagem Padrão',
            content: `Olá {nome}! 👋

Estamos entrando em contato para saber como você está.

Podemos agendar uma consulta?`,
            type: 'default',
          },
        ]);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      // Fallback templates
      setTemplates([
        {
          id: 'default',
          name: 'Mensagem Padrão',
          content: `Olá {nome}! 👋

Estamos entrando em contato para saber como você está.

Podemos agendar uma consulta?`,
          type: 'default',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipient = (id: string) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  const selectAll = () => {
    setRecipients((prev) => prev.map((r) => ({ ...r, selected: true })));
  };

  const deselectAll = () => {
    setRecipients((prev) => prev.map((r) => ({ ...r, selected: false })));
  };

  const selectedCount = recipients.filter((r) => r.selected).length;

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setCustomMessage(template.content);
  };

  const getPreviewMessage = (recipient: Recipient): string => {
    let message = customMessage;
    message = message.replace(/{nome}/gi, recipient.name);
    message = message.replace(/{telefone}/gi, recipient.phone);
    return message;
  };

  const handleSend = async () => {
    const selectedRecipients = recipients.filter((r) => r.selected);
    if (selectedRecipients.length === 0) {
      setError('Selecione pelo menos um destinatário');
      return;
    }

    if (!customMessage.trim()) {
      setError('Digite uma mensagem');
      return;
    }

    setSending(true);
    setError(null);
    setStep('sending');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/whatsapp/send-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipients: selectedRecipients.map((r) => ({
            id: r.id,
            name: r.name,
            phone: r.phone,
          })),
          templateId: selectedTemplate?.id,
          customMessage: customMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar mensagens');
      }

      setResults(data.results || []);
      setStep('result');

      if (onSent) {
        onSent();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagens');
      setStep('compose');
    } finally {
      setSending(false);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <MessageSquare className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  Disparo em Massa
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {step === 'select' && 'Selecione os destinatários'}
                  {step === 'compose' && 'Escolha o template ou personalize a mensagem'}
                  {step === 'preview' && 'Revise antes de enviar'}
                  {step === 'sending' && 'Enviando mensagens...'}
                  {step === 'result' && 'Resultado do envio'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
                <AlertCircle className="text-red-500" size={20} />
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Step 1: Select Recipients */}
            {step === 'select' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedCount} de {recipients.length} selecionados
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    >
                      Selecionar todos
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={deselectAll}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
                    >
                      Limpar seleção
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-[300px] overflow-y-auto">
                  {recipients.map((recipient) => (
                    <div
                      key={recipient.id}
                      onClick={() => toggleRecipient(recipient.id)}
                      className={`flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 cursor-pointer transition-colors ${
                        recipient.selected
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            recipient.selected
                              ? 'bg-green-500 border-green-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {recipient.selected && (
                            <CheckCircle className="text-white" size={14} />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {recipient.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {recipient.phone}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Compose Message */}
            {step === 'compose' && (
              <div className="space-y-6">
                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selecione um Template
                  </label>
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="animate-spin text-indigo-600" size={24} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className={`p-4 rounded-lg border-2 text-left transition-colors ${
                            selectedTemplate?.id === template.id
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <FileText
                              size={16}
                              className={
                                selectedTemplate?.id === template.id
                                  ? 'text-green-600'
                                  : 'text-gray-400'
                              }
                            />
                            <span
                              className={`font-medium text-sm ${
                                selectedTemplate?.id === template.id
                                  ? 'text-green-700 dark:text-green-400'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {template.name}
                            </span>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              template.type === 'custom'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}
                          >
                            {template.type === 'custom' ? 'Personalizado' : 'Padrão'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message Editor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mensagem
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-green-500 focus:border-green-500"
                    placeholder="Digite sua mensagem aqui..."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Variáveis disponíveis: {'{nome}'}, {'{telefone}'}, {'{data}'}, {'{hora}'}
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Preview */}
            {step === 'preview' && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                    <Eye size={18} />
                    Preview da Mensagem
                  </h4>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {recipients.filter((r) => r.selected)[0]
                        ? getPreviewMessage(recipients.filter((r) => r.selected)[0])
                        : customMessage}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <h4 className="font-medium text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                    <Users size={18} />
                    Destinatários ({selectedCount})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {recipients
                      .filter((r) => r.selected)
                      .slice(0, 10)
                      .map((r) => (
                        <span
                          key={r.id}
                          className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300"
                        >
                          {r.name}
                        </span>
                      ))}
                    {selectedCount > 10 && (
                      <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm text-gray-600 dark:text-gray-400">
                        +{selectedCount - 10} mais
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Sending */}
            {step === 'sending' && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="animate-spin text-green-600 mb-4" size={48} />
                <p className="text-lg font-medium text-gray-800 dark:text-white">
                  Enviando mensagens...
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Aguarde, isso pode levar alguns minutos.
                </p>
              </div>
            )}

            {/* Step 5: Results */}
            {step === 'result' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <CheckCircle className="text-green-500 mx-auto mb-2" size={32} />
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                      {successCount}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-500">Enviados com sucesso</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                    <XCircle className="text-red-500 mx-auto mb-2" size={32} />
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">{failedCount}</p>
                    <p className="text-sm text-red-600 dark:text-red-500">Falhas no envio</p>
                  </div>
                </div>

                {failedCount > 0 && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-[200px] overflow-y-auto">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <p className="font-medium text-gray-800 dark:text-white text-sm">
                        Detalhes das falhas
                      </p>
                    </div>
                    {results
                      .filter((r) => !r.success)
                      .map((result, index) => (
                        <div
                          key={index}
                          className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
                        >
                          <p className="text-sm font-medium text-gray-800 dark:text-white">
                            {result.phone}
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-400">{result.error}</p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div>
              {step !== 'select' && step !== 'sending' && step !== 'result' && (
                <button
                  onClick={() =>
                    setStep(step === 'preview' ? 'compose' : step === 'compose' ? 'select' : 'select')
                  }
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Voltar
                </button>
              )}
            </div>

            <div className="flex gap-3">
              {step === 'result' ? (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  Concluir
                </button>
              ) : step === 'sending' ? null : (
                <>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Cancelar
                  </button>

                  {step === 'select' && (
                    <button
                      onClick={() => setStep('compose')}
                      disabled={selectedCount === 0}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Próximo
                      <ChevronDown className="rotate-[-90deg]" size={16} />
                    </button>
                  )}

                  {step === 'compose' && (
                    <button
                      onClick={() => setStep('preview')}
                      disabled={!customMessage.trim()}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Revisar
                      <Eye size={16} />
                    </button>
                  )}

                  {step === 'preview' && (
                    <button
                      onClick={handleSend}
                      disabled={sending}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {sending ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Send size={16} />
                      )}
                      Enviar para {selectedCount} contato(s)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkMessageModal;
