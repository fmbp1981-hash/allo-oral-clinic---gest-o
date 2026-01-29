# Plano de Correção - Integração Trello

## Resumo Executivo

Este plano aborda **35+ problemas** identificados na integração Trello, organizados em 6 fases de implementação. A estimativa é de correção completa com foco em:
- Segurança (JWT, tratamento de erros)
- Estabilidade (tipagem, consistência de estado)
- UX (feedback, loading states, mensagens)
- Manutenibilidade (código centralizado, sem duplicação)

---

## Fase 1: Infraestrutura Base (Crítico)

### 1.1 Criar utilitário centralizado de autenticação JWT

**Arquivo:** `app/api/lib/auth.ts` (novo)

**Objetivo:** Centralizar parsing e validação de JWT para eliminar duplicação em 14+ rotas

**Implementação:**
```typescript
// Funções a criar:
- extractUserFromToken(authHeader: string): { userId: string; tenantId: string }
- validateAuthHeader(request: NextRequest): Result<UserPayload, AuthError>
```

**Arquivos que serão atualizados:**
- `app/api/trello/config/route.ts`
- `app/api/trello/test-connection/route.ts`
- `app/api/trello/boards/route.ts`
- `app/api/trello/cards/route.ts`
- `app/api/trello/cards/[cardId]/route.ts`
- `app/api/trello/cards/[cardId]/move/route.ts`
- `app/api/trello/cards/[cardId]/comments/route.ts`
- `app/api/trello/boards/[boardId]/lists/route.ts`
- `app/api/trello/boards/[boardId]/labels/route.ts`
- `app/api/trello/webhook/route.ts`
- `app/api/trello/sync-opportunity/route.ts`
- `app/api/trello/setup-lists/route.ts`
- `app/api/trello/status/route.ts`

---

### 1.2 Corrigir e padronizar wrapper Supabase

**Arquivo:** `app/api/lib/supabase.ts`

**Problema atual:** Wrapper expõe apenas `from()`, limitando funcionalidades

**Solução:** Criar factory function que retorna cliente completo com lazy init

```typescript
// Estrutura proposta:
export function getSupabaseClient(): SupabaseClient {
  // Lazy init com validação de env vars
}

// Manter compatibilidade com código existente:
export const supabase = getSupabaseClient();
```

**Arquivos que usarão o wrapper centralizado (remover createClient local):**
- Todas as 13 rotas Trello que atualmente fazem `createClient()` direto

---

### 1.3 Centralizar configuração de variáveis de ambiente

**Arquivo:** `app/api/lib/config.ts` (novo)

**Objetivo:** Eliminar duplicação de `process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_...` em 12+ arquivos

```typescript
// Estrutura proposta:
export const config = {
  supabase: {
    url: getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    serviceKey: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
  },
  jwt: {
    secret: getRequiredEnv('JWT_SECRET'),
    refreshSecret: getRequiredEnv('JWT_REFRESH_SECRET'),
  }
};
```

---

## Fase 2: Segurança e Tratamento de Erros (Crítico)

### 2.1 Adicionar try/catch no JWT parsing

**Arquivos afetados:** Todos os 14 arquivos listados em 1.1

**Antes:**
```typescript
const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
```

**Depois:**
```typescript
const result = validateAuthHeader(request);
if (result.error) {
  return NextResponse.json({ error: result.error.message }, { status: 401 });
}
const { userId, tenantId } = result.data;
```

---

### 2.2 Remover console.logs de debug em produção

**Arquivo:** `app/api/trello/cards/route.ts`

**Linhas a remover:** 67, 71

```typescript
// REMOVER:
console.log('[TRELLO][DEBUG] Raw cards response:', JSON.stringify(cards));
console.log('[TRELLO][DEBUG] Filtered cards response:', JSON.stringify(cards));
```

---

### 2.3 Corrigir fallback inseguro de JWT secrets

**Arquivos:**
- `app/api/auth/login/route.ts` (linhas 7-8)
- `app/api/auth/register/route.ts`

**Antes:**
```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
```

