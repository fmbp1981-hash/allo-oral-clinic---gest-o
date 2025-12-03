<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🦷 ClinicaFlow - Sistema de Gestão para Clínicas Odontológicas

> Sistema completo de reativação de pacientes e gestão de CRM para clínicas odontológicas com funcionalidades de busca ativa, pipeline Kanban, notificações em tempo real via Socket.io, e integração WhatsApp.

[![React](https://img.shields.io/badge/React-19.0-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📚 Índice

- [✨ Funcionalidades](#-funcionalidades)
- [🎯 Demonstração](#-demonstração)
- [🚀 Quick Start](#-quick-start)
- [🛠️ Stack Tecnológica](#️-stack-tecnológica)
- [📦 Estrutura do Projeto](#-estrutura-do-projeto)
- [🔐 Configuração](#-configuração)
- [📖 Documentação](#-documentação)
- [🤝 Contribuindo](#-contribuindo)

---

## ✨ Funcionalidades

### 🎯 Core Features

- **Dashboard Analítico** - Métricas em tempo real com gráficos (DonutChart, BarChart, LineChart)
- **Busca Ativa de Pacientes** - Prospecção inteligente por palavras-chave no histórico clínico
- **Pipeline Kanban** - Gestão visual do fluxo de reativação (Novo → Contatado → Respondeu → Agendado)
- **Base de Pacientes Completa** - Visualização e filtragem de 48+ pacientes com histórico clínico
- **Notificações Real-Time** - Socket.io com badge de contador e popover interativo
- **Dark Mode** - Tema escuro/claro com persistência no localStorage
- **Export Multi-Formato** - CSV, Excel, PDF com charts inclusos

### 🔒 Segurança & Performance

- ✅ Autenticação JWT com refresh tokens
- ✅ Rate Limiting (express-rate-limit)
- ✅ Security Headers (Helmet.js)
- ✅ CORS configurado
- ✅ Logging estruturado (Winston)
- ✅ Validação com Zod

### 📱 Integrações

- **WhatsApp** - Suporte para Evolution API (preparado)
- **Supabase** - Backend-as-a-Service com PostgreSQL
- **Socket.io** - Comunicação bi-direcional em tempo real

---

## 🎯 Demonstração

```bash
# Credenciais de teste (após aplicar seed data)
Email: admin@allooral.com
Senha: admin123
```

**Screenshots:**
- Dashboard com métricas e gráficos
- Pipeline Kanban com drag-and-drop
- Notificações em tempo real
- Base de pacientes com filtros avançados

---

## 🚀 Quick Start

### Pré-requisitos

- **Node.js** 20+
- **npm** ou **yarn**
- **Conta Supabase** (gratuita) - [Criar conta](https://supabase.com/)

### 1️⃣ Clonar o Repositório

```bash
git clone https://github.com/seu-usuario/clinicaflow.git
cd clinicaflow
```

### 2️⃣ Configurar Backend

```bash
cd backend

# Instalar dependências
npm install

# Criar arquivo .env a partir do template
cp .env.example .env

# Editar .env com suas credenciais Supabase
notepad .env  # Windows
nano .env     # Linux/Mac
```

**Variáveis obrigatórias no `backend/.env`:**

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=your_secret_key_minimum_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_characters
```

### 3️⃣ Configurar Banco de Dados (Supabase)

```bash
# 1. Acesse o Supabase SQL Editor
# 2. Execute os scripts na ordem:

# A) Schema base
backend/supabase/schema.sql

# B) Correções de schema
backend/supabase/migrations/00_fix_schema.sql

# C) Suporte a refresh tokens
backend/supabase/migrations/01_add_refresh_token.sql

# D) Notificações por usuário
backend/supabase/migrations/02_add_user_id_to_notifications.sql

# E) Dados de teste (48 pacientes + 3 usuários)
backend/supabase/migrations/03_seed_data.sql
```

### 4️⃣ Iniciar Backend

```bash
npm run dev
# ✅ Backend rodando em http://localhost:3001
```

### 5️⃣ Configurar Frontend

```bash
# Voltar para raiz do projeto
cd ..

# Instalar dependências
npm install

# Criar .env (opcional - já tem valor padrão)
cp .env.example .env
```

### 6️⃣ Iniciar Frontend

```bash
npm run dev
# ✅ Frontend rodando em http://localhost:3000
```

### 7️⃣ Acessar Sistema

Abra http://localhost:3000 e faça login com:

```
Email: admin@allooral.com
Senha: admin123
```

---

## 🛠️ Stack Tecnológica

### Frontend
```
React 19.0           - UI Library
TypeScript 5.5       - Type Safety
Vite 6.4             - Build Tool & Dev Server
TailwindCSS 3.4      - Utility-First CSS
Socket.io-client     - Real-time Communication
Lucide React         - Icon Library
jsPDF + xlsx         - Export Functionality
date-fns             - Date Utilities
```

### Backend
```
Node.js 20+          - Runtime
Express 4.21         - Web Framework
TypeScript 5.7       - Type Safety
Supabase             - PostgreSQL Database + Auth
Socket.io 4.7        - WebSocket Server
Winston              - Structured Logging
Zod                  - Schema Validation
bcryptjs             - Password Hashing
JWT                  - Token Authentication
express-rate-limit   - API Rate Limiting
Helmet               - Security Headers
```

### Database (Supabase PostgreSQL)
```
users                - Usuários do sistema
patients             - Base completa de pacientes
opportunities        - Pipeline de reativação
clinical_records     - Prontuários clínicos
notifications        - Notificações em tempo real
app_settings         - Configurações do sistema
```

---

## 📦 Estrutura do Projeto

```
clinicaflow/
├── backend/                     # Backend Node.js + Express
│   ├── src/
│   │   ├── controllers/         # Lógica de negócio
│   │   ├── middlewares/         # Auth, Rate Limit, etc
│   │   ├── routes/              # Definição de rotas
│   │   ├── services/            # Serviços (Socket.io, etc)
│   │   ├── lib/                 # Libs (Supabase, Logger)
│   │   └── server.ts            # Entry point
│   ├── supabase/
│   │   ├── schema.sql           # Schema base
│   │   └── migrations/          # Migrações SQL
│   ├── .env.example             # Template de variáveis
│   └── package.json
│
├── hooks/                       # React Custom Hooks
│   ├── useNotifications.tsx     # Socket.io + Notifications
│   ├── useToast.tsx             # Toast notifications
│   ├── useDarkMode.tsx          # Dark mode state
│   ├── useConfirm.tsx           # Confirmation modals
│   └── useDebounce.tsx          # Debounce utility
│
├── components/                  # Componentes React
│   ├── Charts.tsx               # DonutChart, BarChart, LineChart
│   ├── KanbanBoard.tsx          # Drag & drop pipeline
│   ├── NotificationsPopover.tsx # Real-time notifications
│   ├── LoginPage.tsx            # Auth page
│   └── ...
│
├── services/                    # Frontend services
│   ├── apiService.ts            # HTTP client (fetch)
│   └── exportService.ts         # CSV/Excel/PDF export
│
├── App.tsx                      # Main application component
├── index.tsx                    # Entry point
├── types.ts                     # TypeScript definitions
├── .env.example                 # Frontend env template
└── README.md                    # Este arquivo
```

---

## 🔐 Configuração

### Gerando JWT Secrets

```bash
# Usando Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Ou OpenSSL
openssl rand -base64 64
```

### Configurando Supabase

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá em **Settings** → **API**
4. Copie a `URL` e `anon/public key`
5. Cole no arquivo `backend/.env`

### Desabilitando RLS (Row Level Security)

**IMPORTANTE:** Para desenvolvimento, desabilite o RLS:

```sql
-- Execute no Supabase SQL Editor
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
```

---

## 📖 Documentação

- **[NOTIFICATIONS-SYSTEM.md](NOTIFICATIONS-SYSTEM.md)** - Sistema de notificações Socket.io
- **[STATUS-PROJETO.md](STATUS-PROJETO.md)** - Status atual do desenvolvimento
- **[RESUMO-SESSAO.md](RESUMO-SESSAO.md)** - Log de alterações da última sessão

---

## 🐛 Troubleshooting

### Erro: "Supabase not configured"
- Verifique se o `.env` do backend tem `SUPABASE_URL` e `SUPABASE_ANON_KEY`
- Confirme que o dotenv.config() está no topo do `server.ts`

### Erro: "Port 3001 already in use"
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <pid> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### Frontend não conecta ao Socket.io
- Verifique se o backend está rodando em `http://localhost:3001`
- Abra o console do navegador (F12) e procure por logs `✅ Socket.io connected`
- Confirme que o `VITE_API_URL` está correto no `.env`

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📊 Status do Projeto

**Versão**: 1.0.0
**Progresso**: 90% completo

### ✅ Implementado
- [x] Autenticação JWT com refresh tokens
- [x] Dashboard com métricas e gráficos
- [x] Busca ativa de pacientes
- [x] Pipeline Kanban
- [x] Notificações real-time (Socket.io)
- [x] Dark mode
- [x] Export CSV/Excel/PDF
- [x] Rate limiting e segurança
- [x] 76 testes unitários

### 🚧 Em Desenvolvimento
- [ ] Integração WhatsApp Evolution API (disparo direto)
- [ ] PWA features (offline support)
- [ ] Relatórios avançados com charts

---

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

Desenvolvido por **IntelliX.AI** 🧠

---

## 📞 Suporte

Para dúvidas ou problemas, abra uma [Issue](https://github.com/seu-usuario/clinicaflow/issues).

**AI Studio App**: https://ai.studio/apps/drive/10omxS0kqOxnuWLm1Z95sJ06BoBIGRB_A
