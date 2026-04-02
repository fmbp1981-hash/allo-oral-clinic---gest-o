# 🦷 ClinicaFlow - Documentação e Histórico (Arquivo Vivo)

> **Importante:** Este é um arquivo vivo. Ele deve ser constantemente atualizado a cada nova funcionalidade, ajuste, correção ou mudança arquitetural durante todo o desenvolvimento do projeto.

---

## 📖 1. Visão Geral
**Nome do Projeto:** ClinicaFlow
**Objetivo:** Sistema completo de gestão de CRM para clínicas odontológicas, com pipeline Kanban, reativação de pacientes, agente de IA dental especialista via WhatsApp (multi-provider), sistema de agendamento de consultas, sincronização com calendários externos e métricas em tempo real.

### Problema que Resolve
Muitas clínicas perdem oportunidades de reativar pacientes antigos por falta de organização e comunicação. O ClinicaFlow resolve isso fornecendo:
- Um Pipeline (Kanban) visual para gerenciar o contato com o paciente.
- Uma base de pacientes rica (com histórico clínico e anotações).
- Busca ativa inteligente baseada em palavras-chave dentro de históricos.
- Métricas em tempo real para tomada de decisão (taxa de conversão, total recuperado, etc).
- **Agente de IA dental** que atende pacientes via WhatsApp, agenda consultas automaticamente e faz follow-up.
- **Sistema de agendamento** com calendário visual (Dia/Semana/Mês), multi-dentista, slots disponíveis e lembretes automáticos.
- **Integração com calendários externos** (Google Calendar, iCal/ICS de softwares odontológicos).

---

## 🛠️ 2. Descrição Técnica

O projeto utiliza Next.js 15 App Router (fullstack) com Supabase como BaaS.

### Stack Tecnológica Geral
**Frontend:**
- **Framework:** Next.js 15.1.4 (App Router) + React 19.2.0 + TypeScript 5.8.2
- **Build Tool:** Next.js (produção) / Vite 6.4 (dev alternativo)
- **Estilização:** TailwindCSS 3.4 + CSS Customizado (modo claro/escuro)
- **Ícones & Exportação:** Lucide React, jsPDF, xlsx
- **Estado & Hooks:** Custom Hooks nativos (useNotifications, useDarkMode, useToast, useDebounce, useConfirm)

**Backend (API Routes — Next.js App Router):**
- **Runtime:** Node.js 20+ via Next.js API Routes (`app/api/`)
- **Linguagem:** TypeScript 5.8.2
- **Banco de Dados (BaaS):** Supabase (PostgreSQL + Auth + RLS)
- **IA Principal:** OpenAI gpt-4o-mini (v6.32.0)
- **IA Fallback:** Anthropic Claude Sonnet (via @anthropic-ai/sdk)
- **WhatsApp Multi-Provider:** Evolution API, Meta Cloud API, Z-API
- **Validação:** Zod Schemas
- **Autenticação:** JWT (validateAuthHeader + getSupabaseClient)

**Testes:**
- **Unit Tests:** Vitest 2.1.8 (63 testes passando)
- **E2E:** Playwright 1.57.0
- **Coverage:** vitest --coverage

**Deploy:**
- **Plataforma:** Vercel (auto-deploy via GitHub)
- **Framework config:** vercel.json (Next.js)

### Estrutura do Banco de Dados (Supabase PostgreSQL)

**Tabelas Core:**
- `users` — Gestão de usuários e níveis de acesso (Admin, Consultor, Parceiro, Cliente)
- `patients` — Base completa de pacientes
- `opportunities` — Cards no pipeline de reativação (Kanban)
- `clinical_records` — Prontuários e evoluções clínicas
- `notifications` — Sistema de avisos para painel real-time
- `app_settings` — Configurações de tema, comportamento e sistema por usuário
- `user_settings` — Configurações do agente IA e WhatsApp por clínica

**Tabelas de Atendimento IA:**
- `agent_conversations` — Conversas entre agente IA e pacientes via WhatsApp
- `agent_messages` — Mensagens individuais dentro de cada conversa
- `handoff_requests` — Solicitações de transferência IA → atendente humano

