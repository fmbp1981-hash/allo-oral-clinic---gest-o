import React, { useState, useEffect } from 'react';
import {
    X,
    Save,
    Calendar,
    FileText,
    Stethoscope,
    Pill,
    ClipboardList,
    User,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { ClinicalRecord, ClinicalRecordType } from '../types';

interface ProntuarioEditorProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
    patientName: string;
    record?: ClinicalRecord | null;
    onSave: (record: ClinicalRecord) => Promise<void>;
}

const recordTypes: { value: ClinicalRecordType; label: string; icon: React.ElementType }[] = [
    { value: 'consultation', label: 'Consulta', icon: Stethoscope },
    { value: 'procedure', label: 'Procedimento', icon: ClipboardList },
    { value: 'exam', label: 'Exame', icon: FileText },
    { value: 'prescription', label: 'Prescrição', icon: Pill },
    { value: 'note', label: 'Anotação', icon: FileText },
];

export const ProntuarioEditor = ({
    isOpen,
    onClose,
    patientId,
    patientName,
    record,
    onSave,
}: ProntuarioEditorProps) => {
    const [loading, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form fields
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<ClinicalRecordType>('consultation');
    const [description, setDescription] = useState('');
    const [diagnosis, setDiagnosis] = useState('');
    const [treatment, setTreatment] = useState('');
    const [medications, setMedications] = useState('');
    const [observations, setObservations] = useState('');
    const [dentistName, setDentistName] = useState('');

    // Populate form when editing
    useEffect(() => {
        if (record) {
            setDate(record.date ? record.date.split('T')[0] : new Date().toISOString().split('T')[0]);
            setType(record.type || 'consultation');
            setDescription(record.description || '');
            setDiagnosis(record.diagnosis || '');
            setTreatment(record.treatment || '');
            setMedications(record.medications || '');
            setObservations(record.observations || '');
            setDentistName(record.dentistName || '');
        } else {
            // Reset form for new record
            setDate(new Date().toISOString().split('T')[0]);
            setType('consultation');
            setDescription('');
            setDiagnosis('');
            setTreatment('');
            setMedications('');
            setObservations('');
            setDentistName('');
        }
    }, [record, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!description.trim()) {
            setError('A descrição é obrigatória');
            return;
        }

        setSaving(true);
        try {
            const recordData: ClinicalRecord = {
                id: record?.id,
                patientId,
                date: new Date(date).toISOString(),
                type,
                description: description.trim(),
                diagnosis: diagnosis.trim() || undefined,
                treatment: treatment.trim() || undefined,
                medications: medications.trim() || undefined,
                observations: observations.trim() || undefined,
                dentistName: dentistName.trim() || undefined,
            };

            await onSave(recordData);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao salvar registro');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-black/50" onClick={onClose} />

                <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                {record ? 'Editar Registro Clínico' : 'Novo Registro Clínico'}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Paciente: {patientName}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            {/* Date and Type Row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        <Calendar size={16} className="inline mr-1" />
                                        Data
                                    </label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tipo de Registro
                                    </label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as ClinicalRecordType)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {recordTypes.map((rt) => (
                                            <option key={rt.value} value={rt.value}>
                                                {rt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Dentist Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <User size={16} className="inline mr-1" />
                                    Profissional Responsável
                                </label>
                                <input
                                    type="text"
                                    value={dentistName}
                                    onChange={(e) => setDentistName(e.target.value)}
                                    placeholder="Nome do dentista"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <FileText size={16} className="inline mr-1" />
                                    Descrição *
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Descreva o atendimento realizado..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                    required
                                />
                            </div>

                            {/* Diagnosis */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <Stethoscope size={16} className="inline mr-1" />
                                    Diagnóstico
                                </label>
                                <textarea
                                    value={diagnosis}
                                    onChange={(e) => setDiagnosis(e.target.value)}
                                    placeholder="Diagnóstico clínico..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Treatment */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <ClipboardList size={16} className="inline mr-1" />
                                    Tratamento
                                </label>
                                <textarea
                                    value={treatment}
                                    onChange={(e) => setTreatment(e.target.value)}
                                    placeholder="Tratamento realizado ou proposto..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Medications */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    <Pill size={16} className="inline mr-1" />
                                    Medicamentos
                                </label>
                                <textarea
                                    value={medications}
                                    onChange={(e) => setMedications(e.target.value)}
                                    placeholder="Medicamentos prescritos..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Observations */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Observações
                                </label>
                                <textarea
                                    value={observations}
                                    onChange={(e) => setObservations(e.target.value)}
                                    placeholder="Observações adicionais..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Salvar Registro
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProntuarioEditor;
