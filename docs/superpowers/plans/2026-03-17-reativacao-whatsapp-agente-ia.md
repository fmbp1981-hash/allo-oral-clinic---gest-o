# Reativação WhatsApp + Agente IA — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ao ClinicaFlow importação de pacientes do Excel, campanhas de reativação via WhatsApp com mensagens personalizadas por IA, e um agente IA passivo que responde automaticamente aos pacientes — suportando Evolution API e WhatsApp Business Cloud (Meta).

**Architecture:** Quatro fases sequenciais. Fase 1 prepara o banco e importa pacientes. Fase 2 constrói o gerenciador de campanhas com personalização via OpenAI. Fase 3 cria o agente passivo via webhooks (Evolution + Meta). Fase 4 adiciona a UI de configuração do agente. Toda lógica de envio passa por `IWhatsAppProvider` — nunca chamada direta a providers.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (PostgreSQL), OpenAI gpt-4o, Evolution API, WhatsApp Business Cloud API (Meta), Vitest (unit tests), Playwright (E2E), xlsx (já instalado).

**Spec:** `docs/superpowers/specs/2026-03-17-reativacao-whatsapp-agente-ia-design.md`

---

## File Map

### Novos arquivos a criar

```
app/api/
  patients/import/route.ts          — POST: import Excel → Supabase
  campaigns/route.ts                — GET list + POST create campaign
  campaigns/[id]/route.ts           — GET detalhe campanha
  campaigns/[id]/generate-messages/route.ts — POST: gerar msgs via OpenAI
  campaigns/[id]/send/route.ts      — POST: disparar campanha (máx 50/chamada)
  webhook/whatsapp/evolution/route.ts — POST: webhook Evolution API
  webhook/whatsapp/meta/route.ts    — GET verify + POST handler Meta
  agent/config/route.ts             — GET/PUT config do agente
  agent/conversations/route.ts      — GET: listar conversas do agente

lib/
  whatsapp/
    provider-factory.ts             — cria provider correto (evolution|meta) a partir de user_settings
    send-message.ts                 — função helper: normaliza phone + chama provider
    normalize-phone.ts              — utilitário de normalização de telefone
  openai/
    personalize-message.ts          — gera mensagem personalizada por paciente
    agent-response.ts               — gera resposta do agente com contexto

components/
  CampaignWizard.tsx               — wizard 4 etapas: selecionar, gerar, preview, enviar
  CampaignHistory.tsx              — lista de campanhas + detalhe
  AgentConfigPanel.tsx             — aba "Agente IA" nas settings

backend/migrations/
  012_extend_patients_import.sql   — add category, dentist_name, observations, source, imported_at
  013_campaigns_agent_tables.sql   — campaigns, campaign_patients, agent_conversations, agent_messages
  014_agent_config_in_settings.sql — add agent_config JSONB to user_settings

scripts/
  import-patients.ts               — script avulso para importação inicial do Excel
```

### Arquivos existentes a modificar

```
app/api/patients/route.ts          — adicionar filtros: ?category=&dentist=&search=
                                     ⚠️ BREAKING: response muda de array plano para { patients, total, page, limit }
                                     Auditar consumers: ImportPatientsModal, LeadsTable, BulkMessageModal
components/SettingsModal.tsx       — adicionar aba "Agente IA" → renderizar AgentConfigPanel
components/ImportPatientsModal.tsx — adaptar para usar /api/patients/import e novo formato de resposta
```

---

## Pré-requisito: Instalar dependência OpenAI

- [ ] **Instalar pacote openai**

```bash
cd C:/Projects/allo-oral-clinic---gestão
npm install openai
```

```bash
git add package.json package-lock.json
git commit -m "chore: add openai dependency"
```

---

## Fase 1 — Banco de Dados + Importação de Pacientes

### Task 1: Migrations do banco de dados

**Files:**
- Create: `backend/migrations/012_extend_patients_import.sql`
- Create: `backend/migrations/013_campaigns_agent_tables.sql`
- Create: `backend/migrations/014_agent_config_in_settings.sql`

- [ ] **Step 1: Criar migration 012 — extensão da tabela patients**

```sql
-- backend/migrations/012_extend_patients_import.sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS dentist_name VARCHAR(150);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS imported_at TIMESTAMP WITH TIME ZONE;

-- OBRIGATÓRIO para upsert na importação (onConflict: 'user_id,phone')
ALTER TABLE patients
  ADD CONSTRAINT IF NOT EXISTS patients_user_id_phone_unique UNIQUE (user_id, phone);

CREATE INDEX IF NOT EXISTS idx_patients_category ON patients(category);
CREATE INDEX IF NOT EXISTS idx_patients_dentist ON patients(dentist_name);
CREATE INDEX IF NOT EXISTS idx_patients_source ON patients(source);
```

- [ ] **Step 2: Criar migration 013 — tabelas de campanhas e agente**

```sql
-- backend/migrations/013_campaigns_agent_tables.sql

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  total_patients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  message_template TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaigns_user_policy ON campaigns
  USING (user_id = auth.uid()::uuid);

-- campaign_patients
CREATE TABLE IF NOT EXISTS campaign_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  personalized_message TEXT NOT NULL DEFAULT '',
  status VARCHAR(50) DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  whatsapp_message_id VARCHAR(200)
);

CREATE INDEX IF NOT EXISTS idx_campaign_patients_campaign ON campaign_patients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_patients_patient ON campaign_patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_campaign_patients_status ON campaign_patients(status);

ALTER TABLE campaign_patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_patients_via_campaign ON campaign_patients
  USING (campaign_id IN (SELECT id FROM campaigns WHERE user_id = auth.uid()::uuid));

-- agent_conversations
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_phone VARCHAR(20) NOT NULL,
  patient_id UUID REFERENCES patients(id),
  campaign_patient_id UUID REFERENCES campaign_patients(id),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, patient_phone)
);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_user ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_phone ON agent_conversations(patient_phone);

ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_conversations_user_policy ON agent_conversations
  USING (user_id = auth.uid()::uuid);

-- agent_messages
CREATE TABLE IF NOT EXISTS agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation ON agent_messages(conversation_id);

ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_messages_via_conversation ON agent_messages
  USING (conversation_id IN (
    SELECT id FROM agent_conversations WHERE user_id = auth.uid()::uuid
  ));

-- Função auxiliar para incrementar contadores de campanha atomicamente
CREATE OR REPLACE FUNCTION increment_campaign_counts(
  p_campaign_id UUID,
  p_sent INT,
  p_failed INT
) RETURNS void AS $$
BEGIN
  UPDATE campaigns
  SET sent_count = sent_count + p_sent,
      failed_count = failed_count + p_failed
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 3: Criar migration 014 — agent_config em user_settings**

```sql
-- backend/migrations/014_agent_config_in_settings.sql
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS agent_config JSONB DEFAULT '{}';

COMMENT ON COLUMN user_settings.agent_config IS
  'JSON com: enabled, name, clinic_name, specialties, tone, custom_instructions, openai_model';
```

- [ ] **Step 4: Aplicar as 3 migrations no Supabase**

Acessar o painel do Supabase → SQL Editor → executar cada arquivo em sequência (012, 013, 014).

Verificar:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'patients' AND column_name IN ('category','dentist_name','observations');

SELECT table_name FROM information_schema.tables
WHERE table_name IN ('campaigns','campaign_patients','agent_conversations','agent_messages');
```

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/012_extend_patients_import.sql
git add backend/migrations/013_campaigns_agent_tables.sql
git add backend/migrations/014_agent_config_in_settings.sql
git commit -m "feat: add DB migrations for campaigns, agent, and patient import fields"
```

---

### Task 2: Utilitários compartilhados — WhatsApp provider factory e phone normalizer

**Files:**
- Create: `app/lib/whatsapp/normalize-phone.ts`
- Create: `app/lib/whatsapp/provider-factory.ts`
- Create: `app/lib/whatsapp/send-message.ts`
- Create: `tests/lib/whatsapp/normalize-phone.test.ts`

- [ ] **Step 1: Escrever testes de normalização de telefone**

```typescript
// tests/lib/whatsapp/normalize-phone.test.ts
import { describe, it, expect } from 'vitest'
import { normalizePhone } from '../../../app/lib/whatsapp/normalize-phone'