**Tabelas de Agendamento (Migration 016):**
- `dentists` — Cadastro de dentistas com especialidade, CRM e cor no calendário
- `schedule_config` — Configuração de horários semanais por dentista (7 dias)
- `schedule_blocks` — Bloqueios de horário (férias, reuniões, etc.)
- `appointments` — Consultas agendadas com status, fonte e histórico
- `appointment_history` — Log de mudanças de status das consultas
- `appointment_reminders` — Lembretes automáticos (24h e 2h antes)
- `calendar_integrations` — Integrações com Google Calendar e iCal/ICS

**Todas as tabelas possuem RLS (Row Level Security) habilitado.**

### Estrutura do Repositório

```
/ (raiz)
├── app/                        # Next.js App Router
│   ├── api/                    # 17+ grupos de API routes
│   │   ├── lib/                # Auth (validateAuthHeader) + Supabase client
│   │   ├── agent/              # Conversations, messages, process-incoming, handoff
│   │   ├── dentists/           # CRUD dentistas + schedule config
│   │   ├── appointments/       # CRUD consultas + available-slots
│   │   ├── schedule-blocks/    # Bloqueios de horário
│   │   ├── calendar-sync/      # Integração com calendários externos
│   │   ├── patients/           # CRUD pacientes
│   │   ├── opportunities/      # CRUD oportunidades (Kanban)
│   │   ├── notifications/      # Notificações
│   │   ├── campaigns/          # Campanhas de mensagem
│   │   ├── settings/           # Configurações do usuário
│   │   ├── whatsapp/           # Webhook + status + send
│   │   └── health/             # Health check endpoint
│   ├── lib/                    # Lógica de negócio
│   │   ├── agent/              # process-incoming, humanizer
│   │   ├── calendar/           # calendar-sync (iCal, Google)
│   │   ├── openai/             # agent-response (dental system prompt)
│   │   └── whatsapp/           # Multi-provider (Evolution, Meta, Z-API)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/                 # Componentes React
│   ├── AgendaPage.tsx          # Calendário (Dia/Semana/Mês)
│   ├── KanbanBoard.tsx         # Pipeline visual
│   ├── ScheduleModal.tsx       # Modal de agendamento
│   ├── AgentConfigPanel.tsx    # Config do agente IA
│   └── ... (20+ componentes)
├── hooks/                      # Custom hooks
├── services/                   # API service, export, WhatsApp
├── tests/                      # Testes (unit + e2e)
│   ├── unit/                   # Vitest unit tests
│   └── e2e/                    # Playwright E2E
├── backend/                    # Migrations + scripts Supabase
│   ├── migrations/             # 016 SQL migrations
│   └── supabase/               # Stored procedures
├── types.ts                    # TypeScript types (15+ scheduling types)
└── docs/                       # Documentação técnica
```

---

## 📈 3. Histórico do Projeto e Atualizações

### Versão Atual
**Versão:** 5.1.0
**Status Geral de Conclusão:** ~85% Completo

### O que já foi implementado (Histórico de Sucesso)

**Core UI & UX:**
- Dashboard analítico avançado (donuts, charts de barra/linha)
- Kanban interativo com drag & drop
- Dark mode persistente
- Exportação (CSV, Excel, PDF)
- Toasts, loading states, modais de confirmação
- Importação de pacientes via Excel

**Backend & API:**
- Migração para Supabase com RLS em todas as tabelas
- 17+ grupos de API Routes (Next.js App Router)
- JWT Auth com validateAuthHeader padrão
- Validação com Zod schemas

**Funcionalidades de Negócio:**
- Busca ativa com filtros complexos
- CRUD de pacientes/oportunidades com histórico
- Cálculo de métricas (conversão, lucro potencial)
- Pipeline Kanban com etapas customizáveis
- Sistema de campanhas de mensagens em massa