**Depois:**
```typescript
import { config } from '../lib/config';
const JWT_SECRET = config.jwt.secret; // Throw se não definido
```

---

### 2.4 Padronizar tratamento de erros Supabase

**Objetivo:** Diferenciar "não encontrado" (PGRST116) de erros reais

**Criar helper:**
```typescript
// app/api/lib/supabase.ts
export function isNotFoundError(error: PostgrestError | null): boolean {
  return error?.code === 'PGRST116';
}
```

**Aplicar em:**
- `app/api/trello/config/route.ts`
- `app/api/trello/status/route.ts`
- `app/api/trello/boards/route.ts`

---

## Fase 3: Tipagem TypeScript (Alta Prioridade)

### 3.1 Adicionar tipagem ao TrelloDashboard

**Arquivo:** `components/TrelloDashboard.tsx`

**Alterações:**

```typescript
// Imports
import { TrelloBoard, TrelloList, TrelloCard } from '../services/trelloService';

// Estados tipados (linhas 12-22)
const [boards, setBoards] = useState<TrelloBoard[]>([]);
const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
const [lists, setLists] = useState<TrelloList[]>([]);
const [selectedList, setSelectedList] = useState<string | null>(null);
const [cards, setCards] = useState<TrelloCard[]>([]);
const [error, setError] = useState<string | null>(null); // NOVO

// Interface para cardForm
interface CardFormData {
  name: string;
  desc: string;
  due: string;
}
const [cardForm, setCardForm] = useState<CardFormData>({ name: '', desc: '', due: '' });
const [editingCard, setEditingCard] = useState<TrelloCard | null>(null);

// Handlers tipados
const handleBoardSelect = async (boardId: string) => { ... };
const handleListSelect = async (listId: string) => { ... };
const handleEditCard = (card: TrelloCard) => { ... };
const handleDeleteCard = async (cardId: string) => { ... };
```

---

### 3.2 Remover tipos `any` das rotas Trello

**Arquivos:**
- `app/api/trello/webhook/route.ts` (linhas 13-15)
- `app/api/trello/config/route.ts` (linha 175)

**Substituir:**
```typescript
// De:
type SupabaseClient = any;

// Para:
import { SupabaseClient } from '@supabase/supabase-js';
```

---

### 3.3 Consolidar tipos duplicados

**Arquivo:** `app/api/lib/trello.ts`

**Ação:** Mover `TrelloCardMapping` interface do `webhook/route.ts` para `trello.ts` e importar

**Antes (webhook/route.ts:26-30):**
```typescript
interface TrelloCardMapping {
    id: string;
    opportunity_id: string;
    trello_card_id: string;
}
```

**Depois:**
```typescript
import { TrelloCardMapping } from '../lib/trello';
```

---

## Fase 4: UX e Tratamento de Erros no Frontend (Alta Prioridade)

### 4.1 Adicionar tratamento de erros nos useEffect

**Arquivo:** `components/TrelloDashboard.tsx`

**useEffect de boards (linhas 23-29):**
```typescript
useEffect(() => {
  const loadBoards = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTrelloBoards();
      setBoards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar boards');
      console.error('Failed to load boards:', err);
    } finally {
      setLoading(false);
    }
  };
  loadBoards();
}, []);
```

**Aplicar mesmo padrão em:**
- `handleBoardSelect` (linhas 31-39)
- `handleListSelect` (linhas 41-47)

---

### 4.2 Corrigir handleDeleteCard com rollback

**Arquivo:** `components/TrelloDashboard.tsx` (linhas 62-68)

**Antes (problemático):**
```typescript
const handleDeleteCard = async (cardId) => {
  if (!window.confirm(...)) return;
  setCardActionLoading(true);
  await deleteTrelloCard(cardId);
  setCards(cards.filter(c => c.id !== cardId)); // Executa mesmo se API falhar
  setCardActionLoading(false);
};
```

