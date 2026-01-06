# 🧩 Components Documentation - ClinicaFlow

**Versão**: 4.1.0  
**Framework**: React 19 + TypeScript  
**Última Atualização**: 05/01/2026

---

## 📋 Índice

1. [Estrutura de Componentes](#estrutura-de-componentes)
2. [Componentes de Layout](#componentes-de-layout)
3. [Componentes de Dados](#componentes-de-dados)
4. [Componentes de UI](#componentes-de-ui)
5. [Componentes de Formulário](#componentes-de-formulário)
6. [Hooks Customizados](#hooks-customizados)
7. [Services](#services)

---

## Estrutura de Componentes

```
src/
├── App.tsx                      # Componente raiz
├── components/
│   ├── Charts.tsx               # Gráficos do dashboard
│   ├── ConfirmModal.tsx         # Modal de confirmação
│   ├── DarkModeToggle.tsx       # Toggle tema escuro
│   ├── DateRangeFilter.tsx      # Filtro de período
│   ├── ErrorBoundary.tsx        # Captura de erros React
│   ├── ExportMenu.tsx           # Menu de exportação
│   ├── ImportPatientsModal.tsx  # Modal de importação
│   ├── KanbanBoard.tsx          # Pipeline visual
│   ├── LeadsTable.tsx           # Tabela de leads
│   ├── LoadingSpinner.tsx       # Loading states
│   ├── LoginPage.tsx            # Página de autenticação
│   ├── NotificationsPopover.tsx # Popover de notificações
│   ├── PatientDetailsModal.tsx  # Modal detalhes paciente
│   ├── ProfileModal.tsx         # Modal de perfil
│   ├── ScheduleModal.tsx        # Modal de agendamento
│   ├── SettingsModal.tsx        # Modal de configurações
│   ├── StatCard.tsx             # Card de estatísticas
│   ├── StatusBadge.tsx          # Badge de status
│   └── Toast.tsx                # Notificações toast
├── hooks/
│   ├── useConfirm.tsx           # Modal de confirmação
│   ├── useDarkMode.tsx          # Tema escuro
│   ├── useDebounce.tsx          # Debounce para buscas
│   ├── useNotifications.tsx     # WebSocket notifications
│   └── useToast.tsx             # Sistema de toasts
├── services/
│   ├── apiService.ts            # Chamadas REST API
│   ├── exportService.ts         # Exportação de dados
│   ├── mockN8nService.ts        # Mock para desenvolvimento
│   └── whatsappService.ts       # Integração WhatsApp
└── types.ts                     # Interfaces TypeScript
```

---

## Componentes de Layout

### App.tsx

Componente raiz que gerencia estado global e roteamento interno.

**Arquivo**: `App.tsx`

**Estado Principal**:
```typescript
interface AppState {
    user: User | null;
    patients: Patient[];
    opportunities: Opportunity[];
    activeTab: 'dashboard' | 'pipeline' | 'patients' | 'reports';
    isLoading: boolean;
    // ... mais estados
}
```

**Responsabilidades**:
- Gerenciamento de autenticação
- Roteamento entre abas
- Estado global de pacientes e oportunidades
- Conexão WebSocket para notificações

**Exemplo de Uso**:
```tsx
// index.tsx
import App from './App';

ReactDOM.render(<App />, document.getElementById('root'));
```

---

### LoginPage

Página de autenticação com login, registro e reset de senha.

**Arquivo**: `components/LoginPage.tsx`

**Props**:
```typescript
interface LoginPageProps {
    onLogin: (user: User, token: string, refreshToken: string) => void;
}
```

**Estados Internos**:
```typescript
type AuthMode = 'login' | 'register' | 'reset-request' | 'reset-confirm';
```

**Funcionalidades**:
- ✅ Login com email/senha
- ✅ Registro de novo usuário
- ✅ Solicitação de reset de senha
- ✅ Confirmação de reset com código de 6 dígitos
- ✅ Validação de formulários
- ✅ Loading states
- ✅ Mensagens de erro

**Exemplo de Uso**:
```tsx
<LoginPage onLogin={(user, token, refreshToken) => {
    setUser(user);
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
}} />
```

---

## Componentes de Dados

### KanbanBoard

Pipeline visual drag-and-drop para gestão de oportunidades.

**Arquivo**: `components/KanbanBoard.tsx`

**Props**:
```typescript
interface KanbanBoardProps {
    opportunities: Opportunity[];
    onStatusChange: (id: string, status: OpportunityStatus) => void;
    onNotesChange: (id: string, notes: string) => void;
    onSchedule: (opportunity: Opportunity) => void;
    onSendMessage: (opportunity: Opportunity) => void;
    onDelete: (id: string) => void;
    onViewPatient: (patientId: string) => void;
}
```

**Colunas do Kanban**:
```typescript
const columns = [
    { id: 'NEW', title: 'Identificados', color: 'blue' },
    { id: 'SENT', title: 'Contatados', color: 'yellow' },
    { id: 'RESPONDED', title: 'Em Conversa', color: 'purple' },
    { id: 'SCHEDULED', title: 'Agendados', color: 'green' },
    { id: 'ARCHIVED', title: 'Arquivados', color: 'gray' },
];
```

**Funcionalidades**:
- ✅ Drag-and-drop entre colunas
- ✅ Cards com informações do paciente
- ✅ Menu de ações (enviar mensagem, agendar, deletar)
- ✅ Edição de notas inline
- ✅ Badge com keyword encontrada
- ✅ Contador de cards por coluna

**Exemplo de Uso**:
```tsx
<KanbanBoard
    opportunities={opportunities}
    onStatusChange={handleStatusChange}
    onNotesChange={handleNotesChange}
    onSchedule={handleSchedule}
    onSendMessage={handleSendMessage}
    onDelete={handleDelete}
    onViewPatient={handleViewPatient}
/>
```

---

### Charts

Componentes de gráficos para o dashboard.

**Arquivo**: `components/Charts.tsx`

**Componentes Exportados**:

#### BarChart
```typescript
interface BarChartProps {
    data: { label: string; value: number; color?: string }[];
    title?: string;
    height?: number;
}
```

#### LineChart
```typescript
interface LineChartProps {
    data: { date: string; value: number }[];
    title?: string;
    height?: number;
}
```

#### DonutChart
```typescript
interface DonutChartProps {
    data: { label: string; value: number; color: string }[];
    title?: string;
    size?: number;
}
```

#### StatsCard
```typescript
interface StatsCardProps {
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: React.ReactNode;
}
```

**Exemplo de Uso**:
```tsx
<BarChart
    data={[
        { label: 'Implante', value: 45, color: '#3B82F6' },
        { label: 'Ortodontia', value: 32, color: '#10B981' },
        { label: 'Clareamento', value: 28, color: '#F59E0B' },
    ]}
    title="Tratamentos Mais Buscados"
    height={200}
/>

<DonutChart
    data={[
        { label: 'Novos', value: 30, color: '#3B82F6' },
        { label: 'Contatados', value: 25, color: '#F59E0B' },
        { label: 'Agendados', value: 15, color: '#10B981' },
    ]}
    title="Distribuição por Status"
/>
```

---

### LeadsTable

Tabela de leads/pacientes com busca e paginação.

**Arquivo**: `components/LeadsTable.tsx`

**Props**:
```typescript
interface LeadsTableProps {
    patients: Patient[];
    onViewDetails: (patient: Patient) => void;
    onEdit: (patient: Patient) => void;
    onDelete: (id: string) => void;
    onCreateOpportunity: (patient: Patient) => void;
    isLoading?: boolean;
}
```

**Funcionalidades**:
- ✅ Busca por nome, telefone, email
- ✅ Ordenação por colunas
- ✅ Paginação
- ✅ Ações por linha (ver, editar, deletar)
- ✅ Empty state
- ✅ Loading skeleton

---

## Componentes de UI

### StatCard

Card para exibição de estatísticas no dashboard.

**Arquivo**: `components/StatCard.tsx`

**Props**:
```typescript
interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
}
```

**Exemplo de Uso**:
```tsx
<StatCard
    title="Total de Pacientes"
    value={1234}
    icon={<Users className="w-6 h-6" />}
    trend={{ value: 12, isPositive: true }}
    color="blue"
/>
```

---

### StatusBadge

Badge para exibir status de oportunidades.

**Arquivo**: `components/StatusBadge.tsx`

**Props**:
```typescript
interface StatusBadgeProps {
    status: 'NEW' | 'SENT' | 'RESPONDED' | 'SCHEDULED' | 'ARCHIVED';
    size?: 'sm' | 'md' | 'lg';
}
```

**Cores por Status**:
```typescript
const statusColors = {
    NEW: 'bg-blue-100 text-blue-800',
    SENT: 'bg-yellow-100 text-yellow-800',
    RESPONDED: 'bg-purple-100 text-purple-800',
    SCHEDULED: 'bg-green-100 text-green-800',
    ARCHIVED: 'bg-gray-100 text-gray-800',
};
```

---

### LoadingSpinner

Componentes de loading e skeleton.

**Arquivo**: `components/LoadingSpinner.tsx`

**Componentes Exportados**:

```typescript
// Spinner simples
<Spinner size="sm" | "md" | "lg" />

// Skeleton para cards
<SkeletonCard />

// Skeleton para tabela
<SkeletonTable rows={5} />

// Skeleton para Kanban
<SkeletonKanban />
```

---

### Toast

Sistema de notificações toast.

**Arquivo**: `components/Toast.tsx`

**Props**:
```typescript
interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onClose: () => void;
    duration?: number;
}
```

**Uso via Hook**:
```tsx
const { showToast } = useToast();

showToast('Paciente salvo com sucesso!', 'success');
showToast('Erro ao salvar', 'error');
```

---

### DarkModeToggle

Toggle para alternar entre tema claro e escuro.

**Arquivo**: `components/DarkModeToggle.tsx`

**Props**:
```typescript
interface DarkModeToggleProps {
    isDark: boolean;
    onToggle: () => void;
}
```

---

### DateRangeFilter

Filtro de período para relatórios.

**Arquivo**: `components/DateRangeFilter.tsx`

**Props**:
```typescript
interface DateRangeFilterProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
}

type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
```

**Opções**:
- Hoje
- Esta Semana
- Este Mês
- Este Trimestre
- Este Ano
- Todo o Período

---

### ErrorBoundary

Captura erros React e exibe fallback.

**Arquivo**: `components/ErrorBoundary.tsx`

**Props**:
```typescript
interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}
```

**Exemplo de Uso**:
```tsx
<ErrorBoundary fallback={<ErrorFallback />}>
    <App />
</ErrorBoundary>
```

---

## Componentes de Formulário

### PatientDetailsModal

Modal para visualizar e editar detalhes de um paciente.

**Arquivo**: `components/PatientDetailsModal.tsx`

**Props**:
```typescript
interface PatientDetailsModalProps {
    patient: Patient | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (patient: Patient) => void;
    onDelete: (id: string) => void;
}
```

**Funcionalidades**:
- ✅ Visualização de dados do paciente
- ✅ Edição de nome, telefone, email
- ✅ Edição de histórico clínico
- ✅ Lista de registros clínicos
- ✅ Lista de oportunidades relacionadas
- ✅ Botão para enviar mensagem WhatsApp

---

### ScheduleModal

Modal para agendar consulta.

**Arquivo**: `components/ScheduleModal.tsx`

**Props**:
```typescript
interface ScheduleModalProps {
    opportunity: Opportunity | null;
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (opportunityId: string, date: Date, notes?: string) => void;
}
```

**Funcionalidades**:
- ✅ Seleção de data e hora
- ✅ Notas opcionais
- ✅ Validação de data futura
- ✅ Confirmação de agendamento

---

### SettingsModal

Modal para configurações do sistema.

**Arquivo**: `components/SettingsModal.tsx`

**Props**:
```typescript
interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: AppSettings;
    onSave: (settings: AppSettings) => void;
}
```

**Configurações Disponíveis**:
- URL do Webhook (n8n)
- URL do Webhook de Mensagens
- API Key
- Template de Mensagem Padrão

---

### ProfileModal

Modal para editar perfil do usuário.

**Arquivo**: `components/ProfileModal.tsx`

**Props**:
```typescript
interface ProfileModalProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: Partial<User>) => void;
}
```

**Campos Editáveis**:
- Nome
- Nome da Clínica
- Avatar URL

---

### ImportPatientsModal

Modal para importar pacientes via CSV/Excel.

**Arquivo**: `components/ImportPatientsModal.tsx`

**Props**:
```typescript
interface ImportPatientsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (patients: PatientImport[]) => Promise<ImportResult>;
}
```

**Funcionalidades**:
- ✅ Upload de arquivo CSV/Excel
- ✅ Preview dos dados
- ✅ Mapeamento de colunas
- ✅ Validação de dados
- ✅ Progresso de importação
- ✅ Relatório de erros

---

### ConfirmModal

Modal de confirmação genérico.

**Arquivo**: `components/ConfirmModal.tsx`

**Props**:
```typescript
interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}
```

---

### NotificationsPopover

Popover com lista de notificações.

**Arquivo**: `components/NotificationsPopover.tsx`

**Props**:
```typescript
interface NotificationsPopoverProps {
    notifications: Notification[];
    unreadCount: number;
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onDelete: (id: string) => void;
}
```

---

### ExportMenu

Menu dropdown para exportação de dados.

**Arquivo**: `components/ExportMenu.tsx`

**Props**:
```typescript
interface ExportMenuProps {
    data: any[];
    filename: string;
    columns: ExportColumn[];
}

interface ExportColumn {
    key: string;
    header: string;
    format?: (value: any) => string;
}
```

**Formatos de Exportação**:
- CSV
- Excel (XLSX)
- PDF (básico)

---

## Hooks Customizados

### useToast

Gerenciamento de notificações toast.

**Arquivo**: `hooks/useToast.tsx`

```typescript
interface UseToastReturn {
    toasts: Toast[];
    showToast: (message: string, type: ToastType) => void;
    hideToast: (id: string) => void;
}

// Uso
const { showToast } = useToast();
showToast('Operação realizada com sucesso!', 'success');
```

---

### useConfirm

Modal de confirmação imperativo.

**Arquivo**: `hooks/useConfirm.tsx`

```typescript
interface UseConfirmReturn {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    ConfirmDialog: React.FC;
}

// Uso
const { confirm, ConfirmDialog } = useConfirm();

const handleDelete = async () => {
    const confirmed = await confirm({
        title: 'Excluir Paciente',
        message: 'Tem certeza que deseja excluir este paciente?',
        variant: 'danger'
    });
    
    if (confirmed) {
        await deletePatient(id);
    }
};
```

---

### useDebounce

Debounce para inputs de busca.

**Arquivo**: `hooks/useDebounce.tsx`

```typescript
function useDebounce<T>(value: T, delay: number): T;

// Uso
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
    if (debouncedSearch) {
        searchPatients(debouncedSearch);
    }
}, [debouncedSearch]);
```

---

### useDarkMode

Gerenciamento de tema escuro.

**Arquivo**: `hooks/useDarkMode.tsx`

```typescript
interface UseDarkModeReturn {
    isDark: boolean;
    toggle: () => void;
    setDark: (dark: boolean) => void;
}

// Uso
const { isDark, toggle } = useDarkMode();
```

---

### useNotifications

Conexão WebSocket para notificações real-time.

**Arquivo**: `hooks/useNotifications.tsx`

```typescript
interface UseNotificationsReturn {
    notifications: Notification[];
    unreadCount: number;
    isConnected: boolean;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    deleteNotification: (id: string) => void;
}

// Uso
const { notifications, unreadCount, isConnected } = useNotifications(userId);
```

---

## Services

### apiService

Serviço centralizado para chamadas à API REST.

**Arquivo**: `services/apiService.ts`

**Métodos Principais**:

```typescript
// Autenticação
api.login(email: string, password: string): Promise<LoginResponse>
api.register(data: RegisterData): Promise<LoginResponse>
api.refresh(refreshToken: string): Promise<TokenResponse>
api.logout(): Promise<void>

// Pacientes
api.getPatients(): Promise<Patient[]>
api.getPatient(id: string): Promise<Patient>
api.createPatient(data: PatientData): Promise<Patient>
api.updatePatient(id: string, data: Partial<PatientData>): Promise<Patient>
api.deletePatient(id: string): Promise<void>
api.searchPatients(query: string): Promise<Patient[]>
api.importPatients(patients: PatientImport[]): Promise<ImportResult>

// Oportunidades
api.getOpportunities(): Promise<Opportunity[]>
api.createOpportunity(data: OpportunityData): Promise<Opportunity>
api.searchOpportunities(keyword: string, limit?: number): Promise<Opportunity[]>
api.updateOpportunityStatus(id: string, status: OpportunityStatus): Promise<Opportunity>
api.updateOpportunityNotes(id: string, notes: string): Promise<Opportunity>
api.deleteOpportunity(id: string): Promise<void>

// Notificações
api.getNotifications(): Promise<Notification[]>
api.getUnreadCount(): Promise<number>
api.markAsRead(id: string): Promise<void>
api.markAllAsRead(): Promise<void>

// WhatsApp
api.getWhatsAppStatus(): Promise<WhatsAppStatus>
api.sendWhatsAppMessage(phone: string, message: string): Promise<MessageResult>

// Configurações
api.getSettings(): Promise<AppSettings>
api.updateSettings(data: Partial<AppSettings>): Promise<AppSettings>

// Perfil
api.getProfile(): Promise<User>
api.updateProfile(data: Partial<User>): Promise<User>
```

---

### whatsappService

Serviço de integração com WhatsApp (multi-provider).

**Arquivo**: `services/whatsappService.ts`

**Providers Suportados**:
- Evolution API (recomendado)
- Z-API
- Meta Business API

```typescript
// Configuração
whatsapp.configure({
    provider: 'evolution',
    baseUrl: 'http://localhost:8080',
    instanceName: 'clinicaflow',
    apiKey: 'your-api-key'
});

// Métodos
whatsapp.sendMessage(phone: string, message: string): Promise<MessageResult>
whatsapp.sendTemplate(phone: string, template: string, variables: object): Promise<MessageResult>
whatsapp.getStatus(): Promise<ConnectionStatus>
```

---

### exportService

Serviço de exportação de dados.

**Arquivo**: `services/exportService.ts`

```typescript
// Exportar para CSV
exportService.toCSV(data: any[], columns: Column[], filename: string): void

// Exportar para Excel
exportService.toExcel(data: any[], columns: Column[], filename: string): void

// Exportar para PDF
exportService.toPDF(data: any[], columns: Column[], filename: string): void
```

---

## Padrões de Código

### Nomenclatura

```typescript
// Componentes: PascalCase
const PatientDetailsModal: React.FC<Props> = () => {};

// Hooks: camelCase com prefixo 'use'
const useDebounce = <T>(value: T, delay: number): T => {};

// Handlers: camelCase com prefixo 'handle'
const handleSubmit = () => {};

// Props: sufixo 'Props'
interface PatientDetailsModalProps {}
```

### Estrutura de Componente

```tsx
// 1. Imports
import React, { useState, useEffect } from 'react';
import { SomeIcon } from 'lucide-react';

// 2. Types/Interfaces
interface MyComponentProps {
    data: DataType;
    onAction: (id: string) => void;
}

// 3. Component
export const MyComponent: React.FC<MyComponentProps> = ({ data, onAction }) => {
    // 3.1 Hooks
    const [state, setState] = useState<StateType>(initialState);
    
    // 3.2 Effects
    useEffect(() => {
        // side effects
    }, [dependencies]);
    
    // 3.3 Handlers
    const handleClick = () => {
        onAction(data.id);
    };
    
    // 3.4 Render
    return (
        <div className="...">
            {/* JSX */}
        </div>
    );
};

// 4. Default export (se único componente no arquivo)
export default MyComponent;
```

---

## Temas e Estilos

### Classes Tailwind Padrão

```typescript
// Botões
const buttonStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'hover:bg-gray-100 text-gray-700',
};

// Cards
const cardStyles = 'bg-white dark:bg-gray-800 rounded-lg shadow-md p-4';

// Inputs
const inputStyles = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600';
```

### Dark Mode

```tsx
// Suporte via classes do Tailwind
<div className="bg-white dark:bg-gray-800">
    <p className="text-gray-900 dark:text-gray-100">
        Texto com suporte a dark mode
    </p>
</div>
```

---

## Referências

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/icons/)
