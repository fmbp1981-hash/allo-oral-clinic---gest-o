import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface ImportPatientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportPatientsModal: React.FC<ImportPatientsModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    total?: number;
    valid?: number;
    imported?: number;
    skipped?: number;
    duplicates?: number;
    errors?: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'csv' || fileExtension === 'xlsx') {
        setFile(selectedFile);
        setResult(null);
      } else {
        alert('Por favor, selecione um arquivo CSV ou XLSX');
        e.target.value = '';
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/patients/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const importResult = await res.json() as {
        success?: boolean;
        total?: number;
        inserted?: number;
        updated?: number;
        error?: string;
      };

      if (!res.ok) {
        setResult({ success: false, message: importResult.error ?? 'Erro ao importar' });
        return;
      }

      const mapped = {
        success: true,
        message: `Importação concluída: ${importResult.inserted ?? 0} adicionados, ${importResult.updated ?? 0} atualizados.`,
        imported: importResult.inserted ?? 0,
        total: importResult.total ?? 0,
      };

      setResult(mapped);

      if (mapped.imported > 0) {
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      setResult({
        success: false,
        message: `Erro ao importar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Importar Pacientes</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Envie um arquivo CSV ou XLSX com sua base de pacientes
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* File Upload Area */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-3"
            >
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  {file ? file.name : 'Clique para selecionar um arquivo'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Formatos aceitos: CSV ou XLSX
                </p>
              </div>
            </label>
          </div>

          {/* File Info */}
          {file && (
            <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <FileText className="text-indigo-600 dark:text-indigo-400" size={24} />
              <div className="flex-1">
                <p className="font-medium text-gray-800 dark:text-gray-200">{file.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg ${
              result.success
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" size={20} />
                ) : (
                  <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    result.success
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    {result.message}
                  </p>
                  {result.success && result.total !== undefined && (
                    <div className="mt-2 text-sm space-y-1 text-green-700 dark:text-green-300">
                      <p>Total de linhas no arquivo: {result.total}</p>
                      <p>Pacientes válidos encontrados: {result.valid}</p>
                      <p>Importados com sucesso: {result.imported}</p>
                      {result.duplicates && result.duplicates > 0 && (
                        <p className="text-yellow-700 dark:text-yellow-400">
                          Duplicados (telefone j\u00e1 existente): {result.duplicates}
                        </p>
                      )}
                      {result.skipped && result.skipped > 0 && result.skipped !== result.duplicates && (
                        <p className="text-yellow-700 dark:text-yellow-400">
                          Ignorados (erros): {(result.skipped || 0) - (result.duplicates || 0)}
                        </p>
                      )}
                    </div>
                  )}
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                      <p className="font-medium">Erros encontrados:</p>
                      <ul className="list-disc list-inside mt-1">
                        {result.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Formato do arquivo:</h3>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
              <li><strong>Obrigatórias:</strong> Nome e Telefone</li>
              <li><strong>Opcionais:</strong> Email e Histórico</li>
              <li>Linhas sem nome ou telefone serão ignoradas automaticamente</li>
            </ul>
            <a
              href="/IMPORTACAO-PACIENTES.md"
              target="_blank"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-block"
            >
              Ver guia completo de importação
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={importing}
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {importing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Importando...
              </>
            ) : (
              <>
                <Upload size={18} />
                Importar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