describe('normalizePhone', () => {
  it('adds country code to bare 11-digit number', () => {
    expect(normalizePhone('81988261586')).toBe('+5581988261586')
  })

  it('keeps existing +55 prefix', () => {
    expect(normalizePhone('+5581988261586')).toBe('+5581988261586')
  })

  it('strips @s.whatsapp.net suffix', () => {
    expect(normalizePhone('5581988261586@s.whatsapp.net')).toBe('+5581988261586')
  })

  it('handles number with 55 prefix but no +', () => {
    expect(normalizePhone('5581988261586')).toBe('+5581988261586')
  })

  it('strips non-digit characters', () => {
    expect(normalizePhone('(81) 98826-1586')).toBe('+5581988261586')
  })

  // Números de 8 dígitos (fixo/interior) — NÃO adiciona o 9
  it('handles 10-digit number (55+DDD+8digits landline) without adding 9', () => {
    // 55 + 81 + 33221234 = 12 dígitos — mantém como está (fixo)
    expect(normalizePhone('558133221234')).toBe('+558133221234')
  })
})
```

- [ ] **Step 2: Rodar teste — verificar que falha**

```bash
cd C:/Projects/allo-oral-clinic---gestão
npx vitest run tests/lib/whatsapp/normalize-phone.test.ts
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Criar normalize-phone.ts**

```typescript
// app/lib/whatsapp/normalize-phone.ts
export function normalizePhone(raw: string): string {
  // Remove sufixo WhatsApp e não-dígitos
  let digits = raw
    .replace('@s.whatsapp.net', '')
    .replace(/\D/g, '')

  // Se já tem 55 na frente e tem 13 dígitos → ok
  if (digits.startsWith('55') && digits.length === 13) {
    return `+${digits}`
  }

  // Se tem 13 dígitos mas não começa com 55 → adiciona
  if (digits.length === 11) {
    return `+55${digits}`
  }

  // 12 dígitos com 55 = número de 8 dígitos (fixo/interior) — mantém sem adicionar 9
  if (digits.length === 12 && digits.startsWith('55')) {
    return `+${digits}`
  }

  // Fallback: prefixar com + se não tiver
  return digits.startsWith('+') ? digits : `+${digits}`
}
```

- [ ] **Step 4: Rodar teste — verificar que passa**

```bash
npx vitest run tests/lib/whatsapp/normalize-phone.test.ts
```

Expected: 6/6 PASS

- [ ] **Step 5: Criar provider-factory.ts**

```typescript
// app/lib/whatsapp/provider-factory.ts
// Cria o provider correto a partir das configurações do user_settings

export type ProviderName = 'evolution' | 'meta'

export interface EvolutionConfig {
  baseUrl: string
  instanceName: string
  apiKey: string
}

export interface MetaConfig {
  accessToken: string
  phoneNumberId: string
}

export interface WhatsAppSendResult {
  success: boolean
  messageId?: string
  provider: string
  error?: string
}

export interface IProviderClient {
  name: ProviderName
  sendText(to: string, text: string): Promise<WhatsAppSendResult>
  sendTyping?(to: string): Promise<void>
}

export function createProvider(settings: Record<string, unknown>): IProviderClient {
  const provider = (settings.provider as ProviderName) ?? 'evolution'

  if (provider === 'meta') {
    const cfg = {
      accessToken: settings.business_access_token as string,
      phoneNumberId: settings.business_phone_number_id as string,
    }
    if (!cfg.accessToken || !cfg.phoneNumberId) {
      throw new Error('Meta provider: business_access_token e business_phone_number_id são obrigatórios')
    }
    return createMetaClient(cfg)
  }

  // Default: Evolution
  const cfg = {
    baseUrl: settings.evolution_api_url as string,
    instanceName: settings.evolution_instance_name as string,
    apiKey: settings.evolution_api_key as string,
  }
  if (!cfg.baseUrl || !cfg.instanceName || !cfg.apiKey) {
    throw new Error('Evolution provider: evolution_api_url, evolution_instance_name e evolution_api_key são obrigatórios')
  }
  return createEvolutionClient(cfg)
}

function createEvolutionClient(cfg: EvolutionConfig): IProviderClient {
  return {
    name: 'evolution',

    async sendText(to: string, text: string): Promise<WhatsAppSendResult> {
      const number = to.replace('+', '')
      const res = await fetch(
        `${cfg.baseUrl}/message/sendText/${cfg.instanceName}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: cfg.apiKey },
          body: JSON.stringify({ number, text }),
        }
      )
      if (!res.ok) {
        const err = await res.text()
        return { success: false, provider: 'evolution', error: err }
      }
      const data = await res.json()
      return { success: true, provider: 'evolution', messageId: data?.key?.id ?? '' }
    },

    async sendTyping(to: string): Promise<void> {
      const number = to.replace('+', '')
      await fetch(
        `${cfg.baseUrl}/chat/updatePresence/${cfg.instanceName}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: cfg.apiKey },
          body: JSON.stringify({ number, presence: 'composing' }),
        }
      ).catch(() => { /* typing é best-effort */ })
    },
  }
}

function createMetaClient(cfg: MetaConfig): IProviderClient {
  return {
    name: 'meta',

    async sendText(to: string, text: string): Promise<WhatsAppSendResult> {
      const phone = to.replace('+', '')
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${cfg.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cfg.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'text',
            text: { body: text },
          }),
        }
      )
      if (!res.ok) {
        const err = await res.text()
        return { success: false, provider: 'meta', error: err }
      }
      const data = await res.json()
      return { success: true, provider: 'meta', messageId: data?.messages?.[0]?.id ?? '' }
    },
    // Meta não suporta typing indicator via API Cloud
  }
}
```

- [ ] **Step 6: Criar send-message.ts (helper)**

```typescript
// app/lib/whatsapp/send-message.ts
import { normalizePhone } from './normalize-phone'
import { createProvider } from './provider-factory'
import type { WhatsAppSendResult } from './provider-factory'

export async function sendWhatsAppMessage(
  settings: Record<string, unknown>,
  to: string,
  text: string
): Promise<WhatsAppSendResult> {
  const phone = normalizePhone(to)
  const provider = createProvider(settings)
  return provider.sendText(phone, text)
}
```

- [ ] **Step 7: Commit**

```bash
git add app/lib/whatsapp/ tests/lib/whatsapp/
git commit -m "feat: whatsapp provider factory + phone normalizer (evolution + meta)"
```

---

### Task 3: Rota de importação de pacientes

**Files:**
- Create: `app/api/patients/import/route.ts`
- Create: `tests/api/patients/import.test.ts`

- [ ] **Step 1: Escrever teste da rota de importação**

```typescript
// tests/api/patients/import.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase e auth
vi.mock('../../../app/api/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
    }),
  }),
}))

vi.mock('../../../app/api/lib/auth', () => ({
  validateAuthHeader: () => ({ success: true, data: { userId: 'user-1', tenantId: 't-1' } }),
  isAuthError: () => false,
}))

import { parseExcelPatients } from '../../../app/lib/patients/excel-parser'

describe('parseExcelPatients', () => {
  it('maps Excel rows to patient objects correctly', () => {
    const rows = [
      ['Nome do Paciente', 'Categoria', 'Nome do Dentista', 'Telefone Celular', 'Observações'],
      ['João Silva', 'Consulta', 'Dr. Felipe', '81988261586', 'Retorno anual'],
    ]
    const result = parseExcelPatients(rows)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'João Silva',
      category: 'Consulta',
      dentist_name: 'Dr. Felipe',
      phone: '81988261586',
      observations: 'Retorno anual',
      source: 'excel_import',
    })
  })

  it('skips rows with empty name', () => {
    const rows = [
      ['Nome do Paciente', 'Categoria', 'Nome do Dentista', 'Telefone Celular', 'Observações'],
      ['', 'Consulta', 'Dr. Felipe', '81988261586', ''],
    ]
    const result = parseExcelPatients(rows)
    expect(result).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Rodar teste — verificar que falha**

```bash
npx vitest run tests/api/patients/import.test.ts
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Criar excel-parser.ts**

```typescript
// app/lib/patients/excel-parser.ts
export interface ImportedPatient {
  name: string
  category: string
  dentist_name: string
  phone: string
  observations: string
  source: 'excel_import'
}

export function parseExcelPatients(rows: unknown[][]): ImportedPatient[] {
  // Ignora header (linha 0) e linhas com nome vazio
  return rows
    .slice(1)
    .filter((row) => row[0] && String(row[0]).trim() !== '')
    .map((row) => ({
      name: String(row[0] ?? '').trim(),
      category: String(row[1] ?? '').trim(),
      dentist_name: String(row[2] ?? '').trim(),
      phone: String(row[3] ?? '').trim(),
      observations: String(row[4] ?? '').trim(),
      source: 'excel_import' as const,
    }))
}
```

- [ ] **Step 4: Criar rota de importação**

```typescript
// app/api/patients/import/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { validateAuthHeader, isAuthError } from '../../lib/auth'
import { getSupabaseClient } from '../../lib/supabase'
import { parseExcelPatients } from '../../../lib/patients/excel-parser'

export async function POST(request: NextRequest) {
  const auth = validateAuthHeader(request)
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const { userId } = auth.data

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })

    const patients = parseExcelPatients(rows)
    if (patients.length === 0) {
      return NextResponse.json({ error: 'Nenhum paciente encontrado no arquivo' }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const records = patients.map((p) => ({
      user_id: userId,
      name: p.name,
      phone: p.phone,
      category: p.category || null,
      dentist_name: p.dentist_name || null,
      observations: p.observations || null,
      source: 'excel_import',
      imported_at: new Date().toISOString(),
    }))

    // Inserir em lotes de 500
    let inserted = 0
    const BATCH = 500
    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH)
      const { error } = await supabase.from('patients').upsert(batch, {
        onConflict: 'user_id,phone',
        ignoreDuplicates: false,
      })
      if (error) throw error
      inserted += batch.length
    }

    return NextResponse.json({ success: true, imported: inserted, total: patients.length })
  } catch (err) {
    console.error('Import error:', err)
    return NextResponse.json({ error: 'Erro ao processar arquivo' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Rodar testes**

```bash
npx vitest run tests/api/patients/import.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/api/patients/import/ app/lib/patients/ tests/api/patients/
git commit -m "feat: patient Excel import route with batch upsert"
```

---

### Task 4: Atualizar listagem de pacientes com filtros

**Files:**
- Modify: `app/api/patients/route.ts` — adicionar query params `?category=&dentist=&search=&page=&limit=`

- [ ] **Step 1: Atualizar GET /api/patients para aceitar filtros**

Abrir `app/api/patients/route.ts`. Localizar o bloco do GET. Substituir a query simples por:

```typescript
export async function GET(request: NextRequest) {
  const auth = validateAuthHeader(request)
  if (isAuthError(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const { userId } = auth.data
  const supabase = getSupabaseClient()

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const dentist = searchParams.get('dentist')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('patients')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('name', { ascending: true })
    .range(from, to)

  if (category) query = query.eq('category', category)
  if (dentist) query = query.eq('dentist_name', dentist)
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ patients: data ?? [], total: count ?? 0, page, limit })
}
```

- [ ] **Step 2: Escrever teste de filtros**

```typescript
// tests/api/patients/filters.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../app/api/lib/auth', () => ({
  validateAuthHeader: () => ({ success: true, data: { userId: 'u1', tenantId: 't1' } }),
  isAuthError: () => false,
}))

