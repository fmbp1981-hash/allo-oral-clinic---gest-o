import React, { useState, useEffect } from 'react';
import {
  Users,
  Settings,
  Search,
  RefreshCw,
  FolderOpen,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  Eye,
  UserCog,
  UserCheck,
  UserX,
  Loader2
} from 'lucide-react';
import { UserConfigModal } from './UserConfigModal';
import { SkeletonTable } from './LoadingSpinner';

interface UserListItem {
  id: string;
  email: string;
  name: string;
  companyName: string;
  role: 'admin' | 'operador' | 'visualizador';
  status: 'configured' | 'pending';
  approved: boolean;
  createdAt: string;
  integrations: {
    trello: boolean;
    whatsapp: boolean;
  };
}

type TabType = 'pending' | 'all' | 'roles';

const RoleBadge = ({ role }: { role: string }) => {
  const styles: Record<string, string> = {
    admin: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    operador: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    visualizador: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600',
  };

  const labels: Record<string, string> = {
    admin: 'Administrador',
    operador: 'Operador',
    visualizador: 'Visualizador',
  };

  const icons: Record<string, React.ReactNode> = {
    admin: <Shield size={12} className="mr-1" />,
    operador: <UserCog size={12} className="mr-1" />,
    visualizador: <Eye size={12} className="mr-1" />,
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${styles[role] || styles.visualizador}`}>
      {icons[role]}
      {labels[role] || 'Visualizador'}
    </span>
  );
};

const StatusBadge = ({ status }: { status: 'configured' | 'pending' }) => {
  if (status === 'configured') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
        <CheckCircle size={12} className="mr-1" />
        Configurado
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800">
      <Clock size={12} className="mr-1" />
      Pendente
    </span>
  );
};

const IntegrationIndicators = ({ integrations }: { integrations: { trello: boolean; whatsapp: boolean } }) => {
  return (
    <div className="flex gap-1">
      <span
        className={`px-2 py-0.5 rounded text-xs border ${integrations.trello
          ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
          : 'bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-700 dark:text-gray-500 dark:border-gray-600'
          }`}
        title={integrations.trello ? 'Trello configurado' : 'Trello não configurado'}
      >
        Trello
      </span>
      <span
        className={`px-2 py-0.5 rounded text-xs border ${integrations.whatsapp
          ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
          : 'bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-700 dark:text-gray-500 dark:border-gray-600'
          }`}
        title={integrations.whatsapp ? 'WhatsApp configurado' : 'WhatsApp não configurado'}
      >
        WhatsApp
      </span>
    </div>
  );
};

export const UserManagement = () => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao buscar usuários');
      }

      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.companyName.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === 'pending') {
      return matchesSearch && !user.approved;
    }

    if (activeTab === 'roles') {
      return matchesSearch && user.role === 'admin';
    }

    return matchesSearch;
  });

  const handleOpenConfig = (user: UserListItem) => {
    setSelectedUser(user);
    setConfigModalOpen(true);
  };

  const handleCloseConfig = () => {
    setConfigModalOpen(false);
    setSelectedUser(null);
  };

  const handleConfigSaved = () => {
    fetchUsers();
    handleCloseConfig();
  };

  const handleApprove = async (userId: string, approve: boolean) => {
    setApprovingUserId(userId);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved: approve }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao atualizar aprovação');
      }

      // Update local state
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, approved: approve } : u
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar aprovação');
    } finally {
      setApprovingUserId(null);
    }
  };

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'pending', label: 'Aguardando Aprovação', count: users.filter((u) => !u.approved).length },
    { id: 'all', label: 'Todos os Usuários', count: users.length },
    { id: 'roles', label: 'Administradores', count: users.filter((u) => u.role === 'admin').length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Users size={28} className="text-indigo-600" />
            Gerenciamento de Usuários
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gerencie permissões e configure integrações WhatsApp para cada usuário.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-1 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === tab.id
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                {tab.label}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id
                    ? 'bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-200'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                    }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={5} />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto text-red-500 mb-2" size={32} />
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Integrações
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cadastrado em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {user.companyName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <IntegrationIndicators integrations={user.integrations} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          {/* Approve/Reject buttons - show only for non-approved users */}
                          {!user.approved && user.role !== 'admin' && (
                            <>
                              <button
                                onClick={() => handleApprove(user.id, true)}
                                disabled={approvingUserId === user.id}
                                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                                title="Aprovar usuário"
                              >
                                {approvingUserId === user.id ? (
                                  <Loader2 size={18} className="animate-spin" />
                                ) : (
                                  <UserCheck size={18} />
                                )}
                              </button>
                            </>
                          )}
                          {/* Revoke approval - show for approved non-admin users */}
                          {user.approved && user.role !== 'admin' && (
                            <button
                              onClick={() => handleApprove(user.id, false)}
                              disabled={approvingUserId === user.id}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                              title="Revogar aprovação"
                            >
                              {approvingUserId === user.id ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <UserX size={18} />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenConfig(user)}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title="Configurações"
                          >
                            <Settings size={18} />
                          </button>
                          <button
                            onClick={() => handleOpenConfig(user)}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title="Detalhes"
                          >
                            <FolderOpen size={18} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Nenhum usuário encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">Importante</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Apenas administradores podem gerenciar roles e configurações de outros usuários.
              Alterações nas credenciais de integração afetam imediatamente o funcionamento do sistema para o usuário correspondente.
            </p>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      {selectedUser && (
        <UserConfigModal
          isOpen={configModalOpen}
          onClose={handleCloseConfig}
          user={selectedUser}
          onSaved={handleConfigSaved}
        />
      )}
    </div>
  );
};

export default UserManagement;
