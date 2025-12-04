
import React, { useState } from 'react';
import { Activity, Lock, Mail, Loader2, ArrowRight, User, Building2, ChevronLeft, CheckCircle, Key } from 'lucide-react';
import { loginUser, registerUser, requestPasswordReset, resetPassword } from '../services/apiService';
import { User as UserType } from '../types';

interface LoginPageProps {
  onLogin: (user: UserType) => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');

  // Campos
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Estados de UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const user = await loginUser(email, password);
        onLogin(user);
      } else if (mode === 'register') {
        const user = await registerUser(name, email, password, clinicName);
        onLogin(user);
      } else if (mode === 'forgot') {
        const message = await requestPasswordReset(email);
        setSuccessMsg('Código de recuperação enviado! Verifique o console do backend para o código de 6 dígitos.');
        setMode('reset'); // Avança para tela de reset
        setLoading(false);
        return;
      } else if (mode === 'reset') {
        const message = await resetPassword(email, resetToken, newPassword);
        setSuccessMsg('Senha redefinida com sucesso! Você já pode fazer login com sua nova senha.');
        setLoading(false);
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      if (mode !== 'forgot' && mode !== 'reset') setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Activity className="text-white" size={24} />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          {mode === 'login' && 'ClinicaFlow'}
          {mode === 'register' && 'Criar nova conta'}
          {mode === 'forgot' && 'Recuperar senha'}
          {mode === 'reset' && 'Definir nova senha'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {mode === 'login' && 'Gestão inteligente de pacientes e busca ativa'}
          {mode === 'register' && 'Comece a gerenciar seus pacientes hoje mesmo'}
          {mode === 'forgot' && 'Informe seu e-mail para receber o código'}
          {mode === 'reset' && 'Digite o código recebido e sua nova senha'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-gray-100">
          
          {successMsg ? (
            <div className="text-center py-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">E-mail enviado!</h3>
              <p className="mt-2 text-sm text-gray-500">{successMsg}</p>
              <div className="mt-6">
                <button
                  onClick={() => switchMode('login')}
                  className="w-full inline-flex justify-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 focus:outline-none"
                >
                  Voltar para Login
                </button>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              
              {/* Campos exclusivos de Cadastro */}
              {mode === 'register' && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nome Completo</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="name"
                        type="text"
                        required={mode === 'register'}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-white text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3"
                        placeholder="Seu nome"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="clinicName" className="block text-sm font-medium text-gray-700">Nome da Clínica</label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building2 className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="clinicName"
                        type="text"
                        required={mode === 'register'}
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        className="bg-white text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3"
                        placeholder="Ex: Allo Oral Clinic"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Campos Comuns (Email) */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-mail Profissional
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3"
                    placeholder="voce@clinica.com"
                  />
                </div>
              </div>

              {/* Campos exclusivos do modo Reset */}
              {mode === 'reset' && (
                <>
                  <div>
                    <label htmlFor="resetToken" className="block text-sm font-medium text-gray-700">
                      Código de Recuperação
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Key className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="resetToken"
                        type="text"
                        required={mode === 'reset'}
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        className="bg-white text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3"
                        placeholder="123456"
                        maxLength={6}
                        pattern="[0-9]{6}"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Digite o código de 6 dígitos recebido</p>
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                      Nova Senha
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="newPassword"
                        type="password"
                        autoComplete="new-password"
                        required={mode === 'reset'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-white text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3"
                        placeholder="••••••••"
                        minLength={6}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Campos Comuns (Senha) - Exceto Forgot e Reset */}
              {mode !== 'forgot' && mode !== 'reset' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Senha
                    </label>
                    {mode === 'login' && (
                      <button 
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        Esqueceu?
                      </button>
                    )}
                  </div>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white text-gray-900 placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-lg py-3"
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70"
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    <>
                      {mode === 'login' && (
                        <>
                          Entrar no Sistema
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                      {mode === 'register' && 'Criar Conta'}
                      {mode === 'forgot' && 'Enviar Código de Recuperação'}
                      {mode === 'reset' && 'Redefinir Senha'}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Acesso Seguro</span>
              </div>
            </div>

            <div className="mt-6 text-center space-y-2">
              {mode === 'login' && (
                <p className="text-sm text-gray-600">
                  Ainda não tem uma conta?{' '}
                  <button onClick={() => switchMode('register')} className="font-medium text-indigo-600 hover:text-indigo-500">
                    Cadastre-se
                  </button>
                </p>
              )}

              {(mode === 'register' || mode === 'forgot' || mode === 'reset') && !successMsg && (
                <button
                  onClick={() => switchMode('login')}
                  className="flex items-center justify-center w-full text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  Voltar para Login
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