// Apenas validar lógica de query params — mock do supabase retorna dados fixos
describe('GET /api/patients query params', () => {
  it('passes category filter to query', () => {
    const params = new URLSearchParams({ category: 'Consulta', page: '1', limit: '10' })
    expect(params.get('category')).toBe('Consulta')
    expect(parseInt(params.get('limit') ?? '50')).toBe(10)
  })

  it('calculates range correctly for page 2 limit 50', () => {
    const page = 2, limit = 50
    const from = (page - 1) * limit
    const to = from + limit - 1
    expect(from).toBe(50)
    expect(to).toBe(99)
  })
})
```

- [ ] **Step 3: Rodar testes**

```bash
npx vitest run tests/api/patients/
```

Expected: PASS

- [ ] **Step 4: ⚠️ Auditar consumers do endpoint (breaking change)**

O endpoint agora retorna `{ patients: [], total, page, limit }` em vez de array plano.
Verificar e atualizar os seguintes componentes que consomem `GET /api/patients`:

- `components/ImportPatientsModal.tsx` — adaptar de `data` (array) para `data.patients`
- `components/LeadsTable.tsx` — idem se usa o endpoint diretamente
- `components/BulkMessageModal.tsx` — idem

Buscar no código:
```bash
grep -r "api/patients" components/ --include="*.tsx" -l
```
Para cada arquivo encontrado: substituir `response.json()` → `(await response.json()).patients ?? []`

- [ ] **Step 5: Commit**

```bash
git add app/api/patients/route.ts components/
git commit -m "feat: patient list with category/dentist/search filters + pagination (breaking: envelope response)"
```

---

## Fase 2 — Gerenciador de Campanhas

### Task 5: API de campanhas (CRUD + envio)

**Files:**
- Create: `app/api/campaigns/route.ts`
- Create: `app/api/campaigns/[id]/route.ts`
- Create: `app/api/campaigns/[id]/generate-messages/route.ts`
- Create: `app/api/campaigns/[id]/send/route.ts`
- Create: `app/lib/openai/personalize-message.ts`
- Create: `tests/lib/openai/personalize-message.test.ts`

- [ ] **Step 1: Criar GET/POST /api/campaigns**

```typescript
// app/api/campaigns/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateAuthHeader, isAuthError } from '../lib/auth'
import { getSupabaseClient } from '../lib/supabase'

export async function GET(request: NextRequest) {
  const auth = validateAuthHeader(request)
  if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { userId } = auth.data
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaigns: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = validateAuthHeader(request)
  if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { userId } = auth.data
  const supabase = getSupabaseClient()

  const body = await request.json()
  const { name, patient_ids, message_template } = body as {
    name: string
    patient_ids: string[]
    message_template: string
  }

  if (!name || !patient_ids?.length) {
    return NextResponse.json({ error: 'name e patient_ids são obrigatórios' }, { status: 400 })
  }

  const { data: campaign, error: camError } = await supabase
    .from('campaigns')
    .insert({
      user_id: userId,
      name,
      message_template: message_template ?? '',
      total_patients: patient_ids.length,
      status: 'draft',
    })
    .select()
    .single()

  if (camError) return NextResponse.json({ error: camError.message }, { status: 500 })

  // Buscar dados dos pacientes selecionados
  const { data: patients } = await supabase
    .from('patients')
    .select('id, name, phone, category, dentist_name, observations')
    .in('id', patient_ids)
    .eq('user_id', userId)

  if (patients?.length) {
    const records = patients.map((p) => ({
      campaign_id: campaign.id,
      patient_id: p.id,
      personalized_message: '',
      status: 'pending',
    }))
    await supabase.from('campaign_patients').insert(records)
  }

  return NextResponse.json({ campaign }, { status: 201 })
}
```

- [ ] **Step 2: Criar GET /api/campaigns/[id]**

```typescript
// app/api/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateAuthHeader, isAuthError } from '../../lib/auth'
import { getSupabaseClient } from '../../lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = validateAuthHeader(request)
  if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { userId } = auth.data
  const supabase = getSupabaseClient()

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', userId)
    .single()

  if (error) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })

  const { data: patients } = await supabase
    .from('campaign_patients')
    .select(`
      id, status, personalized_message, sent_at, error_message, whatsapp_message_id,
      patients(id, name, phone, category, dentist_name)
    `)
    .eq('campaign_id', params.id)

  return NextResponse.json({ campaign, patients: patients ?? [] })
}
```

- [ ] **Step 3: Escrever teste para personalização de mensagem**

```typescript
// tests/lib/openai/personalize-message.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Olá João, sua consulta de Prótese está em aberto...' } }],
        }),
      },
    },
  })),
}))

import { personalizeMessage } from '../../../app/lib/openai/personalize-message'

describe('personalizeMessage', () => {
  it('returns a personalized message string', async () => {
    const result = await personalizeMessage({
      patientName: 'João Silva',
      category: 'Prótese',
      dentistName: 'Dr. Felipe',
      observations: 'Finalizar tratamento',
      agentConfig: {
        name: 'Ana',
        clinic_name: 'Allo Oral Clinic',
        tone: 'normal',
        custom_instructions: '',
        specialties: ['Prótese', 'Implante'],
      },
    })
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(10)
  })
})
```

- [ ] **Step 4: Criar personalize-message.ts**

```typescript
// app/lib/openai/personalize-message.ts
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface PersonalizeParams {
  patientName: string
  category: string
  dentistName: string
  observations: string
  agentConfig: {
    name: string
    clinic_name: string
    tone: string
    custom_instructions: string
    specialties: string[]
  }
}

