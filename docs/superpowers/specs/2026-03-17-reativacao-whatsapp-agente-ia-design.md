# Design Spec — Sistema de Reativação com Agente IA
**Projeto:** ClinicaFlow (Allo Oral Clinic)
**Data:** 2026-03-17
**Status:** Aprovado

---

## Visão Geral

Adicionar ao ClinicaFlow três capacidades integradas:
1. Importar base de pacientes do Excel e gerenciar campanhas de reativação via WhatsApp
2. Agente IA passivo que responde automaticamente quando o paciente responde à mensagem
3. UI de configuração do agente por clínica (nome, tom, instruções, habilitar/desabilitar)

Suporte a dois providers WhatsApp: **Evolution API** e **WhatsApp Business Cloud (Meta oficial)**.

---

## Fonte de Dados Inicial

**Arquivo:** `Agendamentos_Consolidados_Padronizado.xlsx`
**Sheet:** `Agendamentos Consolidados`
**Colunas:** Nome do Paciente, Categoria, Nome do Dentista, Telefone Celular, Observações
**Volume:** 4.251 linhas
**Categorias (26):** Consulta, Prótese, Dentística, Urgência, Retorno, Cirurgia, Implante Cirúrgico, etc.
**Dentistas (7):** Felipe Maranhão de Oliveira, Jamesson de Oliveira Maciel Filho, Felipe Cisneiros, etc.

---

## Arquitetura

### Camada WhatsApp (multi-provider)

```
IWhatsAppProvider (interface — já existe)
  ├── EvolutionProvider   → Evolution API
  └── MetaProvider        → WhatsApp Business Cloud API (Meta)

ProviderFactory.create(config) → retorna provider correto
```

Todos os módulos usam exclusivamente a interface — nunca chamam providers diretamente.

### Rotas de webhook (uma por provider)

```
POST /api/webhook/whatsapp/evolution  → formato payload Evolution API
POST /api/webhook/whatsapp/meta       → GET verify token + POST mensagens Meta
```

### Módulos

```
Módulo 1 — Importação de Pacientes
  ├── Migration DB (novos campos em patients)
  ├── Script de importação Excel → Supabase
  └── UI: lista de pacientes com filtros

Módulo 2 — Gerenciador de Campanhas
  ├── Tabelas: campaigns + campaign_patients
  ├── Geração de mensagem personalizada por IA (OpenAI)
  ├── Disparo em lote via provider configurado
  └── UI: criação, preview, histórico de campanhas

Módulo 3 — Agente IA Passivo
  ├── Webhook receiver (Evolution + Meta)
  ├── Engine: contexto + OpenAI + resposta humanizada
  ├── Tabelas: agent_conversations + agent_messages
  └── Humanização: delay 3-7s + typing indicator (Evolution only)

Módulo 4 — Configuração do Agente (UI)
  ├── Aba "Agente IA" nas Configurações
  ├── Campos: nome, clínica, especialidades, tom, instruções custom
  ├── Toggle habilitar/desabilitar
  └── Stored em user_settings.agent_config (JSONB)
```

---

## Schema de Banco de Dados

### Extensões na tabela `patients` (migration 012)

```sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS dentist_name VARCHAR(150);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual'; -- 'excel_import' | 'manual'
ALTER TABLE patients ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE;
```

### Nova tabela `campaigns`

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- draft | sending | completed | paused
  total_patients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  message_template TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);
```

### Nova tabela `campaign_patients`

```sql
CREATE TABLE campaign_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  personalized_message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending | sent | failed | replied
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  whatsapp_message_id VARCHAR(200)
);
```

### Nova tabela `agent_conversations`

```sql
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_phone VARCHAR(20) NOT NULL,
  patient_id UUID REFERENCES patients(id),
  campaign_patient_id UUID REFERENCES campaign_patients(id),
  status VARCHAR(50) DEFAULT 'active', -- active | closed | escalated
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, patient_phone)
);
```

### Nova tabela `agent_messages`

```sql
CREATE TABLE agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- patient | agent | system
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Extensão em `user_settings` (migration 013)

```sql
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS agent_config JSONB DEFAULT '{}';
-- Estrutura do agent_config:
-- {
--   "enabled": boolean,
--   "name": string,           -- Nome do agente (ex: "Ana")
--   "clinic_name": string,    -- Nome da clínica
--   "specialties": string[],  -- Especialidades
--   "tone": "formal"|"normal"|"descontraido",
--   "custom_instructions": string,
--   "openai_model": string,   -- default: "gpt-4o"
--   "max_context_messages": number  -- default: 20
-- }
```

---

## API Routes

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/patients` | Listar pacientes (com filtros: category, dentist, search) |
| POST | `/api/patients/import` | Importar pacientes do Excel (upload) |
| GET | `/api/campaigns` | Listar campanhas |
| POST | `/api/campaigns` | Criar campanha |
| POST | `/api/campaigns/[id]/generate-messages` | Gerar mensagens personalizadas via IA |
| POST | `/api/campaigns/[id]/send` | Disparar campanha |
| GET | `/api/campaigns/[id]` | Detalhe da campanha + status por paciente |
| POST | `/api/webhook/whatsapp/evolution` | Webhook Evolution API |
| GET/POST | `/api/webhook/whatsapp/meta` | Webhook Meta Cloud API |
| GET | `/api/agent/conversations` | Listar conversas do agente |
| GET | `/api/agent/config` | Buscar config do agente |
| PUT | `/api/agent/config` | Salvar config do agente |

---

## Fluxo de Campanha (Módulo 2)

```
1. Usuário abre "Nova Campanha"
2. Seleciona pacientes (filtros por categoria, dentista, busca)
3. Clica "Gerar Mensagens com IA"
   → POST /api/campaigns/[id]/generate-messages
   → OpenAI gera mensagem personalizada por paciente
     (input: nome, categoria, dentista, observações + tom da clínica)
