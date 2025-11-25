import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export type DateRangePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
  preset: DateRangePreset;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  showCustom?: boolean;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  showCustom = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomInputs, setShowCustomInputs] = useState(false);

  const presets: { id: DateRangePreset; label: string; days: number }[] = [
    { id: 'today', label: 'Hoje', days: 0 },
    { id: 'week', label: 'Últimos 7 dias', days: 7 },
    { id: 'month', label: 'Últimos 30 dias', days: 30 },
    { id: 'quarter', label: 'Últimos 90 dias', days: 90 },
    { id: 'year', label: 'Último ano', days: 365 },
  ];

  const getDateRange = (preset: DateRangePreset, days: number): DateRange => {
    const end = new Date();
    const start = new Date();

    if (preset === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setDate(start.getDate() - days);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end, preset };
  };

  const handlePresetClick = (preset: DateRangePreset, days: number) => {
    const range = getDateRange(preset, days);
    onChange(range);
    setIsOpen(false);
  };

  const handleCustomClick = () => {
    setShowCustomInputs(true);
    setIsOpen(false);
  };

  const handleCustomSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const start = new Date(formData.get('start') as string);
    const end = new Date(formData.get('end') as string);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    onChange({ start, end, preset: 'custom' });
    setShowCustomInputs(false);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getLabel = (): string => {
    const preset = presets.find(p => p.id === value.preset);
    if (preset && value.preset !== 'custom') {
      return preset.label;
    }
    return `${formatDate(value.start)} - ${formatDate(value.end)}`;
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        <Calendar size={16} />
        <span>{getLabel()}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id, preset.days)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  value.preset === preset.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {preset.label}
              </button>
            ))}

            {showCustom && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                <button
                  onClick={handleCustomClick}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Período Personalizado
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Custom Date Inputs Modal */}
      {showCustomInputs && (
        <>
          <div
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-30 flex items-center justify-center"
            onClick={() => setShowCustomInputs(false)}
          />
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Período Personalizado
              </h3>

              <form onSubmit={handleCustomSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    name="start"
                    defaultValue={value.start.toISOString().split('T')[0]}
                    max={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data Final
                  </label>
                  <input
                    type="date"
                    name="end"
                    defaultValue={value.end.toISOString().split('T')[0]}
                    max={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCustomInputs(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Hook for managing date range state
export const useDateRange = (initialPreset: DateRangePreset = 'month') => {
  const getInitialRange = (): DateRange => {
    const end = new Date();
    const start = new Date();

    switch (initialPreset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setDate(start.getDate() - 30);
        break;
      case 'quarter':
        start.setDate(start.getDate() - 90);
        break;
      case 'year':
        start.setDate(start.getDate() - 365);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end, preset: initialPreset };
  };

  const [dateRange, setDateRange] = useState<DateRange>(getInitialRange());

  const isInRange = (date: Date | string): boolean => {
    const checkDate = typeof date === 'string' ? new Date(date) : date;
    return checkDate >= dateRange.start && checkDate <= dateRange.end;
  };

  return {
    dateRange,
    setDateRange,
    isInRange,
  };
};
