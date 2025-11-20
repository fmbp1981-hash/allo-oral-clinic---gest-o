import React, { useState, useEffect } from 'react';
import { 
  Search, 
  LayoutDashboard, 
  Users, 
  Settings, 
  Bell, 
  Menu, 
  X, 
  LogOut,
  Database,
  Activity,
  RefreshCw,
  Download,
  Columns,
  Brain,
  Filter,
  User as UserIcon,
  PlusCircle,
  ArrowRight,
  Eye
} from 'lucide-react';
import { PatientsTable } from './components/LeadsTable';
import { StatCard } from './components/StatCard';
import { StatusBadge } from './components/StatusBadge';
import { SettingsModal } from './components/SettingsModal';
import { ExportMenu } from './components/ExportMenu';
import { KanbanBoard } from './components/KanbanBoard';
import { PatientDetailsModal } from './components/PatientDetailsModal';
import { LoginPage } from './components/LoginPage';
import { NotificationsPopover } from './components/NotificationsPopover';
import { ProfileModal } from './components/ProfileModal';
import { ScheduleModal } from './components/ScheduleModal';
import { Opportunity, OpportunityStatus, Patient, User, Notification } from './types';
import { 
  searchPatientsByKeyword, 
  getStoredOpportunities, 
  mergeNewOpportunities, 
  updateOpportunityStatus, 
  getAllPatientsMock, 
  updateOpportunityNotes,
  getStoredUser,
  logoutUser,
  getMockNotifications 
} from './services/mockN8nService';

// --- Page Components ---