4. Preview das mensagens (amostra de 5 + navegação)
5. Confirmação → POST /api/campaigns/[id]/send
   → Loop com delay 1.5s entre mensagens
   → Usa provider configurado (Evolution ou Meta)
   → Registra status em campaign_patients
6. Resultado: enviados X / falhas Y
```

## Fluxo do Agente (Módulo 3)

```
1. Paciente responde mensagem no WhatsApp
2. Evolution API / Meta envia webhook
3. POST /api/webhook/whatsapp/[provider]
4. Identifica paciente pelo telefone
5. Busca/cria agent_conversation
6. Verifica: agente habilitado? (user_settings.agent_config.enabled)
7. Monta contexto: system prompt + últimas 20 msgs + dados do paciente
8. Chama OpenAI gpt-4o
9. Delay humanizado (3-7s) + typing indicator (só Evolution)
10. Envia resposta via provider
11. Salva mensagem em agent_messages
```

---

## System Prompt do Agente (template base)

```
Você é [nome_agente], recepcionista virtual da [nome_clinica].
Sua função é atender pacientes que responderam a uma mensagem de reativação.

Especialidades: [especialidades]
Tom: [tom_configurado]

[instrucoes_custom]

Regras:
- NUNCA marque consultas sem confirmar disponibilidade com a equipe
- NUNCA dê diagnósticos ou opiniões clínicas
- Ao identificar interesse em agendar → pergunte: nome completo, melhor horário, dentista de preferência
- Se paciente solicitar falar com humano → encerre com: "Vou transferir para nossa equipe. Em breve entraremos em contato!"
- Responda em português brasileiro, mensagens curtas (máx 300 caracteres por bloco)
- Não use markdown, bullet points ou formatação de relatório

Contexto do paciente:
- Nome: [patient_name]
- Último procedimento: [category]
- Dentista: [dentist_name]
- Observações: [observations]
```

---

## UI — Novas Telas

### 1. Aba "Pacientes" (expandida)
- Tabela com: Nome, Telefone, Categoria, Dentista, Observações, Status
- Filtros: busca por nome, dropdown categoria, dropdown dentista
- Botão "Importar Excel" → upload do arquivo
- Botão "Nova Campanha" (com pacientes selecionados)
- Paginação (50 por página)

### 2. Página / Modal "Campanhas"
- Lista de campanhas com status (rascunho, enviando, concluída)
- Botão "Nova Campanha" → wizard 4 etapas:
  1. Selecionar pacientes
  2. Gerar mensagens com IA (ou usar template manual)
  3. Preview
  4. Enviar
- Detalhe da campanha: progresso + tabela paciente × status × mensagem

### 3. Aba "Agente IA" (Settings)
- Toggle habilitar/desabilitar
- Nome do agente
- Nome da clínica
- Especialidades (chips/tags)
- Tom de voz (radio: Formal / Normal / Descontraído)
- Instruções personalizadas (textarea)
- Seção "Webhook" → URL para configurar na Evolution/Meta
- Preview do system prompt gerado

---

## Dependências e Env Vars Necessárias

```bash
# Já existentes
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=

# Meta (se usar API Oficial)
WHATSAPP_CLOUD_TOKEN=        # Access Token
WHATSAPP_PHONE_NUMBER_ID=    # Phone Number ID
WHATSAPP_WEBHOOK_VERIFY_TOKEN= # Token de verificação do webhook

# OpenAI (para geração de mensagens + agente)
OPENAI_API_KEY=

# Supabase (já existente)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Plugin IntelliX — Ativação

Adicionar ao `.claude/settings.json` do projeto:
```json
{
  "plugins": [
    { "type": "local", "path": "C:/Users/Dell/.claude/plugins/intellix-plugin" }
  ]
}
```

Skills aplicáveis:
- **Fase 02** (`intellix-agent-creation`) → blueprint do agente IA passivo
- **Fase 04** (`intellix-integration-playbook`) → padrões Evolution API + Meta webhook

---

## Ordem de Implementação

```
Fase 1: DB + Importação
  → Migration 012 (patients) + Migration 013 (user_settings)
  → Tabelas campaigns, campaign_patients, agent_conversations, agent_messages
  → Script de importação Excel
  → UI lista de pacientes com filtros + import

Fase 2: Campanhas
  → API routes /campaigns + /campaigns/[id]/*
  → OpenAI: geração de mensagens personalizadas
  → Wizard de campanha (UI)
  → Disparo multi-provider + logs

Fase 3: Agente Passivo
  → Webhook Evolution + Meta
  → Engine do agente (contexto + OpenAI + humanização)
  → Persistência de conversas

Fase 4: Config UI do Agente
  → Aba "Agente IA" nas Settings
  → Toggle + campos de configuração
  → Preview do system prompt
```
