import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock, User as UserIcon,
  Search, Filter, X, Edit3, Trash2, Eye, RefreshCw, Settings,
  AlertCircle, Check, Phone, FileText
} from 'lucide-react';
import {
  Appointment, AppointmentStatus, Dentist, ScheduleConfig, CalendarView,
  Patient, AvailableSlot
} from '../types';

// --- Schedule Config Types ---
interface DaySchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  lunch_start: string;
  lunch_end: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

// --- Auth Fetch Helper ---
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
};

// --- Date Helpers ---
const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 to 20:00

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return Array.from({ length: 7 }, (_, i) => {
    const nd = new Date(d);
    nd.setDate(diff + i);
    return nd;
  });
}

function getMonthDates(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const dates: Date[] = [];
  for (let i = -startOffset; i <= lastDay.getDate() + (6 - lastDay.getDay()) - 1; i++) {
    dates.push(new Date(year, month, i + 1));
  }
  return dates;
}

function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

// --- Status Config ---
const STATUS_CONFIG: Record<AppointmentStatus, { label: string; bg: string; text: string; dot: string }> = {
  scheduled:   { label: 'Agendado',    bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-700 dark:text-blue-400',    dot: 'bg-blue-500' },
  confirmed:   { label: 'Confirmado',  bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  in_progress: { label: 'Em Atendimento', bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-700 dark:text-amber-400',  dot: 'bg-amber-500' },
  completed:   { label: 'Concluído',   bg: 'bg-green-50 dark:bg-green-900/20',  text: 'text-green-700 dark:text-green-400',  dot: 'bg-green-500' },
  cancelled:   { label: 'Cancelado',   bg: 'bg-red-50 dark:bg-red-900/20',      text: 'text-red-700 dark:text-red-400',      dot: 'bg-red-500' },
  no_show:     { label: 'Não Compareceu', bg: 'bg-gray-100 dark:bg-gray-700',    text: 'text-gray-600 dark:text-gray-400',    dot: 'bg-gray-500' },
  rescheduled: { label: 'Remarcado',    bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400', dot: 'bg-purple-500' },
};

// --- Status Badge ---
const AppointmentStatusBadge = ({ status }: { status: AppointmentStatus }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// --- Appointment Card (for Day/Week views) ---
const AppointmentCard = ({
  appointment,
  compact = false,
  onClick,
}: {
  appointment: Appointment;
  compact?: boolean;
  onClick: () => void;
}) => {
  const dentistColor = appointment.dentists?.color || '#6366f1';
  const startTime = formatTime(appointment.start_time);
  const endTime = formatTime(appointment.end_time);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border-l-[3px] px-2 py-1.5 transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer group"
      style={{
        borderLeftColor: dentistColor,
        backgroundColor: `${dentistColor}10`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-800 dark:text-white truncate">
            {appointment.patients?.name || 'Paciente'}
          </p>
          {!compact && (
            <>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                {startTime} - {endTime}
              </p>
              {appointment.procedure && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                  {appointment.procedure}
                </p>
              )}
            </>
          )}
        </div>
        {compact && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1 shrink-0">{startTime}</span>
        )}
      </div>
    </button>
  );
};

// ==============================
// New Appointment Modal
// ==============================
interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewAppointmentData) => Promise<void>;
  dentists: Dentist[];
  initialDate?: string;
  initialTime?: string;
  editingAppointment?: Appointment | null;
}

interface NewAppointmentData {
  patient_id: string;
  patient_name?: string;
  dentist_id: string;
  start_time: string;
  end_time: string;
  procedure: string;
  notes: string;
  source: 'manual';
}

const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({
  isOpen, onClose, onSave, dentists, initialDate, initialTime, editingAppointment
}) => {
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [dentistId, setDentistId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [procedure, setProcedure] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<{ start_time: string; end_time: string }[]>([]);
  const searchTimeout = React.useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (isOpen) {
      setDate(initialDate || formatDate(new Date()));
      setStartTime(initialTime || '');
      setEndTime('');
      setProcedure('');
      setNotes('');
      setError('');
      setDentistId(dentists[0]?.id || '');
      setSelectedPatient(null);
      setPatientSearch('');

      if (editingAppointment) {
        setDentistId(editingAppointment.dentist_id);
        setDate(editingAppointment.start_time.split('T')[0]);
        setStartTime(formatTime(editingAppointment.start_time));
        setEndTime(formatTime(editingAppointment.end_time));
        setProcedure(editingAppointment.procedure || '');
        setNotes(editingAppointment.notes || '');
        if (editingAppointment.patients) {
          setSelectedPatient({
            id: editingAppointment.patient_id,
            name: editingAppointment.patients.name,
            phone: editingAppointment.patients.phone,
          });
          setPatientSearch(editingAppointment.patients.name);
        }
      }
    }
  }, [isOpen, initialDate, initialTime, dentists, editingAppointment]);

  // Search patients
  useEffect(() => {
    if (patientSearch.length < 2) {
      setPatients([]);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const data = await authFetch(`/api/patients?search=${encodeURIComponent(patientSearch)}&limit=8`);
        setPatients(data.patients || []);
        setShowPatientDropdown(true);
      } catch {
        setPatients([]);
      }
    }, 300);
  }, [patientSearch]);

  // Fetch available slots when dentist + date change
  useEffect(() => {
    if (!dentistId || !date) return;
    authFetch(`/api/appointments/available-slots?dentist_id=${dentistId}&date=${date}`)
      .then(data => setAvailableSlots(data.slots || []))
      .catch(() => setAvailableSlots([]));
  }, [dentistId, date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) { setError('Selecione um paciente'); return; }
    if (!dentistId) { setError('Selecione um dentista'); return; }
    if (!date || !startTime || !endTime) { setError('Preencha data e horários'); return; }

    setSaving(true);
    setError('');
    try {
      await onSave({
        patient_id: selectedPatient.id,
        patient_name: selectedPatient.name,
        dentist_id: dentistId,
        start_time: `${date}T${startTime}:00`,
        end_time: `${date}T${endTime}:00`,
        procedure,
        notes,
        source: 'manual',
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2 text-lg">
            <Calendar size={20} />
            {editingAppointment ? 'Editar Consulta' : 'Nova Consulta'}
          </h3>
          <button onClick={onClose} className="text-indigo-200 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Patient Search */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Paciente *</label>
            {selectedPatient ? (
              <div className="flex items-center gap-2 p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
                <UserIcon size={16} className="text-indigo-500" />
                <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300 flex-1">{selectedPatient.name}</span>
                <span className="text-xs text-indigo-500 dark:text-indigo-400">{selectedPatient.phone}</span>
                <button type="button" onClick={() => { setSelectedPatient(null); setPatientSearch(''); }} className="text-indigo-400 hover:text-indigo-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  onFocus={() => patients.length > 0 && setShowPatientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowPatientDropdown(false), 200)}
                  placeholder="Buscar paciente por nome ou telefone..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {showPatientDropdown && patients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {patients.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientSearch(p.name);
                          setShowPatientDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors"
                      >
                        <UserIcon size={14} className="text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-800 dark:text-white flex-1 truncate">{p.name}</span>
                        <span className="text-xs text-gray-400">{p.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dentist Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Dentista *</label>
            <div className="grid grid-cols-2 gap-2">
              {dentists.filter(d => d.is_active).map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDentistId(d.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-left ${
                    dentistId === d.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{d.name}</p>
                    {d.specialty && <p className="text-[10px] text-gray-400 truncate">{d.specialty}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data *</label>
              <input
                type="date"
                value={date}
                min={formatDate(new Date())}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Início *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  // Auto-set end time +30min
                  if (e.target.value) {
                    const [h, m] = e.target.value.split(':').map(Number);
                    const endMin = (h * 60 + m + 30);
                    const endH = String(Math.floor(endMin / 60)).padStart(2, '0');
                    const endM = String(endMin % 60).padStart(2, '0');
                    setEndTime(`${endH}:${endM}`);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fim *</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Available Slots */}
          {availableSlots.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Horários Disponíveis</label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                {availableSlots.map((slot, i) => {
                  const st = formatTime(slot.start_time);
                  const isSelected = startTime === st;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setStartTime(formatTime(slot.start_time));
                        setEndTime(formatTime(slot.end_time));
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-500 hover:border-indigo-400 hover:text-indigo-600'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Procedure */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Procedimento</label>
            <input
              type="text"
              value={procedure}
              onChange={(e) => setProcedure(e.target.value)}
              placeholder="Ex: Limpeza, Avaliação, Clareamento..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observações sobre a consulta..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg text-sm font-medium text-white hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
              {editingAppointment ? 'Salvar' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==============================
// Appointment Detail Modal
// ==============================
interface AppointmentDetailModalProps {
  appointment: Appointment | null;
  onClose: () => void;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onEdit: (appointment: Appointment) => void;
  onCancel: (id: string) => void;
}

const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  appointment, onClose, onStatusChange, onEdit, onCancel
}) => {
  if (!appointment) return null;

  const dentistColor = appointment.dentists?.color || '#6366f1';
  const canTransition = !['cancelled', 'completed', 'no_show', 'rescheduled'].includes(appointment.status);

  const nextStatus: { status: AppointmentStatus; label: string }[] = [];
  if (appointment.status === 'scheduled') nextStatus.push({ status: 'confirmed', label: 'Confirmar' });
  if (appointment.status === 'confirmed') nextStatus.push({ status: 'in_progress', label: 'Iniciar Atendimento' });
  if (appointment.status === 'in_progress') nextStatus.push({ status: 'completed', label: 'Concluir' });
  if (canTransition) nextStatus.push({ status: 'no_show', label: 'Não Compareceu' });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header with dentist color */}
        <div className="p-4 text-white flex justify-between items-center" style={{ backgroundColor: dentistColor }}>
          <div>
            <h3 className="font-semibold text-lg">{appointment.patients?.name || 'Paciente'}</h3>
            <p className="text-sm opacity-90">
              {appointment.dentists?.name} {appointment.dentists?.specialty ? `• ${appointment.dentists.specialty}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <AppointmentStatusBadge status={appointment.status} />
            <span className="text-xs text-gray-400">
              {appointment.source === 'agent' ? '🤖 Agendado por IA' : appointment.source === 'online' ? '🌐 Online' : '👤 Manual'}
            </span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Clock size={18} className="text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                {new Date(appointment.start_time).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
              </p>
            </div>
          </div>

          {/* Procedure */}
          {appointment.procedure && (
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-gray-400 shrink-0" />
              <p className="text-sm text-gray-700 dark:text-gray-300">{appointment.procedure}</p>
            </div>
          )}

          {/* Phone */}
          {appointment.patients?.phone && (
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-gray-400 shrink-0" />
              <p className="text-sm text-gray-700 dark:text-gray-300">{appointment.patients.phone}</p>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
              <p className="text-xs text-yellow-800 dark:text-yellow-400">{appointment.notes}</p>
            </div>
          )}

          {/* Status Transitions */}
          {nextStatus.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {nextStatus.map(ns => (
                <button
                  key={ns.status}
                  onClick={() => onStatusChange(appointment.id, ns.status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    ns.status === 'no_show'
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                      : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100'
                  }`}
                >
                  {ns.label}
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            {canTransition && (
              <>
                <button
                  onClick={() => onEdit(appointment)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Edit3 size={14} /> Editar
                </button>
                <button
                  onClick={() => onCancel(appointment.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 size={14} /> Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==============================
// Dentist Management Modal
// ==============================
interface DentistManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  dentists: Dentist[];
  onRefresh: () => void;
}

const DentistManagementModal: React.FC<DentistManagementModalProps> = ({ isOpen, onClose, dentists, onRefresh }) => {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [crm, setCrm] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scheduleEditingId, setScheduleEditingId] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<DaySchedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

  const DAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const defaultSchedule: DaySchedule[] = Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    start_time: '08:00',
    end_time: '18:00',
    lunch_start: '12:00',
    lunch_end: '13:00',
    slot_duration_minutes: 30,
    is_active: i >= 1 && i <= 5, // Mon-Fri active by default
  }));

  const loadSchedule = async (dentistId: string) => {
    if (scheduleEditingId === dentistId) {
      setScheduleEditingId(null);
      return;
    }
    setScheduleEditingId(dentistId);
    setScheduleLoading(true);
    try {
      const data = await authFetch(`/api/dentists/${dentistId}/schedule`);
      const existing: ScheduleConfig[] = data.schedule ?? [];
      const merged = defaultSchedule.map(def => {
        const found = existing.find(e => e.day_of_week === def.day_of_week);
        if (found) {
          return {
            day_of_week: found.day_of_week,
            start_time: (found.start_time || '08:00').substring(0, 5),
            end_time: (found.end_time || '18:00').substring(0, 5),
            lunch_start: (found.lunch_start || '12:00').substring(0, 5),
            lunch_end: (found.lunch_end || '13:00').substring(0, 5),
            slot_duration_minutes: found.slot_duration_minutes || 30,
            is_active: found.is_active,
          };
        }
        return def;
      });
      setScheduleData(merged);
    } catch {
      setScheduleData(defaultSchedule);
    } finally {
      setScheduleLoading(false);
    }
  };

  const updateDaySchedule = (dayIndex: number, field: keyof DaySchedule, value: unknown) => {
    setScheduleData(prev => prev.map(d =>
      d.day_of_week === dayIndex ? { ...d, [field]: value } : d
    ));
  };

  const saveSchedule = async () => {
    if (!scheduleEditingId) return;
    setScheduleSaving(true);
    try {
      await authFetch(`/api/dentists/${scheduleEditingId}/schedule`, {
        method: 'PUT',
        body: JSON.stringify({ days: scheduleData }),
      });
      setScheduleEditingId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar horários');
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!name || name.length < 2) { setError('Nome deve ter ao menos 2 caracteres'); return; }
    setSaving(true);
    setError('');
    try {
      await authFetch('/api/dentists', {
        method: 'POST',
        body: JSON.stringify({ name, specialty: specialty || undefined, crm: crm || undefined, color, phone: phone || undefined, email: email || undefined }),
      });
      setName(''); setSpecialty(''); setCrm(''); setPhone(''); setEmail('');
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (d: Dentist) => {
    try {
      await authFetch(`/api/dentists/${d.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !d.is_active }),
      });
      onRefresh();
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-4 text-white flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2 text-lg">
            <Settings size={20} /> Gerenciar Dentistas
          </h3>
          <button onClick={onClose} className="text-teal-200 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Existing dentists */}
          <div className="space-y-2">
            {dentists.map(d => (
              <div key={d.id}>
                <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${d.is_active ? 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700' : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 opacity-60'}`}>
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{d.name}</p>
                    <p className="text-xs text-gray-400 truncate">{[d.specialty, d.crm].filter(Boolean).join(' • ')}</p>
                  </div>
                  <button
                    onClick={() => loadSchedule(d.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      scheduleEditingId === d.id
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                    }`}
                    title="Configurar horários"
                  >
                    <Clock size={12} className="inline mr-1" />
                    Horários
                  </button>
                  <button
                    onClick={() => handleToggleActive(d)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${d.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'}`}
                  >
                    {d.is_active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>

                {/* Schedule Config Panel */}
                {scheduleEditingId === d.id && (
                  <div className="mt-2 ml-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1.5">
                      <Clock size={12} /> Horários de Atendimento — {d.name}
                    </p>

                    {scheduleLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <RefreshCw size={16} className="animate-spin text-indigo-500" />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          {scheduleData.map(day => (
                            <div key={day.day_of_week} className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${day.is_active ? 'bg-white dark:bg-gray-800' : 'bg-gray-100 dark:bg-gray-800/50 opacity-50'}`}>
                              <label className="flex items-center gap-2 w-24 shrink-0">
                                <input
                                  type="checkbox"
                                  checked={day.is_active}
                                  onChange={e => updateDaySchedule(day.day_of_week, 'is_active', e.target.checked)}
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{DAYS_FULL[day.day_of_week]}</span>
                              </label>
                              {day.is_active && (
                                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                  <input type="time" value={day.start_time} onChange={e => updateDaySchedule(day.day_of_week, 'start_time', e.target.value)}
                                    className="px-1.5 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-[85px]" />
                                  <span className="text-gray-400">—</span>
                                  <input type="time" value={day.end_time} onChange={e => updateDaySchedule(day.day_of_week, 'end_time', e.target.value)}
                                    className="px-1.5 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-[85px]" />
                                  <span className="text-gray-400 ml-1">Almoço:</span>
                                  <input type="time" value={day.lunch_start} onChange={e => updateDaySchedule(day.day_of_week, 'lunch_start', e.target.value)}
                                    className="px-1.5 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-[85px]" />
                                  <span className="text-gray-400">—</span>
                                  <input type="time" value={day.lunch_end} onChange={e => updateDaySchedule(day.day_of_week, 'lunch_end', e.target.value)}
                                    className="px-1.5 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-[85px]" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            Duração do slot:
                            <select
                              value={scheduleData[0]?.slot_duration_minutes ?? 30}
                              onChange={e => {
                                const mins = parseInt(e.target.value, 10);
                                setScheduleData(prev => prev.map(d => ({ ...d, slot_duration_minutes: mins })));
                              }}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value={15}>15 min</option>
                              <option value={20}>20 min</option>
                              <option value={30}>30 min</option>
                              <option value={45}>45 min</option>
                              <option value={60}>60 min</option>
                            </select>
                          </label>
                          <div className="flex-1" />
                          <button
                            onClick={() => setScheduleEditingId(null)}
                            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={saveSchedule}
                            disabled={scheduleSaving}
                            className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                          >
                            {scheduleSaving ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                            Salvar Horários
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add new */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Adicionar Dentista</p>
            <div className="grid grid-cols-2 gap-3">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome *" className="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="Especialidade" className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <input value={crm} onChange={e => setCrm(e.target.value)} placeholder="CRO" className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefone" className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">Cor:</span>
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              onClick={handleAdd}
              disabled={saving || !name}
              className="w-full mt-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==============================
// Main AgendaPage Component
// ==============================
export const AgendaPage: React.FC = () => {
  const [view, setView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDentistId, setSelectedDentistId] = useState<string>('all');

  // Modal state
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [dentistModalOpen, setDentistModalOpen] = useState(false);
  const [newModalDate, setNewModalDate] = useState<string>();
  const [newModalTime, setNewModalTime] = useState<string>();

  // Compute date ranges
  const dateRange = useMemo(() => {
    if (view === 'day') {
      return { start: formatDate(currentDate), end: formatDate(currentDate) };
    }
    if (view === 'week') {
      const week = getWeekDates(currentDate);
      return { start: formatDate(week[0]), end: formatDate(week[6]) };
    }
    // month
    const monthDates = getMonthDates(currentDate);
    return { start: formatDate(monthDates[0]), end: formatDate(monthDates[monthDates.length - 1]) };
  }, [view, currentDate]);

  // Fetch data
  const fetchAppointments = useCallback(async () => {
    try {
      const params = new URLSearchParams({ from: dateRange.start, to: dateRange.end });
      if (selectedDentistId !== 'all') params.set('dentist_id', selectedDentistId);
      const data = await authFetch(`/api/appointments?${params}`);
      setAppointments(data.appointments || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    }
  }, [dateRange, selectedDentistId]);

  const fetchDentists = useCallback(async () => {
    try {
      const data = await authFetch('/api/dentists');
      setDentists(data.dentists || []);
    } catch (err) {
      console.error('Error fetching dentists:', err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchAppointments(), fetchDentists()]).finally(() => setLoading(false));
  }, [fetchAppointments, fetchDentists]);

  // Navigation
  const navigate = (direction: number) => {
    const d = new Date(currentDate);
    if (view === 'day') d.setDate(d.getDate() + direction);
    else if (view === 'week') d.setDate(d.getDate() + direction * 7);
    else d.setMonth(d.getMonth() + direction);
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  // Title
  const title = useMemo(() => {
    if (view === 'day') {
      return currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (view === 'week') {
      const week = getWeekDates(currentDate);
      const s = week[0];
      const e = week[6];
      if (s.getMonth() === e.getMonth()) {
        return `${s.getDate()} - ${e.getDate()} de ${MONTHS_PT[s.getMonth()]} ${s.getFullYear()}`;
      }
      return `${s.getDate()} ${MONTHS_PT[s.getMonth()].substring(0, 3)} - ${e.getDate()} ${MONTHS_PT[e.getMonth()].substring(0, 3)} ${e.getFullYear()}`;
    }
    return `${MONTHS_PT[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [view, currentDate]);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    if (selectedDentistId === 'all') return appointments;
    return appointments.filter(a => a.dentist_id === selectedDentistId);
  }, [appointments, selectedDentistId]);

  // Handlers
  const handleCreateAppointment = async (data: NewAppointmentData) => {
    await authFetch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await fetchAppointments();
  };

  const handleUpdateAppointment = async (data: NewAppointmentData) => {
    if (!editingAppointment) return;
    await authFetch(`/api/appointments/${editingAppointment.id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    setEditingAppointment(null);
    await fetchAppointments();
  };

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    await authFetch(`/api/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    setDetailAppointment(null);
    await fetchAppointments();
  };

  const handleCancelAppointment = async (id: string) => {
    await authFetch(`/api/appointments/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason: 'Cancelado pelo usuário' }),
    });
    setDetailAppointment(null);
    await fetchAppointments();
  };

  const handleCellClick = (date: string, time?: string) => {
    setNewModalDate(date);
    setNewModalTime(time);
    setEditingAppointment(null);
    setNewModalOpen(true);
  };

  const handleEditClick = (appt: Appointment) => {
    setEditingAppointment(appt);
    setDetailAppointment(null);
    setNewModalOpen(true);
  };

  // Get appointments for a specific date
  const getAppointmentsForDate = useCallback((date: Date) => {
    return filteredAppointments.filter(a => isSameDay(new Date(a.start_time), date));
  }, [filteredAppointments]);

  // Today stats
  const todayAppts = getAppointmentsForDate(new Date());
  const todayScheduled = todayAppts.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length;
  const todayCompleted = todayAppts.filter(a => a.status === 'completed').length;

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Calendar className="text-indigo-600" size={24} />
              Agenda
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {todayScheduled > 0 ? `${todayScheduled} consulta${todayScheduled > 1 ? 's' : ''} agendada${todayScheduled > 1 ? 's' : ''} hoje` : 'Nenhuma consulta agendada para hoje'}
              {todayCompleted > 0 ? ` • ${todayCompleted} concluída${todayCompleted > 1 ? 's' : ''}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Dentist filter */}
            <select
              value={selectedDentistId}
              onChange={e => setSelectedDentistId(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos Dentistas</option>
              {dentists.filter(d => d.is_active).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <button
              onClick={() => setDentistModalOpen(true)}
              className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Gerenciar Dentistas"
            >
              <Settings size={18} />
            </button>

            <button
              onClick={() => { setEditingAppointment(null); setNewModalDate(formatDate(currentDate)); setNewModalTime(undefined); setNewModalOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm"
            >
              <Plus size={16} /> Nova Consulta
            </button>
          </div>
        </div>

        {/* Navigation + View Switcher */}
        <div className="flex items-center justify-between mt-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
            </button>
            <button onClick={goToToday} className="px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
              Hoje
            </button>
            <button onClick={() => navigate(1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <ChevronRight size={18} className="text-gray-600 dark:text-gray-400" />
            </button>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white ml-2 capitalize">{title}</h3>
          </div>

          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            {(['day', 'week', 'month'] as CalendarView[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  view === v
                    ? 'bg-white dark:bg-gray-600 text-indigo-700 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>

        {/* Dentist Legend */}
        {dentists.filter(d => d.is_active).length > 1 && (
          <div className="flex items-center gap-3 mt-2 overflow-x-auto pb-1">
            {dentists.filter(d => d.is_active).map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDentistId(selectedDentistId === d.id ? 'all' : d.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                  selectedDentistId === d.id
                    ? 'ring-2 ring-offset-1 ring-indigo-500'
                    : selectedDentistId === 'all' ? 'opacity-100' : 'opacity-40'
                }`}
                style={{
                  backgroundColor: `${d.color}15`,
                  color: d.color,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : (
          <>
            {view === 'day' && (
              <DayView
                date={currentDate}
                appointments={filteredAppointments}
                dentists={dentists.filter(d => d.is_active)}
                onAppointmentClick={setDetailAppointment}
                onCellClick={handleCellClick}
              />
            )}
            {view === 'week' && (
              <WeekView
                currentDate={currentDate}
                appointments={filteredAppointments}
                dentists={dentists.filter(d => d.is_active)}
                onAppointmentClick={setDetailAppointment}
                onCellClick={handleCellClick}
              />
            )}
            {view === 'month' && (
              <MonthView
                currentDate={currentDate}
                appointments={filteredAppointments}
                onAppointmentClick={setDetailAppointment}
                onDayClick={(d) => { setCurrentDate(d); setView('day'); }}
                onAddClick={(d) => handleCellClick(formatDate(d))}
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <NewAppointmentModal
        isOpen={newModalOpen}
        onClose={() => { setNewModalOpen(false); setEditingAppointment(null); }}
        onSave={editingAppointment ? handleUpdateAppointment : handleCreateAppointment}
        dentists={dentists}
        initialDate={newModalDate}
        initialTime={newModalTime}
        editingAppointment={editingAppointment}
      />

      <AppointmentDetailModal
        appointment={detailAppointment}
        onClose={() => setDetailAppointment(null)}
        onStatusChange={handleStatusChange}
        onEdit={handleEditClick}
        onCancel={handleCancelAppointment}
      />

      <DentistManagementModal
        isOpen={dentistModalOpen}
        onClose={() => setDentistModalOpen(false)}
        dentists={dentists}
        onRefresh={fetchDentists}
      />
    </div>
  );
};

// ==============================
// Day View
// ==============================
const DayView: React.FC<{
  date: Date;
  appointments: Appointment[];
  dentists: Dentist[];
  onAppointmentClick: (a: Appointment) => void;
  onCellClick: (date: string, time?: string) => void;
}> = ({ date, appointments, dentists, onAppointmentClick, onCellClick }) => {
  const dayAppts = appointments.filter(a => isSameDay(new Date(a.start_time), date));
  const dateStr = formatDate(date);
  const showDentistCols = dentists.length > 1;

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="w-16 px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-r border-gray-200 dark:border-gray-700">
              Hora
            </th>
            {showDentistCols ? (
              dentists.map(d => (
                <th key={d.id} className="px-2 py-2 text-xs font-medium border-b border-r border-gray-200 dark:border-gray-700 last:border-r-0" style={{ color: d.color }}>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name}
                  </div>
                </th>
              ))
            ) : (
              <th className="px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {HOURS.map(hour => (
            <tr key={hour} className="group">
              <td className="px-2 py-3 text-xs text-gray-400 dark:text-gray-500 font-medium border-r border-b border-gray-100 dark:border-gray-700/50 text-right align-top w-16">
                {String(hour).padStart(2, '0')}:00
              </td>
              {showDentistCols ? (
                dentists.map(d => {
                  const cellAppts = dayAppts.filter(a =>
                    a.dentist_id === d.id &&
                    new Date(a.start_time).getHours() === hour
                  );
                  return (
                    <td
                      key={d.id}
                      onClick={() => onCellClick(dateStr, `${String(hour).padStart(2, '0')}:00`)}
                      className="px-1 py-1 border-r border-b border-gray-100 dark:border-gray-700/50 last:border-r-0 cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors align-top min-h-[3rem]"
                    >
                      <div className="space-y-1">
                        {cellAppts.map(a => (
                          <AppointmentCard key={a.id} appointment={a} onClick={() => onAppointmentClick(a)} />
                        ))}
                      </div>
                    </td>
                  );
                })
              ) : (
                <td
                  onClick={() => onCellClick(dateStr, `${String(hour).padStart(2, '0')}:00`)}
                  className="px-1 py-1 border-b border-gray-100 dark:border-gray-700/50 cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors align-top"
                >
                  <div className="space-y-1">
                    {dayAppts
                      .filter(a => new Date(a.start_time).getHours() === hour)
                      .map(a => (
                        <AppointmentCard key={a.id} appointment={a} onClick={() => onAppointmentClick(a)} />
                      ))
                    }
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ==============================
// Week View
// ==============================
const WeekView: React.FC<{
  currentDate: Date;
  appointments: Appointment[];
  dentists: Dentist[];
  onAppointmentClick: (a: Appointment) => void;
  onCellClick: (date: string, time?: string) => void;
}> = ({ currentDate, appointments, dentists, onAppointmentClick, onCellClick }) => {
  const weekDates = getWeekDates(currentDate);
  const today = new Date();

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="w-16 px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-r border-gray-200 dark:border-gray-700">
              Hora
            </th>
            {weekDates.map((d, i) => {
              const isToday = isSameDay(d, today);
              return (
                <th key={i} className={`px-1 py-2 text-center border-b border-r border-gray-200 dark:border-gray-700 last:border-r-0 ${isToday ? 'bg-indigo-50/70 dark:bg-indigo-900/20' : ''}`}>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">{DAYS_PT[d.getDay()]}</p>
                  <p className={`text-sm font-bold mt-0.5 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {d.getDate()}
                  </p>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {HOURS.map(hour => (
            <tr key={hour}>
              <td className="px-2 py-2 text-xs text-gray-400 dark:text-gray-500 font-medium border-r border-b border-gray-100 dark:border-gray-700/50 text-right align-top w-16">
                {String(hour).padStart(2, '0')}:00
              </td>
              {weekDates.map((d, i) => {
                const dateStr = formatDate(d);
                const isToday = isSameDay(d, today);
                const cellAppts = appointments.filter(a =>
                  isSameDay(new Date(a.start_time), d) &&
                  new Date(a.start_time).getHours() === hour
                );
                return (
                  <td
                    key={i}
                    onClick={() => onCellClick(dateStr, `${String(hour).padStart(2, '0')}:00`)}
                    className={`px-0.5 py-0.5 border-r border-b border-gray-100 dark:border-gray-700/50 last:border-r-0 cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors align-top min-h-[2.5rem] ${isToday ? 'bg-indigo-50/30 dark:bg-indigo-900/5' : ''}`}
                  >
                    <div className="space-y-0.5">
                      {cellAppts.map(a => (
                        <AppointmentCard key={a.id} appointment={a} compact onClick={() => onAppointmentClick(a)} />
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ==============================
// Month View
// ==============================
const MonthView: React.FC<{
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (a: Appointment) => void;
  onDayClick: (date: Date) => void;
  onAddClick: (date: Date) => void;
}> = ({ currentDate, appointments, onAppointmentClick, onDayClick, onAddClick }) => {
  const monthDates = getMonthDates(currentDate);
  const today = new Date();
  const currentMonth = currentDate.getMonth();

  return (
    <div className="h-full flex flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        {DAYS_PT.map(day => (
          <div key={day} className="px-2 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
        {monthDates.map((d, idx) => {
          const isToday = isSameDay(d, today);
          const isCurrentMonth = d.getMonth() === currentMonth;
          const dayAppts = appointments
            .filter(a => isSameDay(new Date(a.start_time), d))
            .slice(0, 4); // Show max 4 in month view
          const totalAppts = appointments.filter(a => isSameDay(new Date(a.start_time), d)).length;

          return (
            <div
              key={idx}
              className={`border-r border-b border-gray-100 dark:border-gray-700/50 p-1 min-h-[5rem] group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                !isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''
              } ${isToday ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
              onClick={() => onDayClick(d)}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-indigo-600 text-white' : isCurrentMonth ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'
                }`}>
                  {d.getDate()}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onAddClick(d); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-indigo-600 transition-all"
                >
                  <Plus size={12} />
                </button>
              </div>
              <div className="space-y-0.5">
                {dayAppts.map(a => (
                  <button
                    key={a.id}
                    onClick={(e) => { e.stopPropagation(); onAppointmentClick(a); }}
                    className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: `${a.dentists?.color || '#6366f1'}20`,
                      color: a.dentists?.color || '#6366f1',
                      borderLeft: `2px solid ${a.dentists?.color || '#6366f1'}`,
                    }}
                  >
                    {formatTime(a.start_time)} {a.patients?.name || 'Paciente'}
                  </button>
                ))}
                {totalAppts > 4 && (
                  <p className="text-[10px] text-indigo-500 font-medium pl-1.5">+{totalAppts - 4} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