const DashboardPage = ({ 
  opportunities, 
  user,
  totalDatabaseCount 
}: { 
  opportunities: Opportunity[], 
  user: User,
  totalDatabaseCount: number
}) => {
  const totalPipeline = opportunities.length;
  const scheduled = opportunities.filter(o => o.status === OpportunityStatus.SCHEDULED).length;
  const pending = opportunities.filter(o => o.status === OpportunityStatus.NEW || o.status === OpportunityStatus.SENT).length;
  
  // Cálculo da taxa de ativação (Quantos % da base estão sendo trabalhados)
  const activationRate = totalDatabaseCount > 0 
    ? Math.round((totalPipeline / totalDatabaseCount) * 100) 
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Visão Geral</h2>
        <p className="text-gray-500">Resumo da base de pacientes e performance de reativação de <span className="font-semibold text-indigo-600">{user.name}</span>.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <StatCard 
          label="Total na Base (DB)" 
          value={totalDatabaseCount} 
          icon={Database} 
          colorClass="bg-white"
        />
        <StatCard 
          label="Em Reativação" 
          value={totalPipeline} 
          icon={Activity} 
          trend="up" 
          trendValue={`${activationRate}% da base`}
          colorClass="bg-indigo-50 border-indigo-100"
        />
        <StatCard 
          label="Agendamentos (Mês)" 
          value={scheduled} 
          icon={Users} 
          trend="up" 
          trendValue="+12%"
          colorClass="bg-green-50 border-green-100"
        />
        <StatCard 
          label="Pendentes de Resposta" 
          value={pending} 
          icon={Bell} 
          colorClass="bg-orange-50 border-orange-100"
        />
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">Atividade Recente no Pipeline</h3>
        <div className="space-y-4">
          {opportunities.slice(0, 3).map((opp, i) => (
            <div key={i} className="flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Paciente <span className="font-bold">{opp.name}</span></p>
                <p className="text-xs text-gray-500">Status atual: {opp.status} • Motivo: {opp.keywordFound}</p>
              </div>
              <span className="text-xs text-gray-400">{new Date(opp.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
          {opportunities.length === 0 && (
            <p className="text-sm text-gray-400 italic">Nenhuma atividade registrada recentemente.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const SearchPage = ({ 
  opportunities, 
  setOpportunities, 
  onUpdateStatus,
  onViewDetails
}: { 
  opportunities: Opportunity[], 
  setOpportunities: (o: Opportunity[]) => void,
  onUpdateStatus: (id: string, s: OpportunityStatus) => void,
  onViewDetails: (o: Opportunity) => void
}) => {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const newOpps = await searchPatientsByKeyword(query, limit);
      const merged = mergeNewOpportunities(opportunities, newOpps);
      setOpportunities(merged);
      setQuery('');
    } catch (error) {
      alert("Erro ao buscar. Verifique a conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Busca Ativa (Reativação)</h2>
        <p className="text-gray-500">Localize pacientes no banco de dados (Neon) para iniciar o processo de reativação.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
          
          <div className="flex-1 w-full relative">
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Palavra-chave</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder-gray-400"
                placeholder="Ex: implante, ortodontia..."
              />
            </div>
          </div>

          <div className="w-full sm:w-32">
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Quantidade</label>
            <input 
              type="number" 
              min="1" 
              max="100"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="block w-full px-3 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-center"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className={`w-full sm:w-auto px-6 py-3 mt-auto rounded-lg font-medium text-white transition-all shadow-sm h-[50px] ${loading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md'}`}
          >
            {loading ? 'Buscando...' : 'Prospectar'}
          </button>
        </form>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-800">Pacientes Selecionados para Reativação</h3>
          {opportunities.length > 0 && (
            <ExportMenu 
              data={opportunities} 
              filename="pacientes_allo_oral" 
              pdfTitle="Relatório de Pacientes - Allo Oral Clinic"
            />
          )}
        </div>
        <PatientsTable items={opportunities} onUpdateStatus={onUpdateStatus} onViewDetails={onViewDetails} />
      </div>
    </div>
  );
};

const PipelinePage = ({ 
  opportunities, 
  onUpdateStatus, 
  onViewDetails
}: { 
  opportunities: Opportunity[], 
  onUpdateStatus: (id: string, s: OpportunityStatus) => void,
  onViewDetails: (o: Opportunity) => void
}) => {
  return (
    <div className="space-y-6 h-full flex flex-col animate-fade-in">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Pipeline de Reativação</h2>
          <p className="text-gray-500">Gerencie visualmente o fluxo de contato com os pacientes.</p>
        </div>
        <ExportMenu 
          data={opportunities} 
          filename="pipeline_allo_oral" 
          pdfTitle="Pipeline de Reativação - Allo Oral Clinic"
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <KanbanBoard opportunities={opportunities} onUpdateStatus={onUpdateStatus} onViewDetails={onViewDetails} />
      </div>
    </div>
  );
};

const DatabasePage = ({ 
  patients, 
  loading,
  opportunities,
  onAddToPipeline 
}: { 
  patients: Patient[], 
  loading: boolean, 
  opportunities: Opportunity[],
  onAddToPipeline: (patient: Patient) => void 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('all');

  // Extrair todas as tags únicas para o filtro
  const allTags = Array.from(new Set(patients.flatMap(p => p.history || []))) as string[];

  // Filtragem
  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.phone.includes(searchTerm);
    const matchesTag = filterTag === 'all' || p.history?.includes(filterTag);
    return matchesSearch && matchesTag;
  });

  // Função auxiliar para checar status no pipeline
  const getPipelineStatus = (patientId: string): OpportunityStatus | null => {
    const opp = opportunities.find(o => o.patientId === patientId);
    return opp ? opp.status : null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Base de Pacientes (Geral)</h2>
          <p className="text-gray-500">Visualização completa dos registros odontológicos e status de reativação.</p>
        </div>
        <div className="flex gap-3 items-center self-end">
           <div className="hidden sm:flex text-xs bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200 items-center h-9">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Neon DB Conectado
          </div>
          <ExportMenu 
            data={filteredPatients} 
            filename="base_pacientes_allo_oral"
            pdfTitle="Base Completa de Pacientes - Allo Oral Clinic"
            disabled={loading || filteredPatients.length === 0} 
          />
        </div>
      </div>

      {/* Filtros Avançados */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
          />
        </div>
        <div className="relative w-full sm:w-64">
            <Filter className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white text-gray-900"
            >
              <option value="all">Todos os Tratamentos</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag.charAt(0).toUpperCase() + tag.slice(1)}</option>
              ))}
            </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center">
             <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
             Carregando base de dados...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Histórico / Tratamentos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Visita</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status Pipeline</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPatients.length > 0 ? filteredPatients.map((p) => {
                  const pipelineStatus = getPipelineStatus(p.id);
                  
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex flex-wrap gap-1">
                          {p.history?.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded text-xs border border-gray-200">{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.lastVisit ? new Date(p.lastVisit).toLocaleDateString() : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {pipelineStatus ? (
                          <StatusBadge status={pipelineStatus} />
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                            Disponível
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {pipelineStatus ? (
                           <button 
                            disabled
                            className="inline-flex items-center px-3 py-1 bg-gray-50 text-gray-400 rounded-md cursor-default text-xs font-medium border border-gray-200"
                          >
                            <Eye size={14} className="mr-1.5" />
                            Em Progresso
                          </button>
                        ) : (
                          <button 
                            onClick={() => onAddToPipeline(p)}
                            className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors text-xs font-medium border border-indigo-100"
                            title="Adicionar ao Kanban para reativação"
                          >
                            <PlusCircle size={14} className="mr-1.5" />
                            Iniciar Reativação
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Nenhum paciente encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App Shell ---

type Page = 'dashboard' | 'search' | 'pipeline' | 'database';

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Modais State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [pendingScheduleId, setPendingScheduleId] = useState<string | null>(null);
  
  // Data State
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [databasePatients, setDatabasePatients] = useState<Patient[]>([]);
  const [databaseLoading, setDatabaseLoading] = useState(true);
  
  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setOpportunities(getStoredOpportunities());
    getMockNotifications().then(setNotifications);
    
    // Fetch Database Patients on Load (Shared)
    getAllPatientsMock().then((data) => {
      setDatabasePatients(data);
      setDatabaseLoading(false);
    });

  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  const handleStatusUpdate = async (id: string, status: OpportunityStatus) => {
    // Intercepta se for para agendar
    if (status === OpportunityStatus.SCHEDULED) {
      setPendingScheduleId(id);
      setScheduleOpen(true);
      return;
    }

    await executeStatusUpdate(id, status);
  };

  const executeStatusUpdate = async (id: string, status: OpportunityStatus, scheduledDate?: string) => {
     const original = [...opportunities];
    setOpportunities(prev => prev.map(o => {
        if (o.id === id) {
            return { 
                ...o, 
                status, 
                lastContact: new Date().toISOString(),
                ...(scheduledDate ? { scheduledDate } : {})
            };
        }
        return o;
    }));
    try {
      await updateOpportunityStatus(id, status, scheduledDate);
    } catch {
      setOpportunities(original);
    }
  };

  const handleScheduleConfirm = (date: string, time: string) => {
    if (pendingScheduleId) {
      const dateTime = `${date}T${time}:00`;
      executeStatusUpdate(pendingScheduleId, OpportunityStatus.SCHEDULED, dateTime);
      setScheduleOpen(false);
      setPendingScheduleId(null);
    }
  };

  const handleSaveNotes = async (id: string, notes: string) => {
    const original = [...opportunities];
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, notes } : o));
    try {
      await updateOpportunityNotes(id, notes);
    } catch {
      setOpportunities(original);
      alert("Erro ao salvar nota");
    }
  };
  
  // Funcionalidade para adicionar paciente da base diretamente ao Pipeline (Teste e Manual)
  const handleAddFromDatabase = (patient: Patient) => {
    // Verifica se já existe
    const exists = opportunities.some(o => o.patientId === patient.id);
    if (exists) {
      alert("Este paciente já está em processo de reativação no Pipeline.");
      return;
    }

    const newOpp: Opportunity = {
      id: `opp_${Date.now()}_${patient.id}`,
      patientId: patient.id,
      name: patient.name,
      phone: patient.phone,
      keywordFound: 'Manual (Base de Dados)',
      status: OpportunityStatus.NEW,
      createdAt: new Date().toISOString(),
      clinicalRecords: patient.clinicalRecords
    };

    const merged = mergeNewOpportunities(opportunities, [newOpp]);
    setOpportunities(merged);
    
    // Feedback visual simples
    // Idealmente, um toast, mas alert resolve por hora
    // alert(`Paciente ${patient.name} adicionado ao Pipeline!`);
  };

  const toggleNotification = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const NavItem = ({ id, icon: Icon, label }: { id: Page, icon: any, label: string }) => (
    <button 
      onClick={() => { setPage(id); setSidebarOpen(false); }}
      className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-colors mb-1 ${
        page === id 
          ? 'bg-indigo-50 text-indigo-700' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon size={20} className={`mr-3 ${page === id ? 'text-indigo-600' : 'text-gray-400'}`} />
      {label}
    </button>
  );

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50/50 flex font-sans text-gray-900">
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 z-20 bg-gray-900/50 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mr-3 shadow-sm">
            <Activity className="text-white" size={18} />
          </div>
          <span className="text-lg font-bold text-gray-800 tracking-tight">ClinicaFlow</span>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div 
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 mb-4 cursor-pointer hover:bg-indigo-50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden border-2 border-white shadow-sm">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate group-hover:text-indigo-700">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.clinicName}</p>
            </div>
            <Settings size={14} className="text-gray-400 group-hover:text-indigo-500" />
          </div>
        </div>

        <nav className="px-4 flex-1 overflow-y-auto">
          <div className="mb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Menu Principal</div>
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="search" icon={Search} label="Busca Ativa" />
          <NavItem id="pipeline" icon={Columns} label="Pipeline" />
          <NavItem id="database" icon={Database} label="Base de Pacientes" />
        </nav>

        <div className="p-4 border-t border-gray-100 space-y-1">
           <button 
            onClick={() => setProfileOpen(true)}
            className="flex items-center w-full px-4 py-3 text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <UserIcon size={18} className="mr-3" />
            Meu Perfil
          </button>

          <button 
            onClick={() => setSettingsOpen(true)}
            className="flex items-center w-full px-4 py-3 text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Settings size={18} className="mr-3" />
            Integrações
          </button>

          <button 
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} className="mr-3" />
            Sair da Conta
          </button>
          
           {/* Rodapé IntelliX.AI */}
           <div className="mt-6 px-4 pb-2">
            <div className="flex flex-col items-center justify-center pt-4 border-t border-gray-100 opacity-90 hover:opacity-100 transition-opacity cursor-default">
               <span className="text-[10px] text-gray-400 mb-1">Desenvolvido por</span>
               <div className="flex items-center justify-center gap-1.5">
                 <Brain className="h-5 w-5 text-blue-600" />
                 <div className="text-sm font-bold tracking-tight">
                   <span className="text-amber-500">IntelliX</span>
                   <span className="text-blue-600">.AI</span>
                 </div>
               </div>
            </div>
          </div>

        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:pl-64 transition-all duration-300 overflow-hidden h-screen">
        <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-10 px-4 sm:px-8 flex items-center justify-between shadow-sm shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500">
            <Menu size={24} />
          </button>
          <div className="flex-1"></div> 
          <div className="flex items-center space-x-4 relative">
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors relative rounded-full hover:bg-gray-100"
              >
                <Bell size={20} />
                {unreadNotifications > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>
              
              <NotificationsPopover 
                isOpen={isNotifOpen} 
                onClose={() => setIsNotifOpen(false)} 
                notifications={notifications}
                onMarkAsRead={toggleNotification}
              />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 overflow-hidden max-w-7xl mx-auto w-full">
          {page === 'dashboard' && (
            <div className="h-full overflow-y-auto">
              <DashboardPage 
                opportunities={opportunities} 
                user={user} 
                totalDatabaseCount={databasePatients.length} 
              />
            </div>
          )}
          {page === 'search' && (
            <div className="h-full overflow-y-auto">
              <SearchPage 
                opportunities={opportunities} 
                setOpportunities={setOpportunities} 
                onUpdateStatus={handleStatusUpdate}
                onViewDetails={setSelectedOpportunity}
              />
            </div>
          )}
          {page === 'pipeline' && (
             <PipelinePage 
                opportunities={opportunities} 
                onUpdateStatus={handleStatusUpdate}
                onViewDetails={setSelectedOpportunity}
             />
          )}
          {page === 'database' && (
            <div className="h-full overflow-y-auto">
              <DatabasePage 
                patients={databasePatients} 
                loading={databaseLoading} 
                onAddToPipeline={handleAddFromDatabase}
                opportunities={opportunities}
              />
            </div>
          )}
        </main>
      </div>

      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      
      <ProfileModal 
        isOpen={profileOpen} 
        onClose={() => setProfileOpen(false)} 
        user={user}
        onUpdateUser={setUser}
      />

      <ScheduleModal 
        isOpen={scheduleOpen} 
        onClose={() => { setScheduleOpen(false); setPendingScheduleId(null); }} 
        onConfirm={handleScheduleConfirm} 
      />
      
      <PatientDetailsModal 
        isOpen={!!selectedOpportunity} 
        opportunity={selectedOpportunity} 
        onClose={() => setSelectedOpportunity(null)} 
        onSaveNotes={handleSaveNotes}
      />
    </div>
  );
};

export default App;