**Agente de IA Dental Especialista (v5.0):**
- System prompt especializado em odontologia (Pipeline: Saudação → Triagem → Agendamento → Confirmação → Pós-consulta → Fidelização)
- Regras de segurança: nunca diagnosticar, nunca prescrever, nunca inventar preços/horários
- Detecção de emergência (dor aguda → pronto-socorro)
- Vocabulário dental correto ("consulta", "paciente", "Dr./Dra.")
- Fallback automático OpenAI → Anthropic Claude
- Handoff para atendente humano quando necessário
- Humanização: delays de digitação, chunks de mensagem, simulação de tempo de leitura

**Sistema de Agendamento de Consultas (v5.0):**
- 7 tabelas de banco (dentists, schedule_config, schedule_blocks, appointments, appointment_history, appointment_reminders, calendar_integrations)
- 8 API routes (dentists CRUD, appointments CRUD, available-slots, schedule-blocks)
- Cálculo inteligente de slots disponíveis (respeita config semanal, bloqueios, consultas existentes)
- AgendaPage com 3 visualizações: Dia, Semana e Mês
- Gerenciamento de dentistas (nome, especialidade, CRM, cor no calendário)
- Lembretes automáticos (24h e 2h antes da consulta)
- Rastreamento de origem: manual (UI), agent (IA WhatsApp), online (futuro)
- Histórico completo de mudanças de status

**Booking via Agente IA:**
- Agente detecta intenção de agendamento na conversa
- Consulta slots disponíveis em tempo real
- Emite tags estruturadas: `[BOOKING_REQUEST]` e `[RESCHEDULE_REQUEST]`
- process-incoming.ts cria appointment automaticamente no banco
- Cria lembretes de 24h e 2h antes
- Suporta remarcação com cancelamento automático da consulta anterior

**Integração WhatsApp Multi-Provider:**
- Evolution API (self-hosted)
- Meta Cloud API (oficial)
- Z-API
- Webhook unificado para recepção de mensagens
- Normalização de números de telefone (BR)

**Calendar Sync:**
- Adapter pattern com interface ICalendarProvider
- ICalProvider: importação de URLs ICS de qualquer software odontológico
- GoogleCalendarProvider: integração read-only via Google Calendar API
- Sincronização configura bloqueios automáticos na agenda interna

**Testes:**
- 63 testes unitários passando (Vitest)
- Cobertura: agent-response, scheduling tags, humanizer, calendar-sync, normalize-phone, excel-parser, debounce, toast
- Setup Playwright para testes E2E

### Mudanças Arquiteturais Importantes
1. **Prisma para Supabase:** A arquitetura do banco de dados migrou do Prisma/Neon para o Supabase direto com RLS nativo.
2. **Express para Next.js App Router:** O backend migrou de Express standalone para Next.js API Routes, eliminando a necessidade de servidor separado.
3. **Agente IA Integrado:** O atendimento via WhatsApp foi integrado diretamente no sistema com pipeline de processamento (process-incoming → agent-response → booking).
4. **Multi-Provider WhatsApp:** Suporte a 3 provedores (Evolution API, Meta Cloud, Z-API) com adapter pattern.

---

## 🚧 4. Status Atual (Nível Funcional)

| Área | Status | Progresso |
|------|--------|-----------|
| Frontend Core | 🟢 | 98% |
| UX/UI | 🟢 | 95% |
| Backend & Integração | 🟢 | 95% |
| WhatsApp & Agente IA | 🟢 | 95% |
| Agendamento | 🟢 | 90% |
| Calendar Sync | 🟡 | 80% |
| Analytics | 🟡 | 80% |
| Segurança | 🟡 | 85% |
| Testes & QA | 🟡 | 60% |
| DevOps & Deploy | 🟡 | 50% |

### O que falta para 100%
- **Calendar Sync:** UI de configuração no modal de dentista, cron de sincronização periódica
- **Analytics:** Funil avançado de oportunidades, heatmaps de conversão
- **Segurança:** 2FA, rate limiting via middleware, CSP headers avançados
- **Testes:** Corrigir 35 testes pré-existentes (apiService, useDarkMode, useNotifications), ampliar cobertura E2E
- **DevOps:** CI/CD pipeline, staging environment, monitoring (Sentry)

---

## 🚀 5. Roadmap e Próximos Passos

