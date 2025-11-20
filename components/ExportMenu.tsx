
import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, Table } from 'lucide-react';
import { exportToCSV, exportToExcel, exportToPDF } from '../services/exportService';

interface ExportMenuProps {
  data: any[];
  filename: string;
  pdfTitle: string;
  disabled?: boolean;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ data, filename, pdfTitle, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (type: 'csv' | 'excel' | 'pdf') => {
    if (type === 'csv') exportToCSV(data, filename);
    if (type === 'excel') exportToExcel(data, filename);
    if (type === 'pdf') exportToPDF(data, filename, pdfTitle);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download size={16} className="mr-2" />
        Exportar
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-100 animate-fade-in ring-1 ring-black ring-opacity-5">
          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Formato</div>
          
          <button
            onClick={() => handleExport('excel')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 flex items-center transition-colors"
          >
            <FileSpreadsheet size={16} className="mr-2 text-green-600" /> 
            Excel (.xlsx)
          </button>

          <button
            onClick={() => handleExport('csv')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center transition-colors"
          >
            <Table size={16} className="mr-2 text-blue-600" /> 
            CSV (.csv)
          </button>
          
          <button
            onClick={() => handleExport('pdf')}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 flex items-center transition-colors"
          >
            <FileText size={16} className="mr-2 text-red-600" /> 
            PDF (.pdf)
          </button>
        </div>
      )}
    </div>
  );
};