**Depois (com rollback):**
```typescript
const handleDeleteCard = async (cardId: string) => {
  if (!window.confirm('Tem certeza que deseja excluir este card?')) return;

  const previousCards = [...cards]; // Backup para rollback

  try {
    setCardActionLoading(true);
    setCards(cards.filter(c => c.id !== cardId)); // Otimistic update
    await deleteTrelloCard(cardId);
  } catch (err) {
    setCards(previousCards); // Rollback em caso de erro
    setError(err instanceof Error ? err.message : 'Erro ao excluir card');
  } finally {
    setCardActionLoading(false);
  }
};
```

---

### 4.3 Substituir alert() por toast/notificação

**Arquivo:** `components/TrelloDashboard.tsx` (linha 85)

**Implementação:** Usar sistema de notificações existente ou criar componente Toast

```typescript
// Antes:
catch (err) {
  alert('Erro ao salvar card');
}

// Depois:
catch (err) {
  setError(err instanceof Error ? err.message : 'Erro ao salvar card');
}

// E no JSX adicionar:
{error && (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
    {error}
    <button onClick={() => setError(null)} className="ml-2">×</button>
  </div>
)}
```

---

### 4.4 Melhorar loading states

**Arquivo:** `components/TrelloDashboard.tsx`

**Adicionar estados específicos:**
```typescript
const [loadingBoards, setLoadingBoards] = useState(false);
const [loadingLists, setLoadingLists] = useState(false);
const [loadingCards, setLoadingCards] = useState(false);
```

**No JSX, mostrar loading contextual:**
```typescript
{loadingBoards && <span className="ml-2 text-gray-500">Carregando boards...</span>}
{loadingLists && <span className="ml-2 text-gray-500">Carregando listas...</span>}
{loadingCards && <span className="ml-2 text-gray-500">Carregando cards...</span>}
```

---

### 4.5 Corrigir SettingsModal - não fechar em caso de erro

**Arquivo:** `components/SettingsModal.tsx` (linhas 172-210)

**Antes:**
```typescript
const handleSave = () => {
  // ...
  saveTrelloConfig(trelloConfig).catch(err => {
    console.warn('Failed to save Trello config:', err);
  });
  onClose(); // Fecha mesmo se falhar!
};
```

**Depois:**
```typescript
const handleSave = async () => {
  try {
    setSaving(true);
    await saveTrelloConfig(trelloConfig);
    onClose();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Erro ao salvar configurações');
    // NÃO fecha o modal
  } finally {
    setSaving(false);
  }
};
```

---

## Fase 5: Serviço Frontend (Média Prioridade)

### 5.1 Melhorar handleResponse com tipos de erro específicos

**Arquivo:** `services/trelloService.ts` (linhas 96-102)

```typescript
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));

    // Mensagens específicas por status
    const message = response.status === 401
      ? 'Sessão expirada. Faça login novamente.'
      : response.status === 403
      ? 'Você não tem permissão para esta ação.'
      : response.status === 404
      ? 'Recurso não encontrado.'
      : error.error || error.message || 'Erro na requisição';

    throw new ApiError(message, response.status, error.code);
  }
  return response.json();
}
```

---

### 5.2 Adicionar versionamento ao localStorage

**Arquivo:** `services/trelloService.ts`

```typescript
const TRELLO_CONFIG_KEY = 'trello_config';
const TRELLO_CONFIG_VERSION = 1;

interface StoredTrelloConfig extends Partial<TrelloConfig> {
  _version: number;
}

export function getTrelloConfigLocal(): Partial<TrelloConfig> | null {
  const stored = localStorage.getItem(TRELLO_CONFIG_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as StoredTrelloConfig;
    // Invalida config de versão antiga
    if (parsed._version !== TRELLO_CONFIG_VERSION) {
      clearTrelloConfigLocal();
      return null;
    }
    const { _version, ...config } = parsed;
    return config;
  } catch {
    return null;
  }
}

export function saveTrelloConfigLocal(config: Partial<TrelloConfig>): void {
  const toStore: StoredTrelloConfig = { ...config, _version: TRELLO_CONFIG_VERSION };
  localStorage.setItem(TRELLO_CONFIG_KEY, JSON.stringify(toStore));
}
```

