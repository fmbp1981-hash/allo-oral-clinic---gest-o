
import React, { useState } from 'react';
import { X, Calendar, Clock, Check } from 'lucide-react';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date && time) {
      onConfirm(date, time);
      // Reset fields
      setDate('');
      setTime('');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar size={18} /> Agendar Paciente
          </h3>
          <button onClick={onClose} className="text-indigo-200 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600 mb-2">
            Para mover o paciente para <b>Agendado</b>, é necessário definir a data e hora do atendimento.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data do Atendimento</label>
            <input
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Horário</label>
            <div className="relative">
                <Clock className="absolute top-2.5 left-3 text-gray-400" size={16} />
                <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="block w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!date || !time}
              className="flex-1 py-2 px-4 bg-indigo-600 rounded-lg text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              <Check size={16} /> Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