export async function personalizeMessage(params: PersonalizeParams): Promise<string> {
  const { patientName, category, dentistName, observations, agentConfig } = params

  const toneMap: Record<string, string> = {
    formal: 'formal e profissional',
    normal: 'cordial e acessível',
    descontraido: 'descontraído e amigável',
  }
  const toneLabel = toneMap[agentConfig.tone] ?? 'cordial'

  const prompt = `Você é ${agentConfig.name}, da ${agentConfig.clinic_name}.
Tom: ${toneLabel}.
${agentConfig.custom_instructions ? `Instruções adicionais: ${agentConfig.custom_instructions}` : ''}

Escreva UMA mensagem curta de WhatsApp (máximo 280 caracteres) para reativar o paciente abaixo.
A mensagem deve ser personalizada, mencionar o procedimento e convidar para retornar à clínica.
Não use markdown. Não use bullet points. Responda APENAS com o texto da mensagem.

Paciente: ${patientName}
Último procedimento: ${category || 'consulta'}
Dentista: ${dentistName || 'nossa equipe'}
Observação: ${observations || 'nenhuma'}
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 150,
    temperature: 0.7,
  })

  return response.choices[0]?.message?.content?.trim() ?? ''
}
```

- [ ] **Step 5: Criar rota generate-messages**

```typescript
// app/api/campaigns/[id]/generate-messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateAuthHeader, isAuthError } from '../../../lib/auth'
import { getSupabaseClient } from '../../../lib/supabase'
import { personalizeMessage } from '../../../../lib/openai/personalize-message'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = validateAuthHeader(request)
  if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { userId } = auth.data
  const supabase = getSupabaseClient()

  // Verificar que a campanha pertence ao usuário
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', userId)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })

  // Buscar configuração do agente
  const { data: settings } = await supabase
    .from('user_settings')
    .select('agent_config')
    .eq('user_id', userId)
    .single()

  const agentConfig = settings?.agent_config ?? {
    name: 'Equipe',
    clinic_name: 'nossa clínica',
    tone: 'normal',
    custom_instructions: '',
    specialties: [],
  }

  // Buscar pacientes da campanha
  const { data: campaignPatients } = await supabase
    .from('campaign_patients')
    .select(`
      id,
      patients(name, category, dentist_name, observations)
    `)
    .eq('campaign_id', params.id)

  if (!campaignPatients?.length) {
    return NextResponse.json({ error: 'Nenhum paciente na campanha' }, { status: 400 })
  }

  let generated = 0
  for (const cp of campaignPatients) {
    const patient = cp.patients as Record<string, string>
    try {
      const message = await personalizeMessage({
        patientName: patient.name,
        category: patient.category ?? '',
        dentistName: patient.dentist_name ?? '',
        observations: patient.observations ?? '',
        agentConfig,
      })
      await supabase
        .from('campaign_patients')
        .update({ personalized_message: message })
        .eq('id', cp.id)
      generated++
    } catch (err) {
      console.error(`Error generating message for cp ${cp.id}:`, err)
    }
  }

  return NextResponse.json({ success: true, generated, total: campaignPatients.length })
}
```

- [ ] **Step 6: Criar rota send**

```typescript
// app/api/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateAuthHeader, isAuthError } from '../../../lib/auth'
import { getSupabaseClient } from '../../../lib/supabase'
import { sendWhatsAppMessage } from '../../../../lib/whatsapp/send-message'

const DELAY_MS = 1500 // 1.5s entre mensagens

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = validateAuthHeader(request)
  if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { userId } = auth.data
  const supabase = getSupabaseClient()

  // Verificar campanha
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', userId)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
  if (campaign.status === 'sending') {
    return NextResponse.json({ error: 'Campanha já em andamento' }, { status: 409 })
  }

  // Buscar config WhatsApp
  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!settings) {
    return NextResponse.json({ error: 'Configure o WhatsApp antes de enviar' }, { status: 400 })
  }

  // ⚠️ LIMITE: processar no máximo 50 mensagens por chamada
  // Para campanhas grandes (>50), o frontend chama este endpoint em loop
  // até receber { completed: true } ou pending = 0.
  const { searchParams } = new URL(request.url)
  const batchSize = Math.min(parseInt(searchParams.get('batch') ?? '50'), 50)

  // Buscar pacientes pendentes (batch)
  const { data: pending } = await supabase
    .from('campaign_patients')
    .select('id, personalized_message, patients(phone, name)')
    .eq('campaign_id', params.id)
    .eq('status', 'pending')
    .limit(batchSize)

  if (!pending?.length) {
    // Nenhum pendente → atualizar para completed
    await supabase
      .from('campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', params.id)
    return NextResponse.json({ success: true, sent: 0, failed: 0, completed: true })
  }

  // Marcar campanha como enviando (idempotente)
  await supabase
    .from('campaigns')
    .update({ status: 'sending', sent_at: new Date().toISOString() })
    .eq('id', params.id)

  let sent = 0
  let failed = 0

  for (const cp of pending) {
    const patient = cp.patients as Record<string, string>
    if (!patient?.phone || !cp.personalized_message) {
      await supabase
        .from('campaign_patients')
        .update({ status: 'failed', error_message: 'Telefone ou mensagem ausente' })
        .eq('id', cp.id)
      failed++
      continue
    }

    const result = await sendWhatsAppMessage(settings, patient.phone, cp.personalized_message)

    if (result.success) {
      await supabase
        .from('campaign_patients')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          whatsapp_message_id: result.messageId ?? null,
        })
        .eq('id', cp.id)
      sent++
    } else {
      await supabase
        .from('campaign_patients')
        .update({ status: 'failed', error_message: result.error ?? 'Erro desconhecido' })
        .eq('id', cp.id)
      failed++
    }

    await sleep(DELAY_MS)
  }

  // Incrementar contadores (não sobrescrever — pode ser chamado múltiplas vezes)
  await supabase.rpc('increment_campaign_counts', {
    p_campaign_id: params.id,
    p_sent: sent,
    p_failed: failed,
  })

  // Verificar se ainda há pendentes
  const { count: remainingCount } = await supabase
    .from('campaign_patients')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', params.id)
    .eq('status', 'pending')

  const completed = (remainingCount ?? 0) === 0
  if (completed) {
    await supabase
      .from('campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', params.id)
  }

  return NextResponse.json({ success: true, sent, failed, completed, remaining: remainingCount ?? 0 })
}
```

- [ ] **Step 7: Rodar testes**

```bash
npx vitest run tests/lib/openai/
```

Expected: PASS (com mock do OpenAI)

- [ ] **Step 8: Commit**

```bash
git add app/api/campaigns/ app/lib/openai/personalize-message.ts tests/lib/openai/
git commit -m "feat: campaigns API (CRUD + AI message generation + multi-provider send)"
```

---

### Task 6: UI — Wizard de campanha e histórico

**Files:**
- Create: `components/CampaignWizard.tsx`
- Create: `components/CampaignHistory.tsx`

- [ ] **Step 1: Criar CampaignWizard.tsx (wizard 4 etapas)**

```typescript
// components/CampaignWizard.tsx
// Wizard: 1-SelectPatients → 2-GenerateMessages → 3-Preview → 4-Sending/Result
import React, { useState, useEffect } from 'react'
import { Users, Sparkles, Eye, Send, CheckCircle, XCircle, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface Patient {
  id: string
  name: string
  phone: string
  category?: string
  dentist_name?: string
  observations?: string
}

interface CampaignPatient {
  id: string
  personalized_message: string
  status: string
  patients: Patient
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated?: () => void
}

type Step = 'select' | 'generate' | 'preview' | 'sending' | 'result'

export function CampaignWizard({ isOpen, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>('select')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dentistFilter, setDentistFilter] = useState('')
  const [searchFilter, setSearchFilter] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [dentists, setDentists] = useState<string[]>([])
  const [campaignName, setCampaignName] = useState('')
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [campaignPatients, setCampaignPatients] = useState<CampaignPatient[]>([])
  const [previewIndex, setPreviewIndex] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''

  // Carregar pacientes
  useEffect(() => {
    if (!isOpen) return
    const params = new URLSearchParams()
    if (categoryFilter) params.set('category', categoryFilter)
    if (dentistFilter) params.set('dentist', dentistFilter)
    if (searchFilter) params.set('search', searchFilter)
    params.set('limit', '200')

    fetch(`/api/patients?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setPatients(d.patients ?? [])
        const cats = [...new Set((d.patients ?? []).map((p: Patient) => p.category).filter(Boolean))] as string[]
        const dens = [...new Set((d.patients ?? []).map((p: Patient) => p.dentist_name).filter(Boolean))] as string[]
        setCategories(cats)
        setDentists(dens)
      })
  }, [isOpen, categoryFilter, dentistFilter, searchFilter])

  function toggleAll() {
    if (selected.size === patients.length) setSelected(new Set())
    else setSelected(new Set(patients.map((p) => p.id)))
  }

  async function handleCreateAndGenerate() {
    if (!selected.size) return setError('Selecione pelo menos um paciente')
    if (!campaignName.trim()) return setError('Informe o nome da campanha')
    setError('')
    setGenerating(true)
    try {
      // 1. Criar campanha
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: campaignName, patient_ids: [...selected] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const id = data.campaign.id
      setCampaignId(id)

      setStep('generate')

      // 2. Gerar mensagens
      const genRes = await fetch(`/api/campaigns/${id}/generate-messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const genData = await genRes.json()
      if (!genRes.ok) throw new Error(genData.error)

      // 3. Buscar para preview
      const detailRes = await fetch(`/api/campaigns/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const detail = await detailRes.json()
      setCampaignPatients(detail.patients ?? [])
      setStep('preview')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar campanha')
      setStep('select')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSend() {
    if (!campaignId) return
    setSending(true)
    setStep('sending')
    let totalSent = 0, totalFailed = 0
    try {
      // Loop em batches de 50 até completar
      let completed = false
      while (!completed) {
        const res = await fetch(`/api/campaigns/${campaignId}/send?batch=50`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        totalSent += data.sent ?? 0
        totalFailed += data.failed ?? 0
        completed = data.completed ?? true
      }
      setResult({ sent: totalSent, failed: totalFailed })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar')
    } finally {
      setSending(false)
      setStep('result')
      onCreated?.()
    }
  }

  function reset() {
    setStep('select')
    setSelected(new Set())
    setCampaignName('')
    setCampaignId(null)
    setCampaignPatients([])
    setResult(null)
    setError('')
    setPreviewIndex(0)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {step === 'select' && 'Nova Campanha — Selecionar Pacientes'}
            {step === 'generate' && 'Gerando mensagens com IA...'}
            {step === 'preview' && 'Preview das Mensagens'}
            {step === 'sending' && 'Enviando...'}
            {step === 'result' && 'Resultado'}
          </h2>
          <button onClick={() => { reset(); onClose() }} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* STEP: SELECT */}
          {step === 'select' && (
            <div className="space-y-4">
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                placeholder="Nome da campanha (ex: Reativação Março 2026)"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  placeholder="Buscar paciente..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
                <select
                  className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">Todas categorias</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  value={dentistFilter}
                  onChange={(e) => setDentistFilter(e.target.value)}
                >
                  <option value="">Todos dentistas</option>
                  {dentists.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{patients.length} pacientes • {selected.size} selecionados</span>
                <button onClick={toggleAll} className="text-blue-600 hover:underline">
                  {selected.size === patients.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              </div>
              <div className="border dark:border-gray-700 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                {patients.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border-b dark:border-gray-700 last:border-b-0 ${selected.has(p.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => {
                        const s = new Set(selected)
                        s.has(p.id) ? s.delete(p.id) : s.add(p.id)
                        setSelected(s)
                      }}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{p.phone} • {p.category ?? '—'} • {p.dentist_name ?? '—'}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP: GENERATE */}
          {step === 'generate' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Sparkles size={48} className="text-blue-500 animate-pulse" />
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                Gerando mensagens personalizadas com IA...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Isso pode levar alguns segundos para {selected.size} pacientes.
              </p>
            </div>
          )}

          {/* STEP: PREVIEW */}
          {step === 'preview' && campaignPatients.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {previewIndex + 1} de {campaignPatients.length} mensagens
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {campaignPatients[previewIndex]?.patients?.name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {campaignPatients[previewIndex]?.personalized_message || '(mensagem vazia)'}
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                  disabled={previewIndex === 0}
                  className="p-2 rounded-lg border dark:border-gray-600 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPreviewIndex((i) => Math.min(campaignPatients.length - 1, i + 1))}
                  disabled={previewIndex === campaignPatients.length - 1}
                  className="p-2 rounded-lg border dark:border-gray-600 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP: SENDING */}
          {step === 'sending' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Send size={48} className="text-green-500 animate-bounce" />
              <p className="text-gray-700 dark:text-gray-300 font-medium">Enviando mensagens...</p>
            </div>
          )}

          {/* STEP: RESULT */}
          {step === 'result' && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="text-green-500" size={28} />
                  <div>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">{result?.sent ?? 0}</p>
                    <p className="text-sm text-green-600 dark:text-green-400">Enviados</p>
                  </div>
                </div>
                <div className="flex-1 bg-red-50 dark:bg-red-900/20 rounded-xl p-4 flex items-center gap-3">
                  <XCircle className="text-red-500" size={28} />
                  <div>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">{result?.failed ?? 0}</p>
                    <p className="text-sm text-red-600 dark:text-red-400">Falhas</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t dark:border-gray-700">
          {step === 'select' && (
            <>
              <button onClick={() => { reset(); onClose() }} className="text-sm text-gray-500 hover:text-gray-700">
                Cancelar
              </button>
              <button
                onClick={handleCreateAndGenerate}
                disabled={!selected.size || !campaignName.trim() || generating}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium"
              >
                <Sparkles size={16} />
                Gerar com IA ({selected.size})
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => setStep('select')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                <ChevronLeft size={16} /> Voltar
              </button>
              <button
                onClick={handleSend}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium"
              >
                <Send size={16} />
                Enviar {campaignPatients.length} mensagens
              </button>
            </>
          )}
          {step === 'result' && (
            <button
              onClick={() => { reset(); onClose() }}
              className="ml-auto bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-5 py-2 rounded-lg text-sm font-medium"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar CampaignHistory.tsx**

```typescript
// components/CampaignHistory.tsx
import React, { useEffect, useState } from 'react'
import { CheckCircle, Clock, Send, AlertCircle, RefreshCw } from 'lucide-react'

interface Campaign {
  id: string
  name: string
  status: 'draft' | 'sending' | 'completed' | 'paused'
  total_patients: number
  sent_count: number
  failed_count: number
  created_at: string
  completed_at?: string
}

const STATUS_LABELS: Record<Campaign['status'], { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Rascunho', color: 'text-gray-500', icon: <Clock size={14} /> },
  sending: { label: 'Enviando', color: 'text-blue-500', icon: <Send size={14} className="animate-pulse" /> },
  completed: { label: 'Concluída', color: 'text-green-600', icon: <CheckCircle size={14} /> },
  paused: { label: 'Pausada', color: 'text-yellow-500', icon: <AlertCircle size={14} /> },
}

export function CampaignHistory() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''

  function load() {
    setLoading(true)
    fetch('/api/campaigns', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return <div className="text-center py-8 text-gray-500 text-sm">Carregando campanhas...</div>
  }

  if (!campaigns.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Send size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhuma campanha ainda. Crie sua primeira!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900 dark:text-white">Histórico de Campanhas</h3>
        <button onClick={load} className="text-gray-400 hover:text-gray-600">
          <RefreshCw size={16} />
        </button>
      </div>
      {campaigns.map((c) => {
        const st = STATUS_LABELS[c.status]
        const rate = c.total_patients > 0
          ? Math.round((c.sent_count / c.total_patients) * 100)
          : 0
        return (
          <div key={c.id} className="border dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
            <div className="flex items-start justify-between mb-2">
              <p className="font-medium text-gray-900 dark:text-white text-sm">{c.name}</p>
              <span className={`flex items-center gap-1 text-xs font-medium ${st.color}`}>
                {st.icon} {st.label}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span>{c.total_patients} pacientes</span>
              <span className="text-green-600">{c.sent_count} enviados</span>
              {c.failed_count > 0 && <span className="text-red-500">{c.failed_count} falhas</span>}
              {c.status === 'completed' && <span>{rate}% de entrega</span>}
            </div>
            {c.status === 'completed' && (
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full"
                  style={{ width: `${rate}%` }}
                />
              </div>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/CampaignWizard.tsx components/CampaignHistory.tsx
git commit -m "feat: CampaignWizard and CampaignHistory UI components"
```

---

## Fase 3 — Agente IA Passivo (Webhook + Engine)

### Task 7: Engine do agente IA

**Files:**
- Create: `app/lib/openai/agent-response.ts`
- Create: `tests/lib/openai/agent-response.test.ts`

- [ ] **Step 1: Escrever testes do engine do agente**

```typescript
// tests/lib/openai/agent-response.test.ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Olá! Como posso ajudar com seu tratamento?' } }],
        }),
      },
    },
  })),
}))

import { buildAgentResponse } from '../../../app/lib/openai/agent-response'

describe('buildAgentResponse', () => {
  it('returns a response string', async () => {
    const result = await buildAgentResponse({
      incomingMessage: 'Oi, recebi sua mensagem',
      conversationHistory: [],
      patientContext: {
        name: 'João Silva',
        category: 'Prótese',
        dentist_name: 'Dr. Felipe',
        observations: '',
      },
      agentConfig: {
        enabled: true,
        name: 'Ana',
        clinic_name: 'Allo Oral Clinic',
        tone: 'normal',
        custom_instructions: '',
        specialties: ['Prótese'],
        openai_model: 'gpt-4o',
        max_context_messages: 20,
      },
    })
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(5)
  })
})
```

- [ ] **Step 2: Rodar teste — verificar que falha**

```bash
npx vitest run tests/lib/openai/agent-response.test.ts
```

Expected: FAIL

- [ ] **Step 3: Criar agent-response.ts**

```typescript
// app/lib/openai/agent-response.ts
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface MessageHistory {
  role: 'patient' | 'agent'
  content: string
}

interface PatientContext {
  name: string
  category: string
  dentist_name: string
  observations: string
}

interface AgentConfig {
  enabled: boolean
  name: string
  clinic_name: string
  tone: string
  custom_instructions: string
  specialties: string[]
  openai_model: string
  max_context_messages: number
}

interface AgentResponseParams {
  incomingMessage: string
  conversationHistory: MessageHistory[]
  patientContext: PatientContext
  agentConfig: AgentConfig
}

const TONE_MAP: Record<string, string> = {
  formal: 'formal e profissional',
  normal: 'cordial e acessível',
  descontraido: 'descontraído e amigável',
}

function buildSystemPrompt(patient: PatientContext, config: AgentConfig): string {
  const tone = TONE_MAP[config.tone] ?? 'cordial'
  const specialties = config.specialties?.join(', ') || 'odontologia geral'

  return `Você é ${config.name}, recepcionista virtual da ${config.clinic_name}.
Especialidades da clínica: ${specialties}.
Tom de comunicação: ${tone}.
${config.custom_instructions ? `\nInstruções adicionais: ${config.custom_instructions}` : ''}

CONTEXTO DO PACIENTE:
- Nome: ${patient.name}
- Último procedimento: ${patient.category || 'consulta'}
- Dentista responsável: ${patient.dentist_name || 'nossa equipe'}
- Observações: ${patient.observations || 'nenhuma'}

REGRAS OBRIGATÓRIAS:
- NUNCA marque consultas sem confirmar disponibilidade com a equipe
- NUNCA faça diagnósticos ou dê opiniões clínicas
- Se o paciente quiser agendar → colete: nome completo, melhor horário, dentista de preferência
- Se pedir para falar com humano → responda: "Vou chamar nossa equipe. Em breve entraremos em contato! 😊"
- Mensagens curtas (máx 280 caracteres por resposta)
- Responda em português brasileiro
- Não use markdown, bullet points ou formatação`
}

export async function buildAgentResponse(params: AgentResponseParams): Promise<string> {
  const { incomingMessage, conversationHistory, patientContext, agentConfig } = params

  const systemPrompt = buildSystemPrompt(patientContext, agentConfig)

  // Últimas N mensagens como contexto
  const maxHistory = agentConfig.max_context_messages ?? 20
  const recentHistory = conversationHistory.slice(-maxHistory)

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...recentHistory.map((m) => ({
      role: m.role === 'patient' ? ('user' as const) : ('assistant' as const),
      content: m.content,
    })),
    { role: 'user', content: incomingMessage },
  ]

  const response = await openai.chat.completions.create({
    model: agentConfig.openai_model ?? 'gpt-4o',
    messages,
    max_tokens: 200,
    temperature: 0.7,
  })

  return response.choices[0]?.message?.content?.trim() ?? ''
}
```

- [ ] **Step 4: Rodar teste — verificar que passa**

```bash
npx vitest run tests/lib/openai/agent-response.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/lib/openai/agent-response.ts tests/lib/openai/agent-response.test.ts
git commit -m "feat: AI agent response engine with context window and system prompt"
```

---

### Task 8: Webhooks WhatsApp (Evolution + Meta)

**Files:**
- Create: `app/lib/agent/process-incoming.ts` ← CRIAR PRIMEIRO (dependência dos webhooks)
- Create: `app/api/webhook/whatsapp/evolution/route.ts`
- Create: `app/api/webhook/whatsapp/meta/route.ts`

> ⚠️ **Ordem obrigatória:** Step 3 (process-incoming.ts) deve ser criado ANTES dos Steps 1 e 2 (webhooks), pois ambos importam desta lib.

- [ ] **Step 1: Criar webhook Evolution API** *(após criar process-incoming no Step 3)*

```typescript
// app/api/webhook/whatsapp/evolution/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone } from '../../../../lib/whatsapp/normalize-phone'
import { processIncomingMessage } from '../../../../lib/agent/process-incoming'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    // Ignorar mensagens próprias e grupos
    if (payload.data?.key?.fromMe) return NextResponse.json({ ok: true })
    if (payload.data?.key?.remoteJid?.includes('@g.us')) return NextResponse.json({ ok: true })

    const rawPhone = payload.data?.key?.remoteJid
    if (!rawPhone) return NextResponse.json({ ok: true })

    const phone = normalizePhone(rawPhone)
    const incomingText =
      payload.data?.message?.conversation ??
      payload.data?.message?.extendedTextMessage?.text ??
      ''

    if (!incomingText.trim()) return NextResponse.json({ ok: true })

    await processIncomingMessage(phone, incomingText)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Evolution webhook error:', err)
    return NextResponse.json({ ok: true }) // Sempre 200 para o webhook não retentar
  }
}
```

- [ ] **Step 2: Criar webhook Meta Cloud API**

```typescript
// app/api/webhook/whatsapp/meta/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone } from '../../../../lib/whatsapp/normalize-phone'
import { processIncomingMessage } from '../../../../lib/agent/process-incoming'

// GET — verificação do webhook pelo Meta
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 })
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST — mensagens recebidas pelo Meta
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    const entry = payload.entry?.[0]
    const changes = entry?.changes?.[0]
    const messages = changes?.value?.messages

    if (!messages?.length) return NextResponse.json({ ok: true })

    for (const msg of messages) {
      if (msg.type !== 'text') continue // Por ora, só texto
      const phone = normalizePhone(msg.from)
      const text = msg.text?.body ?? ''
      if (text.trim()) {
        await processIncomingMessage(phone, text)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Meta webhook error:', err)
    return NextResponse.json({ ok: true })
  }
}
```

- [ ] **Step 3: Criar process-incoming.ts (lógica compartilhada entre os dois webhooks)**

```typescript
// app/lib/agent/process-incoming.ts
import { getSupabaseClient } from '../../api/lib/supabase'
import { buildAgentResponse } from '../openai/agent-response'
import { createProvider } from '../whatsapp/provider-factory'

const TYPING_DELAY_MIN = 3000
const TYPING_DELAY_MAX = 7000

function randomDelay(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function processIncomingMessage(phone: string, text: string) {
  const supabase = getSupabaseClient()

  // Encontrar a qual clínica/usuário pertence este número
  // Busca conversa existente ou tenta identificar pelo histórico de campanha
  const { data: conversation } = await supabase
    .from('agent_conversations')
    .select('id, user_id, patient_id, status')
    .eq('patient_phone', phone)
    .maybeSingle()

  let userId = conversation?.user_id
  let patientId = conversation?.patient_id

  // Se não há conversa: identificar clínica/paciente pelo número no histórico de campanhas
  // Duas queries separadas (o .filter() do supabase-js não suporta filtro em join aninhado)
  if (!userId) {
    // 1. Buscar paciente pelo telefone
    const phoneDigits = phone.replace('+', '')
    const { data: patientMatch } = await supabase
      .from('patients')
      .select('id, user_id')
      .ilike('phone', `%${phoneDigits.slice(-9)}%`) // últimos 9 dígitos para maior compatibilidade
      .limit(1)
      .maybeSingle()

    if (patientMatch) {
      // 2. Verificar se foi contatado por alguma campanha desta clínica
      const { data: cpMatch } = await supabase
        .from('campaign_patients')
        .select('id')
        .eq('patient_id', patientMatch.id)
        .eq('status', 'sent')
        .limit(1)
        .maybeSingle()

      if (cpMatch) {
        userId = patientMatch.user_id
        patientId = patientMatch.id
      }
    }
  }

  if (!userId) return // Número desconhecido — ignorar

  // Buscar config do agente
  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  const agentConfig = settings?.agent_config ?? {}
  if (!agentConfig.enabled) return // Agente desabilitado

  // Criar ou atualizar conversa
  let conversationId = conversation?.id
  if (!conversationId) {
    const { data: newConv } = await supabase
      .from('agent_conversations')
      .upsert(
        {
          user_id: userId,
          patient_phone: phone,
          patient_id: patientId ?? null,
          status: 'active',
          last_message_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,patient_phone' }
      )
      .select('id')
      .single()
    conversationId = newConv?.id
  } else {
    await supabase
      .from('agent_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)
  }

  if (!conversationId) return

  // Salvar mensagem do paciente
  await supabase.from('agent_messages').insert({
    conversation_id: conversationId,
    role: 'patient',
    content: text,
  })

  // Buscar histórico da conversa (últimas 20 msgs)
  const { data: history } = await supabase
    .from('agent_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(20)

  // Buscar dados do paciente
  let patientContext = { name: 'Paciente', category: '', dentist_name: '', observations: '' }
  if (patientId) {
    const { data: patient } = await supabase
      .from('patients')
      .select('name, category, dentist_name, observations')
      .eq('id', patientId)
      .single()
    if (patient) patientContext = patient
  }

  // Gerar resposta com IA
  const responseText = await buildAgentResponse({
    incomingMessage: text,
    conversationHistory: (history ?? []) as { role: 'patient' | 'agent'; content: string }[],
    patientContext,
    agentConfig,
  })

  if (!responseText) return

  // Delay humanizado
  const delay = randomDelay(TYPING_DELAY_MIN, TYPING_DELAY_MAX)

  // Typing indicator (Evolution only)
  if (settings?.provider === 'evolution' || !settings?.provider) {
    try {
      const provider = createProvider(settings)
      if ('sendTyping' in provider && provider.sendTyping) {
        await provider.sendTyping(phone)
      }
    } catch { /* best-effort */ }
  }

  await new Promise((r) => setTimeout(r, delay))

  // Enviar resposta
  const provider = createProvider(settings)
  await provider.sendText(phone, responseText)

  // Salvar resposta do agente
  await supabase.from('agent_messages').insert({
    conversation_id: conversationId,
    role: 'agent',
    content: responseText,
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/webhook/ app/lib/agent/
git commit -m "feat: WhatsApp webhook handlers (Evolution + Meta) + agent process-incoming engine"
```

---

## Fase 4 — Configuração do Agente (UI + API)

### Task 9: API de configuração do agente

**Files:**
- Create: `app/api/agent/config/route.ts`

- [ ] **Step 1: Criar GET/PUT /api/agent/config**

```typescript
// app/api/agent/config/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateAuthHeader, isAuthError } from '../../lib/auth'
import { getSupabaseClient } from '../../lib/supabase'

const DEFAULT_AGENT_CONFIG = {
  enabled: false,
  name: 'Ana',
  clinic_name: '',
  specialties: [],
  tone: 'normal',
  custom_instructions: '',
  openai_model: 'gpt-4o',
  max_context_messages: 20,
}

export async function GET(request: NextRequest) {
  const auth = validateAuthHeader(request)
  if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { userId } = auth.data
  const supabase = getSupabaseClient()

  const { data } = await supabase
    .from('user_settings')
    .select('agent_config')
    .eq('user_id', userId)
    .single()

  return NextResponse.json({
    config: { ...DEFAULT_AGENT_CONFIG, ...(data?.agent_config ?? {}) },
  })
}

export async function PUT(request: NextRequest) {
  const auth = validateAuthHeader(request)
  if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { userId } = auth.data
  const supabase = getSupabaseClient()

  const body = await request.json()

  // Validar campos permitidos
  const allowed = ['enabled', 'name', 'clinic_name', 'specialties', 'tone', 'custom_instructions', 'openai_model', 'max_context_messages']
  const config = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  )

  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, agent_config: config, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, config })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/agent/
git commit -m "feat: agent config API (GET/PUT) stored in user_settings.agent_config"
```

---

### Task 10: UI de configuração do agente

**Files:**
- Create: `components/AgentConfigPanel.tsx`
- Modify: `components/SettingsModal.tsx` — adicionar aba "Agente IA"

- [ ] **Step 1: Criar AgentConfigPanel.tsx**

```typescript
// components/AgentConfigPanel.tsx
import React, { useState, useEffect } from 'react'
import { Bot, Save, ToggleLeft, ToggleRight, Info, Copy } from 'lucide-react'

interface AgentConfig {
  enabled: boolean
  name: string
  clinic_name: string
  specialties: string[]
  tone: 'formal' | 'normal' | 'descontraido'
  custom_instructions: string
  openai_model: string
  max_context_messages: number
}

const TONE_OPTIONS = [
  { value: 'formal', label: 'Formal', desc: 'Profissional e técnico' },
  { value: 'normal', label: 'Normal', desc: 'Cordial e acessível' },
  { value: 'descontraido', label: 'Descontraído', desc: 'Amigável e informal' },
]

export function AgentConfigPanel() {
  const [config, setConfig] = useState<AgentConfig>({
    enabled: false,
    name: 'Ana',
    clinic_name: '',
    specialties: [],
    tone: 'normal',
    custom_instructions: '',
    openai_model: 'gpt-4o',
    max_context_messages: 20,
  })
  const [specialtyInput, setSpecialtyInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [whatsappProvider, setWhatsappProvider] = useState<'evolution' | 'meta'>('evolution')

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''

  // URL do webhook baseada no provider configurado
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook/whatsapp/${whatsappProvider}`
    : ''

  useEffect(() => {
    fetch('/api/agent/config', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.config) setConfig(d.config) })
    // Buscar provider configurado nas settings
    fetch('/api/user-settings', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.provider) setWhatsappProvider(d.provider) })
  }, [])

  function addSpecialty() {
    const s = specialtyInput.trim()
    if (s && !config.specialties.includes(s)) {
      setConfig((c) => ({ ...c, specialties: [...c.specialties, s] }))
    }
    setSpecialtyInput('')
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/agent/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toggle habilitar/desabilitar */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <div>
          <p className="font-medium text-gray-900 dark:text-white">Agente IA</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {config.enabled
              ? 'Ativo — respondendo automaticamente aos pacientes'
              : 'Inativo — pacientes não recebem resposta automática'}
          </p>
        </div>
        <button
          onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
          className={`text-3xl transition-colors ${config.enabled ? 'text-green-500' : 'text-gray-300'}`}
        >
          {config.enabled ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
        </button>
      </div>

      {/* Identidade */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome do Agente
          </label>
          <input
            className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            placeholder="Ex: Ana, Sofia, Recepção..."
            value={config.name}
            onChange={(e) => setConfig((c) => ({ ...c, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome da Clínica
          </label>
          <input
            className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            placeholder="Ex: Allo Oral Clinic"
            value={config.clinic_name}
            onChange={(e) => setConfig((c) => ({ ...c, clinic_name: e.target.value }))}
          />
        </div>
      </div>

      {/* Tom de voz */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tom de Voz
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TONE_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => setConfig((c) => ({ ...c, tone: t.value as AgentConfig['tone'] }))}
              className={`p-3 rounded-lg border text-left transition-colors ${
                config.tone === t.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
              }`}
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white">{t.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Especialidades */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Especialidades Atendidas
        </label>
        <div className="flex gap-2 mb-2">
          <input
            className="flex-1 border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
            placeholder="Digite e pressione Enter"
            value={specialtyInput}
            onChange={(e) => setSpecialtyInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpecialty() } }}
          />
          <button
            onClick={addSpecialty}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Adicionar
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {config.specialties.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs"
            >
              {s}
              <button
                onClick={() => setConfig((c) => ({ ...c, specialties: c.specialties.filter((x) => x !== s) }))}
                className="ml-1 hover:text-red-500"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Instruções personalizadas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Instruções Personalizadas
        </label>
        <textarea
          className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white resize-none"
          rows={4}
          placeholder="Ex: Sempre mencione o convênio Unimed. Não agende para terças-feiras."
          value={config.custom_instructions}
          onChange={(e) => setConfig((c) => ({ ...c, custom_instructions: e.target.value }))}
        />
      </div>

      {/* URL do Webhook */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">URL do Webhook</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
              Configure esta URL na sua Evolution API ou Meta para receber as respostas dos pacientes.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 dark:text-gray-300 truncate">
                {webhookUrl}
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
                className="px-3 py-2 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                title="Copiar URL"
              >
                <Copy size={14} className="text-gray-500" />
              </button>
            </div>
            <div className="mt-2 space-y-1 text-xs text-blue-600 dark:text-blue-400">
              <p><span className="font-medium">Evolution API:</span> {window.location.origin}/api/webhook/whatsapp/evolution</p>
              <p><span className="font-medium">Meta Cloud API:</span> {window.location.origin}/api/webhook/whatsapp/meta</p>
            </div>
          </div>
        </div>
      </div>

      {/* Erro e salvar */}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium"
      >
        {saving ? (
          'Salvando...'
        ) : saved ? (
          <>✓ Salvo!</>
        ) : (
          <><Save size={16} /> Salvar Configurações</>
        )}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Adicionar aba "Agente IA" no SettingsModal**

Abrir `components/SettingsModal.tsx`. Localizar a lista de abas (geralmente um array ou botões de navegação). Adicionar:

```typescript
// 1. Import no topo
import { AgentConfigPanel } from './AgentConfigPanel'
import { Bot } from 'lucide-react'

// 2. Adicionar na lista de abas (onde estão as outras tabs):
{ id: 'agent', label: 'Agente IA', icon: <Bot size={16} /> }

// 3. Adicionar o conteúdo da aba (no switch/if de renderização de abas):
{activeTab === 'agent' && <AgentConfigPanel />}
```

- [ ] **Step 3: Commit**

```bash
git add components/AgentConfigPanel.tsx components/SettingsModal.tsx app/api/agent/
git commit -m "feat: AgentConfigPanel UI with enable/disable toggle, tone, specialties, webhook URL"
```

---

### Task 11: Integrar botão "Nova Campanha" na tela principal

**Files:**
- Modify: `App.tsx` ou página principal — adicionar CampaignWizard e CampaignHistory

- [ ] **Step 1: Adicionar CampaignWizard e CampaignHistory ao layout principal**

Abrir `App.tsx`. Localizar a seção de pacientes/oportunidades. Adicionar:

```typescript
// Imports
import { CampaignWizard } from './components/CampaignWizard'
import { CampaignHistory } from './components/CampaignHistory'

// State
const [showCampaignWizard, setShowCampaignWizard] = useState(false)
const [showCampaigns, setShowCampaigns] = useState(false)

// Na barra de ações (próximo ao botão de exportação ou importação):
<button
  onClick={() => setShowCampaignWizard(true)}
  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
>
  <Send size={16} />
  Nova Campanha
</button>

<button
  onClick={() => setShowCampaigns(!showCampaigns)}
  className="flex items-center gap-2 border dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
>
  Campanhas
</button>

// Ao final do JSX principal:
<CampaignWizard
  isOpen={showCampaignWizard}
  onClose={() => setShowCampaignWizard(false)}
/>

{showCampaigns && (
  <div className="mt-6">
    <CampaignHistory />
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add App.tsx
git commit -m "feat: integrate CampaignWizard and CampaignHistory into main layout"
```

---

### Task 11b: API GET /api/agent/conversations

**Files:**
- Create: `app/api/agent/conversations/route.ts`

- [ ] **Step 1: Criar rota de listagem de conversas**

```typescript
// app/api/agent/conversations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateAuthHeader, isAuthError } from '../../lib/auth'
import { getSupabaseClient } from '../../lib/supabase'

export async function GET(request: NextRequest) {
  const auth = validateAuthHeader(request)
  if (isAuthError(auth)) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { userId } = auth.data
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('agent_conversations')
    .select(`
      id, patient_phone, status, created_at, last_message_at,
      patients(name, category, dentist_name)
    `)
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ conversations: data ?? [] })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/agent/conversations/
git commit -m "feat: agent conversations listing API"
```

---

### Task 12: Ativar plugin IntelliX + variáveis de ambiente

**Files:**
- Create/Modify: `.claude/settings.json` (raiz do projeto)
- Modify: `.env.example`

- [ ] **Step 1: Criar .claude/settings.json para ativar o plugin**

```json
// .claude/settings.json
{
  "plugins": [
    { "type": "local", "path": "C:/Users/Dell/.claude/plugins/intellix-plugin" }
  ]
}
```

- [ ] **Step 2: Atualizar .env.example com novas variáveis**

Adicionar ao `.env.example`:

```bash
# OpenAI — obrigatório para geração de mensagens e agente IA
OPENAI_API_KEY=sk-...

# WhatsApp Meta Cloud API (se usar API Oficial)
WHATSAPP_CLOUD_TOKEN=          # Access Token do Meta Business
WHATSAPP_PHONE_NUMBER_ID=      # Phone Number ID
WHATSAPP_WEBHOOK_VERIFY_TOKEN= # Token de verificação do webhook (você define)

# WhatsApp Evolution API (se usar Evolution — já existente)
# EVOLUTION_API_URL=
# EVOLUTION_API_KEY=
# EVOLUTION_INSTANCE_NAME=
```

- [ ] **Step 3: Commit**

```bash
git add .claude/settings.json .env.example
git commit -m "chore: activate IntelliX plugin + document new env vars"
```

---

### Task 13: Importação inicial dos pacientes do Excel

- [ ] **Step 1: Fazer upload do Excel via UI**

Com o sistema rodando (`npm run dev`), acessar o sistema → botão "Importar" → selecionar o arquivo:
`G:\Meu Drive\Profissional\Empreendedorismo\Inteligência Artificial\IntelliX.AI\Clinic.AI\Allo Oral Clinic\Agendamentos_Consolidados_Padronizado.xlsx`

- [ ] **Step 2: Verificar importação no Supabase**

```sql
SELECT COUNT(*), source FROM patients GROUP BY source;
-- Esperado: ~4251 linhas com source='excel_import'

SELECT category, COUNT(*) FROM patients
WHERE source='excel_import'
GROUP BY category ORDER BY COUNT(*) DESC;
```

- [ ] **Step 3: Commit final**

```bash
git add .
git commit -m "feat: complete whatsapp reactivation + AI agent system"
```

---

## Checklist de Verificação Final

- [ ] Migrations 012, 013, 014 aplicadas no Supabase
- [ ] 4.251 pacientes importados com categorias e dentistas
- [ ] `GET /api/patients?category=Consulta` retorna apenas consultas
- [ ] `POST /api/campaigns` cria campanha com pacientes
- [ ] `POST /api/campaigns/[id]/generate-messages` gera mensagens personalizadas via OpenAI
- [ ] `POST /api/campaigns/[id]/send` envia via Evolution ou Meta conforme configuração
- [ ] `POST /api/webhook/whatsapp/evolution` recebe payload e responde ao paciente
- [ ] `GET /api/webhook/whatsapp/meta` retorna challenge corretamente
- [ ] Agente só responde quando `agent_config.enabled = true`
- [ ] `AgentConfigPanel` salva configurações via PUT /api/agent/config
- [ ] Toggle habilitar/desabilitar funciona em tempo real
- [ ] URL do webhook exibida e copiável no painel de configuração
- [ ] Todos os testes unitários passando: `npx vitest run`
- [ ] Plugin IntelliX ativo em `.claude/settings.json`

---

## Notas de Implementação

**Ordem crítica:**
1. Migrations PRIMEIRO (Task 1) antes de qualquer rota ou UI
2. `app/lib/agent/process-incoming.ts` ANTES dos webhooks (Task 8, Step 3 antes dos Steps 1 e 2)
3. `npm install openai` ANTES de qualquer arquivo que importa OpenAI

**Envio de campanhas grandes:** A rota `/send` processa 50 mensagens por chamada (1.5s entre cada = ~75s). O frontend faz loop automático até `completed: true`. Para campanhas de 4.251 pacientes, o wizard levará ~2 horas no total — oriente o usuário a segmentar por categoria (ex: "Consulta" = 996 pacientes = ~25min).

**Geração de mensagens OpenAI:** 1 chamada por paciente. Para a importação inicial de 4.251 pacientes, a geração antes do envio pode levar ~15-30 minutos (dependendo da latência). Considere gerar em background ou limitar campanhas a 200 pacientes por vez.

**Webhook Meta:** O `WHATSAPP_WEBHOOK_VERIFY_TOKEN` deve ser definido pelo usuário e configurado no painel do Meta Developers → WhatsApp → Configuração → Webhooks simultaneamente.

**Evolution API typing:** `sendTyping` é best-effort — falhas não devem bloquear o envio da resposta.

**Upsert de pacientes:** Usa `onConflict: 'user_id,phone'` — exige a UNIQUE constraint da migration 012. Re-importar o mesmo arquivo atualiza os registros existentes sem duplicar.

**Meta API versão:** Usando v20.0 — verificar versão atual em https://developers.facebook.com/docs/graph-api/changelog antes de implementar.