---

## Fase 6: Limpeza e Refatoração (Baixa Prioridade)

### 6.1 Remover eslint-disable desnecessários

**Arquivos:**
- `app/api/trello/webhook/route.ts` (linhas 14-15)
- `app/api/trello/config/route.ts` (linha 174)

**Ação:** Após adicionar tipagem correta, remover comentários `// eslint-disable-next-line`

---

### 6.2 Otimizar filter durante render

**Arquivo:** `components/TrelloDashboard.tsx` (linha 146)

**Antes:**
```typescript
{cards.filter(card => card && card.name).map(card => ...)}
```

**Depois:** Usar useMemo para evitar recálculo a cada render
```typescript
const validCards = useMemo(() =>
  cards.filter(card => card && card.name && card.name.trim() !== ''),
  [cards]
);

// No JSX:
{validCards.map(card => ...)}
```

---

### 6.3 Adicionar validação de inputs

**Arquivo:** `components/TrelloDashboard.tsx`

```typescript
// Constantes de validação
const MAX_CARD_NAME_LENGTH = 100;
const MAX_CARD_DESC_LENGTH = 5000;

// No input de nome:
<input
  maxLength={MAX_CARD_NAME_LENGTH}
  value={cardForm.name}
  onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
/>
<span className="text-xs text-gray-500">
  {cardForm.name.length}/{MAX_CARD_NAME_LENGTH}
</span>
```

---

## Ordem de Execução Recomendada

| Ordem | Fase | Itens | Prioridade |
|-------|------|-------|------------|
| 1 | 1.1 | Criar auth.ts centralizado | Crítico |
| 2 | 1.2 | Corrigir wrapper Supabase | Crítico |
| 3 | 1.3 | Criar config.ts | Crítico |
| 4 | 2.1-2.4 | Segurança e erros backend | Crítico |
| 5 | 3.1 | Tipagem TrelloDashboard | Alta |
| 6 | 4.1-4.3 | Erros e UX frontend | Alta |
| 7 | 4.4-4.5 | Loading states e SettingsModal | Alta |
| 8 | 3.2-3.3 | Remover any e consolidar tipos | Média |
| 9 | 5.1-5.2 | Melhorar trelloService | Média |
| 10 | 6.1-6.3 | Limpeza e otimização | Baixa |

---

## Arquivos a Criar

1. `app/api/lib/auth.ts` - Utilitário de autenticação JWT
2. `app/api/lib/config.ts` - Configuração centralizada de env vars

## Arquivos a Modificar

### Backend (14 arquivos):
- `app/api/lib/supabase.ts`
- `app/api/auth/login/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/trello/config/route.ts`
- `app/api/trello/test-connection/route.ts`
- `app/api/trello/boards/route.ts`
- `app/api/trello/cards/route.ts`
- `app/api/trello/cards/[cardId]/route.ts`
- `app/api/trello/cards/[cardId]/move/route.ts`
- `app/api/trello/cards/[cardId]/comments/route.ts`
- `app/api/trello/boards/[boardId]/lists/route.ts`
- `app/api/trello/boards/[boardId]/labels/route.ts`
- `app/api/trello/webhook/route.ts`
- `app/api/trello/sync-opportunity/route.ts`
- `app/api/trello/setup-lists/route.ts`
- `app/api/trello/status/route.ts`

### Frontend (3 arquivos):
- `components/TrelloDashboard.tsx`
- `components/SettingsModal.tsx`
- `services/trelloService.ts`

---

## Critérios de Sucesso

1. ✅ Build passa sem erros TypeScript
2. ✅ Nenhum `console.log` de debug em produção
3. ✅ Todos os erros de API são tratados e exibidos ao usuário
4. ✅ Loading states específicos para cada operação
5. ✅ Rollback em caso de falha de operações otimistas
6. ✅ JWT validado com try/catch em todas as rotas
7. ✅ Código centralizado sem duplicação de env vars
8. ✅ Tipagem completa sem uso de `any`