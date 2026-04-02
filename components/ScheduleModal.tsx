
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Check, RefreshCw, User as UserIcon } from 'lucide-react';

// Auth helper
const authFetch = async (url: string) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

interface Dentist {
  id: string;
  name: string;
  specialty?: string;
  color: string;
  is_active?: boolean;
}

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string, time: string, dentistId?: string) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [selectedDentistId, setSelectedDentistId] = useState('');
  const [availableSlots, setAvailableSlots] = useState<{ start_time: string; end_time: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (isOpen) {
      authFetch('/api/dentists')
        .then(data => {
          const active = (data.dentists || []).filter((d: Dentist) => d.is_active !== false);
          setDentists(active);
          if (active.length > 0 && !selectedDentistId) setSelectedDentistId(active[0].id);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedDentistId || !date) { setAvailableSlots([]); return; }
    setLoadingSlots(true);
    authFetch(`/api/appointments/available-slots?dentist_id=${selectedDentistId}&date=${date}`)
      .then(data => setAvailableSlots(data.slots || []))
      .catch(() => setAvailableSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDentistId, date]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (date && time) {
      onConfirm(date, time, selectedDentistId || undefined);
      setDate('');
      setTime('');
    }
  };

  const formatSlotTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar size={18} /> Agendar Paciente
          </h3>
          <button onClick={onClose} className="text-indigo-200 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Para mover o paciente para <b>Agendado</b>, defina a data, dentista e horário.
          </p>

          {/* Dentist selection */}
          {dentists.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Dentista</label>
              <div className="grid grid-cols-2 gap-2">
                {dentists.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDentistId(d.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border-2 text-left text-sm transition-all ${
                      selectedDentistId === d.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="truncate text-gray-800 dark:text-white">{d.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Data do Atendimento</label>
            <input
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Available Slots */}
          {date && selectedDentistId && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Horários Disponíveis</label>
              {loadingSlots ? (
                <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
                  <RefreshCw size={14} className="animate-spin" /> Carregando...
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  {availableSlots.map((slot, i) => {
                    const st = formatSlotTime(slot.start_time);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTime(st)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                          time === st
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-500 hover:border-indigo-400'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 py-2">Nenhum horário disponível nesta data.</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-400 mb-1">Horário</label>
            <div className="relative">
                <Clock className="absolute top-2.5 left-3 text-gray-400" size={16} />
                <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="block w-full pl-9 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
