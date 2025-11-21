import React, { useState, useEffect } from 'react';
import { X, User, Building2, Lock, Loader2 } from 'lucide-react';
import { User as UserType } from '../types';
import { updateUserProfile } from '../services/mockN8nService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onUpdateUser: (user: UserType) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onUpdateUser }) => {
  const [name, setName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name);
      setClinicName(user.clinicName);
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedUser = { ...user, name, clinicName, avatarUrl };
      await updateUserProfile(updatedUser);
      onUpdateUser(updatedUser);
      onClose();
    } catch (error) {
      alert('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <User size={18} /> Meu Perfil
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-md relative group">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-indigo-600">{name.charAt(0)}</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder-gray-400 shadow-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nome da Clínica</label>
            <div className="relative">
                <Building2 className="absolute top-2.5 left-3 text-gray-400" size={16} />
                <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="block w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder-gray-400 shadow-sm"
                required
                />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Avatar URL (Opcional)</label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm placeholder-gray-400 shadow-sm"
              placeholder="https://..."
            />
          </div>

           <div className="pt-2 border-t border-gray-100">
            <button type="button" className="text-xs text-indigo-600 hover:underline flex items-center">
                <Lock size={12} className="mr-1" /> Alterar Senha
            </button>
           </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all mt-4"
          >
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Salvar Alterações'}
          </button>
        </form>
      </div>
    </div>
  );
};