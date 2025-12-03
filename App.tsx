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
import { useToast } from './hooks/useToast';
import { useConfirm } from './hooks/useConfirm';
import { useDebounce } from './hooks/useDebounce';
import { NotificationsProvider, useNotifications } from './hooks/useNotifications';
import { ConfirmModal } from './components/ConfirmModal';
import { SkeletonTable, SkeletonCard } from './components/LoadingSpinner';
import { BarChart, LineChart, StatsCard, DonutChart } from './components/Charts';
import { DarkModeToggleCompact } from './components/DarkModeToggle';
import { DateRangeFilter, useDateRange } from './components/DateRangeFilter';
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
  getAllOpportunities,
  mergeNewOpportunities,
  updateOpportunityStatus,
  getAllPatients,
  updateOpportunityNotes,
  getStoredUser,
  logoutUser,
  deleteAllOpportunities
} from './services/apiService';

// --- Page Components ---

const DashboardPage = ({
  opportunities,
  user,
  totalDatabaseCount,
  loading
}: {
  opportunities: Opportunity[],
  user: User,
  totalDatabaseCount: number,
  loading?: boolean
}) => {
  const { dateRange, setDateRange, isInRange } = useDateRange('month');

  // Filter opportunities by date range
  const filteredOpportunities = opportunities.filter(o => isInRange(o.createdAt));

  const totalPipeline = filteredOpportunities.length;
  const scheduled = filteredOpportunities.filter(o => o.status === OpportunityStatus.SCHEDULED).length;
  const pending = filteredOpportunities.filter(o => o.status === OpportunityStatus.NEW || o.status === OpportunityStatus.SENT).length;

  // Cálculo da taxa de ativação (Quantos % da base estão sendo trabalhados)
  const activationRate = totalDatabaseCount > 0
    ? Math.round((totalPipeline / totalDatabaseCount) * 100)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Visão Geral</h2>
          <p className="text-gray-500 dark:text-gray-400">Resumo da base de pacientes e performance de reativação de <span className="font-semibold text-indigo-600 dark:text-indigo-400">{user.name}</span>.</p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
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
      )}

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <DonutChart
          title="Distribuição por Status"
          data={[
            { label: 'Novos', value: filteredOpportunities.filter(o => o.status === OpportunityStatus.NEW).length, color: '#3b82f6' },
            { label: 'Contatados', value: filteredOpportunities.filter(o => o.status === OpportunityStatus.SENT).length, color: '#8b5cf6' },
            { label: 'Responderam', value: filteredOpportunities.filter(o => o.status === OpportunityStatus.RESPONDED).length, color: '#f59e0b' },
            { label: 'Agendados', value: filteredOpportunities.filter(o => o.status === OpportunityStatus.SCHEDULED).length, color: '#10b981' },
            { label: 'Arquivados', value: filteredOpportunities.filter(o => o.status === OpportunityStatus.ARCHIVED).length, color: '#6b7280' },
          ].filter(d => d.value > 0)}
          centerText={totalPipeline.toString()}
          centerSubtext="Total"
        />

        {/* Treatment Types */}
        <BarChart
          title="Tratamentos Mais Buscados"
          data={(() => {
            const treatments: Record<string, number> = {};
            filteredOpportunities.forEach(opp => {
              const keyword = opp.keywordFound.toLowerCase();
              treatments[keyword] = (treatments[keyword] || 0) + 1;
            });
            return Object.entries(treatments)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([label, value]) => ({
                label: label.charAt(0).toUpperCase() + label.slice(1),
                value,
                color: 'bg-indigo-500'
              }));
          })()}
          height={180}
        />
      </div>

      {/* Stats Cards with Mini Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Taxa de Conversão"
          value={scheduled > 0 ? Math.round((scheduled / totalPipeline) * 100) : 0}
          subtitle={`${scheduled} de ${totalPipeline} agendados`}
          trend="up"
          trendValue="+5.2%"
          data={[12, 19, 15, 22, 18, 25, scheduled]}
          color="green"
        />
        <StatsCard
          title="Taxa de Resposta"
          value={
            filteredOpportunities.filter(o => o.status === OpportunityStatus.RESPONDED || o.status === OpportunityStatus.SCHEDULED).length > 0
              ? Math.round((filteredOpportunities.filter(o => o.status === OpportunityStatus.RESPONDED || o.status === OpportunityStatus.SCHEDULED).length / totalPipeline) * 100)
              : 0
          }
          subtitle="Pacientes que responderam"
          trend="up"
          trendValue="+8.1%"
          data={[15, 18, 22, 19, 25, 28, 30]}
          color="indigo"
        />
        <StatsCard
          title="Tempo Médio"
          value={3}
          subtitle="Dias até agendamento"
          trend="down"
          trendValue="-1.2d"
          data={[5, 4.5, 4, 3.8, 3.5, 3.2, 3]}
          color="green"
        />
        <StatsCard
          title={`Novos no Período`}
          value={filteredOpportunities.length}
          subtitle={`${dateRange.preset === 'today' ? 'Hoje' : dateRange.preset === 'week' ? 'Últimos 7 dias' : dateRange.preset === 'month' ? 'Últimos 30 dias' : 'Período selecionado'}`}
          trend="up"
          trendValue="+12"
          data={[8, 12, 10, 15, 13, 18, 20]}
          color="indigo"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Atividade Recente no Período</h3>
        <div className="space-y-4">
          {filteredOpportunities.slice(0, 5).map((opp, i) => (
            <div key={i} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-600">
              <div className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Paciente <span className="font-bold">{opp.name}</span></p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Status atual: {opp.status} • Motivo: {opp.keywordFound}</p>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(opp.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
          {filteredOpportunities.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">Nenhuma atividade registrada no período selecionado.</p>
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
  onViewDetails,
  onClearAll,
  toast
}: {
  opportunities: Opportunity[],
  setOpportunities: (o: Opportunity[]) => void,
  onUpdateStatus: (id: string, s: OpportunityStatus) => void,
  onViewDetails: (o: Opportunity) => void,
  onClearAll: () => void,
  toast: any
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
      toast.success(`${newOpps.length} paciente(s) encontrado(s)!`);
    } catch (error) {
      toast.error("Erro ao buscar. Verifique a conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Busca Ativa (Reativação)</h2>
        <p className="text-gray-500 dark:text-gray-400">Localize pacientes no banco de dados (Neon) para iniciar o processo de reativação.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
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
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder-gray-400 dark:placeholder-gray-500"
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
              className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-center"
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
          <h3 className="font-semibold text-gray-800 dark:text-white">Pacientes Selecionados para Reativação</h3>
          <div className="flex gap-2">
            {opportunities.length > 0 && (
              <>
                <button
                  onClick={onClearAll}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Limpar Base
                </button>
                <ExportMenu
                  data={opportunities}
                  filename="pacientes_allo_oral"
                  pdfTitle="Relatório de Pacientes - Allo Oral Clinic"
                />
              </>
            )}
          </div>
        </div>
        <PatientsTable items={opportunities} onUpdateStatus={onUpdateStatus} onViewDetails={onViewDetails} />
      </div>
    </div>
  );
};

const PipelinePage = ({
  opportunities,
  onUpdateStatus,
  onViewDetails,
  onClearAll
}: {
  opportunities: Opportunity[],
  onUpdateStatus: (id: string, s: OpportunityStatus) => void,
  onViewDetails: (o: Opportunity) => void,
  onClearAll: () => void
}) => {
  return (
    <div className="space-y-6 h-full flex flex-col animate-fade-in">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Pipeline de Reativação</h2>
          <p className="text-gray-500 dark:text-gray-400">Gerencie visualmente o fluxo de contato com os pacientes.</p>
        </div>
        <div className="flex gap-2">
          {opportunities.length > 0 && (
            <>
              <button
                onClick={onClearAll}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                Limpar Pipeline
              </button>
              <ExportMenu
                data={opportunities}
                filename="pipeline_allo_oral"
                pdfTitle="Pipeline de Reativação - Allo Oral Clinic"
              />
            </>
          )}
        </div>
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
  onAddToPipeline,
  onRefresh
}: {
  patients: Patient[],
  loading: boolean,
  opportunities: Opportunity[],
  onAddToPipeline: (patient: Patient) => void,
  onRefresh: () => void
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('all');

  // Debounce search term to optimize performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Extrair todas as tags únicas para o filtro
  const allTags = Array.from(new Set(patients.flatMap(p => p.history || []))) as string[];

  // Filtragem otimizada com debounce
  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      p.phone.includes(debouncedSearchTerm);
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
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Base de Pacientes (Geral)</h2>
          <p className="text-gray-500 dark:text-gray-400">Visualização completa dos registros odontológicos e status de reativação.</p>
        </div>
        <div className="flex gap-3 items-center self-end">
          <div className="hidden sm:flex text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded border border-green-200 dark:border-green-700 items-center h-9">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Supabase Conectado
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Atualizar base de pacientes do banco de dados"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
          <ExportMenu
            data={filteredPatients}
            filename="base_pacientes_allo_oral"
            pdfTitle="Base Completa de Pacientes - Allo Oral Clinic"
            disabled={loading || filteredPatients.length === 0}
          />
        </div>
      </div>

      {/* Filtros Avançados */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="relative w-full sm:w-64">
            <Filter className="absolute left-3 top-2.5 text-gray-400 h-5 w-5" />
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Todos os Tratamentos</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag.charAt(0).toUpperCase() + tag.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        {/* Contador de Resultados */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Exibindo <span className="font-semibold text-indigo-600">{filteredPatients.length}</span> de{' '}
          <span className="font-semibold">{patients.length}</span> pacientes
          {(searchTerm || filterTag !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterTag('all');
              }}
              className="ml-3 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={8} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Histórico / Tratamentos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Última Visita</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status Pipeline</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPatients.length > 0 ? filteredPatients.map((p) => {
                  const pipelineStatus = getPipelineStatus(p.id);

                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{p.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{p.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex flex-wrap gap-1">
                          {p.history?.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded text-xs border border-gray-200">{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{p.lastVisit ? new Date(p.lastVisit).toLocaleDateString() : '-'}</td>
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
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Nenhum paciente encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App Shell ---

type Page = 'dashboard' | 'search' | 'pipeline' | 'database';

const AppContent = ({ user, setUser }: { user: User | null; setUser: (user: User | null) => void }) => {
  const toast = useToast();
  const { confirm, confirmState, closeConfirm } = useConfirm();
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
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Real-time notifications via Socket.io
  const { notifications, unreadCount, markAsRead } = useNotifications();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load opportunities from backend
      const opps = await getAllOpportunities();
      setOpportunities(opps);

      // Load patients from backend
      const patients = await getAllPatients();
      setDatabasePatients(patients);
      setDatabaseLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback to local storage
      setOpportunities(getStoredOpportunities());
      setDatabaseLoading(false);
    }
  };

  const handleRefreshPatients = async () => {
    setDatabaseLoading(true);
    try {
      const patients = await getAllPatients();
      setDatabasePatients(patients);
      toast.success('Base de pacientes atualizada!');
    } catch (error) {
      console.error('Error refreshing patients:', error);
      toast.error('Erro ao atualizar base de pacientes');
    } finally {
      setDatabaseLoading(false);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    loadData();
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  const handleClearAll = async () => {
    const confirmed = await confirm({
      title: 'Limpar Base Prospectada',
      message: 'Tem certeza que deseja limpar toda a base de pacientes prospectados? Esta ação não pode ser desfeita.',
      confirmText: 'Sim, Limpar Tudo',
      cancelText: 'Cancelar',
      type: 'danger',
    });

    if (confirmed) {
      try {
        await deleteAllOpportunities();
        setOpportunities([]);
        toast.success('Base de pacientes prospectados limpa com sucesso!');
      } catch (error) {
        console.error('Error clearing opportunities:', error);
        toast.error('Erro ao limpar base. Tente novamente.');
      }
    }
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
      toast.success('Nota salva com sucesso!');
    } catch {
      setOpportunities(original);
      toast.error("Erro ao salvar nota");
    }
  };

  // Funcionalidade para adicionar paciente da base diretamente ao Pipeline (Teste e Manual)
  const handleAddFromDatabase = (patient: Patient) => {
    // Verifica se já existe
    const exists = opportunities.some(o => o.patientId === patient.id);
    if (exists) {
      toast.warning("Este paciente já está em processo de reativação no Pipeline.");
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
    toast.success(`Paciente ${patient.name} adicionado ao Pipeline!`);
  };

  const NavItem = ({ id, icon: Icon, label }: { id: Page, icon: any, label: string }) => (
    <button
      onClick={() => { setPage(id); setSidebarOpen(false); }}
      className={`w-full flex items-center px-4 py-3 rounded-lg font-medium transition-colors mb-1 ${page === id
        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
    >
      <Icon size={20} className={`mr-3 ${page === id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`} />
      {label}
    </button>
  );

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 flex font-sans text-gray-900 dark:text-gray-100">
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 z-20 bg-gray-900/50 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-700">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mr-3 shadow-sm">
            <Activity className="text-white" size={18} />
          </div>
          <span className="text-lg font-bold text-gray-800 dark:text-white tracking-tight">ClinicaFlow</span>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600 mb-4 cursor-pointer hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden border-2 border-white shadow-sm">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-700">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.clinicName}</p>
            </div>
            <Settings size={14} className="text-gray-400 group-hover:text-indigo-500" />
          </div>
        </div>

        <nav className="px-4 flex-1 overflow-y-auto">
          <div className="mb-2 px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Menu Principal</div>
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="search" icon={Search} label="Busca Ativa" />
          <NavItem id="pipeline" icon={Columns} label="Pipeline" />
          <NavItem id="database" icon={Database} label="Base de Pacientes" />
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-1">
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center w-full px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <UserIcon size={18} className="mr-3" />
            Meu Perfil
          </button>


          {/* Botão de Integrações - Apenas para Admin */}
          {user.email === 'fmbp1981@gmail.com' && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center w-full px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Settings size={18} className="mr-3" />
              Integrações
            </button>
          )}


          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut size={18} className="mr-3" />
            Sair da Conta
          </button>

          {/* Rodapé IntelliX.AI */}
          <div className="mt-6 pb-2">
            <div className="flex flex-col items-center justify-center pt-4 border-t border-gray-100 dark:border-gray-700 opacity-90 hover:opacity-100 transition-opacity cursor-default">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 text-center">Desenvolvido por</span>
              <div className="flex items-center justify-center gap-1.5">
                <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="text-sm font-bold tracking-tight">
                  <span className="text-amber-500 dark:text-amber-400">IntelliX</span>
                  <span className="text-blue-600 dark:text-blue-400">.AI</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </aside >

      {/* Main Content */}
      < div className="flex-1 flex flex-col lg:pl-64 transition-all duration-300 overflow-hidden h-screen" >
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 px-4 sm:px-8 flex items-center justify-between shadow-sm shrink-0 transition-colors">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 dark:text-gray-400">
            <Menu size={24} />
          </button>
          <div className="flex-1"></div>
          <div className="flex items-center space-x-2 relative">
            {/* Dark Mode Toggle */}
            <DarkModeToggleCompact />

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors relative rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900"></span>
                )}
              </button>

              <NotificationsPopover
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
                notifications={notifications}
                onMarkAsRead={markAsRead}
              />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 overflow-hidden max-w-7xl mx-auto w-full bg-gray-50 dark:bg-gray-900">
          {page === 'dashboard' && (
            <div className="h-full overflow-y-auto">
              <DashboardPage
                opportunities={opportunities}
                user={user}
                totalDatabaseCount={databasePatients.length}
                loading={databaseLoading}
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
                onClearAll={handleClearAll}
                toast={toast}
              />
            </div>
          )}
          {page === 'pipeline' && (
            <PipelinePage
              opportunities={opportunities}
              onUpdateStatus={handleStatusUpdate}
              onViewDetails={setSelectedOpportunity}
              onClearAll={handleClearAll}
            />
          )}
          {page === 'database' && (
            <div className="h-full overflow-y-auto">
              <DatabasePage
                patients={databasePatients}
                loading={databaseLoading}
                onAddToPipeline={handleAddFromDatabase}
                opportunities={opportunities}
                onRefresh={handleRefreshPatients}
              />
            </div>
          )}
        </main>
      </div >

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

      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
        loading={confirmState.loading}
      />
    </div >
  );
};

// Main App Wrapper with NotificationsProvider
const App = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  return (
    <NotificationsProvider userId={user?.id}>
      <AppContent user={user} setUser={setUser} />
    </NotificationsProvider>
  );
};

export default App;