### Fase 1: Estabilização & Deploy (Prioridade CRÍTICA) ✅ Parcial
- [x] Build do Next.js compila com sucesso
- [x] TypeScript type-check passa sem erros
- [x] Reativar `typescript.ignoreBuildErrors: false` e `eslint.ignoreDuringBuilds: false` no `next.config.mjs`
- [x] Otimizar imagens (remover `images: { unoptimized: true }`)
- [ ] Executar migration 016 no Supabase (7 tabelas de agendamento)
- [ ] Executar migration 017 no Supabase (notifications user_id + audit_logs)
- [ ] Configurar variáveis de ambiente na Vercel
- [ ] Teste manual completo: login → agenda → agendar consulta → booking via IA
- [ ] Deploy oficial em produção

### Fase 2: Testes & Qualidade (Prioridade Alta)
- [x] Corrigir testes unitários (apiService, useNotifications) para usar exports reais
- [x] Excluir `backend/tests/` do Vitest (rodavam com DB e falhavam sem env vars)
- [ ] Rodar suite completa: `npm run test` — validar todos os testes passam
- [ ] Criar testes para API Routes críticas (appointments, dentists, available-slots)
- [ ] Expandir E2E: `tests/e2e/agenda.spec.ts`, `tests/e2e/agent-config.spec.ts`
- [ ] Atingir cobertura ≥ 70% (`npm run test:coverage`)

### Fase 3: Features Faltantes (Prioridade Média-Alta)
- [x] API REST de Notificações (`/api/notifications` — GET, POST, PATCH, DELETE, mark-all-read)
- [x] Cron Job de Calendar Sync (`/api/cron/calendar-sync` — Vercel Cron 15min)
- [ ] UI de Calendar Sync no modal de dentista
- [ ] Relatórios PDF avançados (gráficos, funil visual)
- [ ] Portal público de agendamento (`/booking/[clinic-slug]`)

### Fase 4: Segurança & Hardening (Prioridade Média)
- [x] Rate Limiting via `middleware.ts` (100 req/min API, 10 req/min auth)
- [x] CSP Headers avançados no `vercel.json`
- [x] Migration 017: tabela `audit_logs` para trilha de auditoria
- [ ] 2FA (TOTP) com QR Code para Google Authenticator
- [ ] Audit logging completo em ações críticas (login, CRUD pacientes, agendamentos)
- [ ] Validação Zod reforçada em todas as API routes restantes

### Fase 5: DevOps & CI/CD (Prioridade Média)
- [x] GitHub Actions CI Pipeline (`.github/workflows/ci.yml`): lint → typecheck → test → build
- [ ] Branch Protection em `main` (require PR review + CI pass)
- [ ] Staging Environment na Vercel (branch `staging` com auto-deploy)
- [ ] Monitoring com Sentry (`@sentry/nextjs`)
- [ ] Validar Docker build local completo

### Fase 6: Enterprise (Futuro)
- [ ] Múltiplas Clínicas / White Label SaaS
- [ ] PWA com Service Workers
- [ ] Dashboard de performance do agente IA
- [ ] Agendamento online pelo paciente (portal público avançado)

---

## 📝 6. Registro Contínuo de Alterações (Changelog)

### [2026-03-29] - v5.0.0 — Agente IA Dental + Agendamento + WhatsApp
- **Responsável:** AI Agent / Dev Team
- **Descrição:** Major release com 3 grandes features novas:

**Agente de IA Dental Especialista:**
- System prompt completo para odontologia (6 etapas do pipeline)
- Regras de segurança dental, detecção de emergência
- Fallback OpenAI → Anthropic Claude
- Humanização (delays, chunks, simulação de digitação)

**Sistema de Agendamento:**
- 7 novas tabelas no banco (migration 016)
- 8 novas API routes (dentists, appointments, available-slots, schedule-blocks)
- AgendaPage.tsx com visualizações Dia/Semana/Mês
- Booking automático via agente IA com tags estruturadas
- Lembretes automáticos (24h e 2h antes)
- ScheduleModal atualizado com seleção de dentista e slots

**WhatsApp Multi-Provider:**
- Suporte a Evolution API, Meta Cloud API, Z-API
- Webhook unificado + normalização de telefones BR

