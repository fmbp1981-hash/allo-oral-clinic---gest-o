# 🏗️ Arquitetura do Sistema - ClinicaFlow

**Versão**: 4.1.0  
**Última Atualização**: 05/01/2026  
**Autores**: Equipe de Desenvolvimento ClinicaFlow

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Diagrama de Arquitetura](#diagrama-de-arquitetura)
3. [Stack Tecnológica](#stack-tecnológica)
4. [Camadas do Sistema](#camadas-do-sistema)
5. [Fluxo de Dados](#fluxo-de-dados)
6. [Padrões de Design](#padrões-de-design)
7. [Segurança](#segurança)
8. [Escalabilidade](#escalabilidade)
9. [Decisões Arquiteturais (ADRs)](#decisões-arquiteturais-adrs)
10. [Melhorias Futuras](#melhorias-futuras)

---

## Visão Geral

O **ClinicaFlow** é um sistema de CRM especializado para clínicas odontológicas, focado em:

- **Reativação de pacientes inativos** através de busca ativa inteligente
- **Pipeline visual (Kanban)** para gestão do fluxo de pacientes
- **Integração com WhatsApp** para comunicação direta
- **Dashboard analítico** com métricas em tempo real
- **Multi-tenancy** para suportar múltiplas clínicas

### Princípios Arquiteturais

1. **Separation of Concerns**: Frontend, Backend e Banco de Dados são independentes
2. **API-First**: Toda comunicação via REST API + WebSocket
3. **Security by Design**: JWT, Rate Limiting, Helmet.js, validação de dados
4. **Real-time First**: Notificações e atualizações em tempo real via Socket.io

---

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + Vite)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   App.tsx   │  │  Components │  │   Hooks     │  │     Services        │ │
│  │  (Router)   │  │  (UI Layer) │  │  (State)    │  │  (API + WebSocket)  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                          HTTP/REST + WebSocket (Socket.io)
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Node.js + Express)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Routes    │  │ Controllers │  │ Middlewares │  │     Services        │ │
│  │  (Routing)  │  │  (Logic)    │  │  (Auth/Log) │  │  (Business Logic)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                          Socket.io Server                               ││
│  │              (Real-time Notifications + Events)                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                            Supabase Client (SDK)
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SUPABASE (PostgreSQL + Auth)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │    users    │  │   patients  │  │opportunities│  │   notifications     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────────────────┐│
│  │clinical_    │  │app_settings │  │         RLS (Row Level Security)     ││
│  │records      │  │             │  │              + Indexes               ││
│  └─────────────┘  └─────────────┘  └───────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                            External Services (opcional)
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INTEGRAÇÕES EXTERNAS                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Evolution API  │  │     Z-API       │  │   Meta Business API         │  │
│  │   (WhatsApp)    │  │   (WhatsApp)    │  │      (WhatsApp)             │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────────────────────────────────────┐   │
│  │  Sentry (Error  │  │            SMTP/Email Service                   │   │
│  │   Tracking)     │  │         (Futuro - Reset Password)               │   │
│  └─────────────────┘  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stack Tecnológica

### Frontend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **React** | 19.2.0 | Framework UI declarativo |
| **TypeScript** | 5.8.2 | Tipagem estática |
| **Vite** | 6.2.0 | Build tool e dev server |
| **TailwindCSS** | 3.4.17 | Estilização utility-first |
| **Lucide React** | 0.554.0 | Ícones SVG |
| **Socket.io Client** | 4.7.2 | WebSocket para real-time |
| **XLSX** | 0.18.5 | Exportação para Excel |
| **PapaParse** | 5.5.3 | Parse de arquivos CSV |

### Backend

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Node.js** | 20+ | Runtime JavaScript |
| **Express** | 4.18.2 | Framework HTTP minimalista |
| **TypeScript** | 5.3.3 | Tipagem estática |
| **Supabase SDK** | 2.39.0 | Cliente PostgreSQL + Auth |
| **Socket.io** | 4.7.2 | WebSocket server |
| **JWT (jsonwebtoken)** | 9.0.2 | Autenticação stateless |
| **Bcrypt.js** | 3.0.3 | Hash de senhas |
| **Helmet.js** | 8.1.0 | Security headers |
| **Winston** | 3.11.0 | Logging estruturado |
| **Zod** | 4.1.12 | Validação de schemas |
| **express-rate-limit** | 7.1.5 | Rate limiting |

### Banco de Dados

| Tecnologia | Propósito |
|------------|-----------|
| **Supabase** | PostgreSQL gerenciado + Auth + Storage |
| **PostgreSQL** | Banco relacional com suporte a JSON |

### Infraestrutura

| Tecnologia | Propósito |
|------------|-----------|
| **Docker** | Containerização |
| **Docker Compose** | Orquestração local |
| **Nginx** | Reverse proxy (produção) |

---

## Camadas do Sistema

### 1. Presentation Layer (Frontend)

```
frontend/
├── App.tsx              # Componente raiz, roteamento interno
├── components/          # Componentes React reutilizáveis
│   ├── KanbanBoard.tsx  # Pipeline visual (drag-and-drop)
│   ├── Charts.tsx       # Gráficos (Bar, Line, Donut)
│   ├── LoginPage.tsx    # Autenticação
│   └── ...
├── hooks/               # Hooks customizados
│   ├── useToast.tsx     # Sistema de notificações toast
│   ├── useNotifications.tsx  # WebSocket notifications
│   └── ...
├── services/            # Comunicação com API
│   ├── apiService.ts    # REST API calls
│   └── whatsappService.ts  # Integração WhatsApp
└── types.ts             # Interfaces TypeScript
```

**Responsabilidades**:
- Renderização da UI
- Estado local (useState, useReducer)
- Comunicação com backend via apiService
- WebSocket para real-time updates

### 2. API Layer (Backend Routes)

```
backend/src/routes/
├── auth.routes.ts        # /api/auth/*
├── patient.routes.ts     # /api/patients/*
├── opportunity.routes.ts # /api/opportunities/*
├── notification.routes.ts # /api/notifications/*
├── whatsapp.routes.ts    # /api/whatsapp/*
├── settings.routes.ts    # /api/settings/*
└── user.routes.ts        # /api/users/*
```

**Responsabilidades**:
- Definição de endpoints HTTP
- Aplicação de middlewares por rota
- Validação básica de parâmetros

### 3. Business Logic Layer (Controllers)

```
backend/src/controllers/
├── auth.controller.ts        # Login, Register, Refresh, Reset
├── patient.controller.ts     # CRUD de pacientes
├── opportunity.controller.ts # Pipeline de oportunidades
├── notification.controller.ts # Sistema de notificações
├── whatsapp.controller.ts    # Integração WhatsApp
├── settings.controller.ts    # Configurações
└── user.controller.ts        # Perfil do usuário
```

**Responsabilidades**:
- Lógica de negócio
- Validação de regras
- Formatação de respostas
- Logging de operações

### 4. Data Access Layer (Supabase)

```
backend/src/lib/
├── supabase.ts     # Cliente Supabase configurado
└── logger.ts       # Winston logger configurado
```

**Responsabilidades**:
- Conexão com PostgreSQL via Supabase SDK
- Queries otimizadas com selects relacionais
- Transações e batch operations

### 5. Cross-Cutting Concerns (Middlewares)

```
backend/src/middlewares/
├── auth.middleware.ts       # Verificação de JWT
├── rateLimiter.middleware.ts # Rate limiting
└── validation.middleware.ts  # Validação de schemas (Zod)
```

---

## Fluxo de Dados

### Autenticação (JWT Flow)

```
┌──────────┐      POST /api/auth/login      ┌──────────┐
│  Client  │ ────────────────────────────► │  Server  │
│          │     { email, password }        │          │
└──────────┘                                └──────────┘
                                                  │
                                                  ▼
                                    ┌─────────────────────────┐
                                    │ 1. Busca usuário no DB  │
                                    │ 2. Verifica senha       │
                                    │ 3. Gera JWT tokens      │
                                    │ 4. Salva refresh hash   │
                                    └─────────────────────────┘
                                                  │
                                                  ▼
┌──────────┐      { accessToken, refreshToken }  ┌──────────┐
│  Client  │ ◄──────────────────────────────── │  Server  │
│          │                                     │          │
└──────────┘                                     └──────────┘
      │
      ▼
┌──────────────────────────────────────────────────────────────┐
│  Client armazena tokens:                                     │
│  - accessToken: localStorage (15min expiry)                  │
│  - refreshToken: localStorage (7d expiry)                    │
│                                                              │
│  Requisições subsequentes:                                   │
│  Authorization: Bearer <accessToken>                         │
└──────────────────────────────────────────────────────────────┘
```

### Pipeline Kanban (Busca Ativa)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DE BUSCA ATIVA                              │
└─────────────────────────────────────────────────────────────────────────────┘

1. Usuário digita keyword (ex: "implante")
         │
         ▼
2. POST /api/opportunities/search { keyword, limit }
         │
         ▼
3. Backend busca no histórico dos pacientes (ILIKE %keyword%)
         │
         ▼
4. Retorna lista de pacientes que mencionam a keyword
         │
         ▼
5. Frontend cria cards no Kanban (status: NEW)
         │
         ▼
6. Drag-and-drop move cards entre colunas:
   
   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │   NEW    │ → │   SENT   │ → │RESPONDED │ → │SCHEDULED │ → │ ARCHIVED │
   │Identificado  │ Contatado│  │Em Conversa│  │ Agendado │   │Arquivado │
   └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
         │
         ▼
7. PATCH /api/opportunities/:id/status { status: 'SENT' }
```

### Notificações Real-Time

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          WEBSOCKET FLOW                                      │
└──────────────────────────────────────────────────────────────────────────────┘

1. Cliente conecta ao Socket.io
   socket.emit('authenticate', { userId })
         │
         ▼
2. Servidor valida e adiciona à sala do usuário
   socket.join(`user:${userId}`)
         │
         ▼
3. Quando nova notificação é criada (ex: paciente respondeu):

   Backend:
   notificationService.notify(userId, {
       title: 'Paciente respondeu!',
       message: 'João Silva respondeu sua mensagem',
       type: 'success'
   });
         │
         ▼
4. Socket.io emite para sala do usuário:
   io.to(`user:${userId}`).emit('notification', data);
         │
         ▼
5. Cliente recebe e atualiza UI em tempo real
   - Badge contador incrementa
   - Toast notification aparece
   - Lista de notificações atualiza
```

---

## Padrões de Design

### 1. Repository Pattern (implícito via Supabase)

O Supabase SDK abstrai o acesso ao banco, funcionando como um repository:

```typescript
// Exemplo de uso
const { data, error } = await supabase
    .from('patients')
    .select('*, opportunities(*)')
    .eq('tenant_id', tenantId);
```

### 2. Service Layer

Services encapsulam lógica complexa:

```typescript
// notification.service.ts
class NotificationService {
    async notify(userId: string, data: NotificationData) {
        // 1. Salva no banco
        // 2. Emite via WebSocket
    }
}
```

### 3. Middleware Chain

Express middlewares são encadeados:

```typescript
router.get('/patients', 
    authenticate,           // 1. Verifica JWT
    rateLimiter,            // 2. Rate limit
    validateQuery(schema),  // 3. Valida query params
    getPatients             // 4. Controller
);
```

### 4. DTO Pattern (via TypeScript interfaces)

```typescript
// types.ts - Define contratos
interface Patient {
    id: string;
    name: string;
    phone: string;
    email?: string;
    history?: string;
}
```

---

## Segurança

### Autenticação

| Mecanismo | Descrição |
|-----------|-----------|
| **JWT Access Token** | Expira em 15 minutos |
| **JWT Refresh Token** | Expira em 7 dias, rotacionado a cada uso |
| **Bcrypt** | Hash de senhas com salt (cost factor 10) |
| **Token Hash Storage** | Refresh tokens armazenados como hash SHA-256 |

### Proteções

| Proteção | Implementação |
|----------|---------------|
| **XSS** | Helmet.js CSP headers |
| **CSRF** | SameSite cookies + Origin validation |
| **Rate Limiting** | 100 req/15min geral, 5 req/15min login |
| **SQL Injection** | Supabase SDK com prepared statements |
| **HTTPS** | Forçado via HSTS headers |

### Multi-tenancy

```typescript
// Toda query é filtrada por tenant_id
.eq('tenant_id', req.user.tenantId)
```

---

## Escalabilidade

### Horizontal Scaling

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │     (Nginx)     │
                    └─────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  Backend #1  │ │  Backend #2  │ │  Backend #3  │
    │   (Node.js)  │ │   (Node.js)  │ │   (Node.js)  │
    └──────────────┘ └──────────────┘ └──────────────┘
            │               │               │
            └───────────────┼───────────────┘
                            ▼
                    ┌──────────────────┐
                    │  Supabase Pool   │
                    │  (PostgreSQL)    │
                    └──────────────────┘
```

### Considerações para Scaling

1. **Socket.io**: Usar Redis Adapter para múltiplas instâncias
2. **Sessions**: JWT stateless permite scaling horizontal
3. **Database**: Connection pooling via Supabase

---

## Decisões Arquiteturais (ADRs)

### ADR-001: Supabase como Backend-as-a-Service

**Contexto**: Necessidade de banco de dados PostgreSQL gerenciado com auth.

**Decisão**: Usar Supabase ao invés de PostgreSQL puro ou Firebase.

**Consequências**:
- ✅ PostgreSQL completo com RLS
- ✅ SDK JavaScript moderno
- ✅ Auth integrado (não utilizado - JWT próprio)
- ⚠️ Vendor lock-in parcial

### ADR-002: JWT com Refresh Tokens

**Contexto**: Necessidade de autenticação stateless e segura.

**Decisão**: JWT com access token curto (15min) + refresh token longo (7d).

**Consequências**:
- ✅ Stateless, escalável
- ✅ Tokens podem ser revogados (via hash no DB)
- ⚠️ Complexidade adicional no frontend

### ADR-003: Socket.io para Real-time

**Contexto**: Notificações precisam ser em tempo real.

**Decisão**: Socket.io ao invés de SSE ou polling.

**Consequências**:
- ✅ Bidirecional
- ✅ Fallback automático para long-polling
- ⚠️ Estado de conexão a gerenciar

### ADR-004: Multi-provider WhatsApp

**Contexto**: Diferentes clínicas podem preferir diferentes provedores.

**Decisão**: Abstração que suporta Evolution API, Z-API e Meta Business API.

**Consequências**:
- ✅ Flexibilidade para o cliente
- ⚠️ Manutenção de 3 integrações

---

## Melhorias Futuras

### Alta Prioridade

1. **Error Tracking com Sentry** - Monitoramento de erros em produção
2. **Testes E2E com Playwright** - Cobertura de fluxos críticos
3. **CI/CD com GitHub Actions** - Deploy automatizado

### Média Prioridade

1. **Redis para Cache** - Caching de queries frequentes
2. **Queue System (Bull)** - Processamento assíncrono de mensagens
3. **GraphQL** - API mais flexível para frontend

### Baixa Prioridade

1. **Microservices** - Separar WhatsApp service
2. **Kubernetes** - Orquestração em larga escala
3. **CDC (Change Data Capture)** - Sincronização com sistemas legados

---

## Referências

- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Supabase Documentation](https://supabase.com/docs)
- [Socket.io Scaling](https://socket.io/docs/v4/using-multiple-nodes/)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