**Calendar Sync:**
- ICalProvider + GoogleCalendarProvider
- API de gerenciamento de integrações (CRUD)

**Testes:**
- 63 testes unitários passando (Vitest)
- Playwright configurado para E2E

**Correções:**
- 16 import paths corrigidos em 8 API routes
- Fix useRef para React 19 (AgendaPage)
- Fix tsconfig.json include para tests
- Fix implicit any em humanizer.test.ts
- Bump versão 0.0.0 → 5.0.0

### [2026-03-30] - v5.1.0 — Estabilização, Infraestrutura & Plano de Conclusão
- **Responsável:** AI Agent / Dev Team
- **Descrição:** Sessão focada em estabilizar build, criar infraestrutura faltante e planejar conclusão do projeto.

**Build & Config:**
- Reativado `typescript.ignoreBuildErrors: false` e `eslint.ignoreDuringBuilds: false` no `next.config.mjs`
- Habilitada otimização de imagens do Next.js (removido `unoptimized: true`)
- Adicionado `remotePatterns` para domínios Supabase

**Novas API Routes:**
- `app/api/notifications/route.ts` — GET (listar) e POST (criar) notificações
- `app/api/notifications/[id]/route.ts` — PATCH (marcar lida) e DELETE
- `app/api/notifications/mark-all-read/route.ts` — POST (marcar todas como lidas)
- `app/api/cron/calendar-sync/route.ts` — Vercel Cron Job (15min) para sincronizar calendários

**Segurança:**
- `middleware.ts` — Rate Limiting: 100 req/min API, 10 req/min auth, 200 req/min webhooks
- `vercel.json` — CSP Headers: `default-src 'self'`, domínios Supabase/OpenAI permitidos, `frame-ancestors 'none'`
- `vercel.json` — Cron job para calendar-sync a cada 15 minutos

**Banco de Dados:**
- `backend/migrations/017_notifications_audit_logs.sql` — Adiciona `user_id` à tabela `notifications` + cria tabela `audit_logs`

**DevOps:**
- `.github/workflows/ci.yml` — Pipeline CI: lint → typecheck → unit tests → E2E → build
- Artifacts: coverage report, Playwright report, build output

**Testes:**
- Corrigido `tests/unit/apiService.test.ts` — Alinhado com exports reais do `apiService.ts`
- Corrigido `tests/unit/useNotifications.test.ts` — Alinhado com `NotificationsProvider` (Socket.IO)
- Corrigido `vitest.config.ts` — Excluído `backend/` dos testes (rodavam sem env vars)

**Documentação:**
- Atualizado `HISTORICO_PROJETO.md` com status real (~85%), roadmap detalhado em 6 fases com checklist

### [Data anterior] - v4.1.0 — Criação do Documento Vivo
- **Responsável:** AI Agent / Dev Team
- **Descrição:** Criação do documento `HISTORICO_PROJETO.md` consolidando análises do projeto, stack técnica, resumo de status, histórico e roadmap. Documento preparado para versão 4.1.0 (Status 80%).

---

## ⚠️ 7. Problemas Conhecidos

| Problema | Severidade | Arquivo | Ação Necessária |
|----------|-----------|---------|----------------|
| Migration 016 não executada no Supabase | 🔴 Crítico | `backend/migrations/016_appointments_scheduling.sql` | Executar no SQL Editor do Supabase |
| Migration 017 não executada no Supabase | 🔴 Crítico | `backend/migrations/017_notifications_audit_logs.sql` | Executar no SQL Editor do Supabase |
| Env vars podem não estar na Vercel | 🟠 Alto | `.env.example` | Verificar e configurar na Vercel Dashboard |
| Cobertura de testes abaixo de 70% | 🟡 Médio | `vitest.config.ts` | Criar mais testes para API routes |
| Sem staging environment | 🟡 Médio | — | Criar branch `staging` com auto-deploy |
| Sem monitoring (Sentry) | 🟡 Médio | — | Instalar `@sentry/nextjs` |
| 2FA não implementado | 🟡 Médio | — | Implementar TOTP com `otplib` |

---
*Fim do Documento. Edite este arquivo para adicionar log das próximas sessões.*
