# 🧪 Frontend Testing Guide - ClinicaFlow

Guia completo para execução e manutenção dos testes automatizados do frontend do ClinicaFlow.

## 📋 Overview

O frontend do ClinicaFlow utiliza **Vitest** e **React Testing Library** para testes, com coverage threshold de **70%** configurado.

### Stack de Testes

- **Vitest**: Test runner moderno (integra perfeitamente com Vite)
- **React Testing Library**: Testes de componentes React
- **@testing-library/user-event**: Simulação de interações do usuário
- **@testing-library/jest-dom**: Matchers customizados para o DOM
- **jsdom**: Ambiente DOM para testes
- **@vitest/coverage-v8**: Cobertura de código

---

## 🚀 Como Rodar os Testes

### Comandos Básicos

```bash
# Rodar todos os testes
npm test

# Rodar testes em watch mode (recomendado durante desenvolvimento)
npm test -- --watch

# Rodar testes com interface UI
npm run test:ui

# Rodar testes com coverage
npm run test:coverage

# Rodar teste específico
npm test -- useDebounce.test.ts

# Rodar testes de um padrão
npm test -- hooks/

# Rodar apenas testes que falharam
npm test -- --reporter=verbose --run
```

### Ver Relatório de Coverage

```bash
npm run test:coverage

# Abrir HTML report
start coverage/index.html  # Windows
open coverage/index.html   # Mac
xdg-open coverage/index.html  # Linux
```

---

## 📁 Estrutura de Testes

```
/
├── tests/
│   ├── setup.ts                       # Setup global dos testes
│   ├── __mocks__/                     # Mocks reutilizáveis
│   │   └── apiService.mock.ts         # Mock do serviço de API
│   ├── utils/                         # Utilitários de teste
│   │   └── test-utils.tsx             # Custom render e helpers
│   ├── hooks/                         # Testes de hooks (4 arquivos)
│   │   ├── useDebounce.test.ts
│   │   ├── useDarkMode.test.tsx
│   │   ├── useToast.test.tsx
│   │   └── useConfirm.test.ts
│   ├── components/                    # Testes de componentes
│   │   ├── Toast.test.tsx
│   │   ├── StatusBadge.test.tsx
│   │   └── StatCard.test.tsx
│   └── integration/                   # Testes de integração
│       └── ToastProvider.integration.test.tsx
├── vitest.config.ts                   # Configuração do Vitest
└── package.json
```

---

## 📝 Testes Implementados

### ✅ Hooks (4 hooks - 100% testados)

#### 1. useDebounce (2 hooks)
- ✅ `useDebounce` - Debounce de valores
  - Retorna valor inicial imediatamente
  - Debounça mudanças de valor
  - Cancela timeout anterior em mudanças rápidas
  - Funciona com diferentes tipos
  - Usa delay padrão de 500ms
- ✅ `useDebouncedCallback` - Debounce de callbacks
  - Debounça execução de callback
  - Cancela chamadas anteriores
  - Funciona com múltiplos argumentos

**Total**: 10 testes | **Coverage**: ~95%

#### 2. useDarkMode
- ✅ Erro quando usado fora do provider
- ✅ Inicializa com preferência do sistema
- ✅ Inicializa do localStorage quando disponível
- ✅ Toggle dark mode
- ✅ Enable dark mode
- ✅ Disable dark mode
- ✅ Persiste preferência
- ✅ Aplica classe dark ao document

**Total**: 8 testes | **Coverage**: ~100%

#### 3. useToast
- ✅ Erro quando usado fora do provider
- ✅ Fornece métodos do context
- ✅ Mostra toast info (default)
- ✅ Mostra toast success
- ✅ Mostra toast error
- ✅ Mostra toast warning
- ✅ Mostra múltiplos toasts
- ✅ Gera IDs únicos
- ✅ Aceita duração customizada

**Total**: 9 testes | **Coverage**: ~90%

#### 4. useConfirm
- ✅ Inicializa com estado fechado
- ✅ Abre dialog com opções fornecidas
- ✅ Promise resolve true ao confirmar
- ✅ Define loading state durante confirmação
- ✅ Promise resolve false ao cancelar
- ✅ Lida com texto customizado de botões
- ✅ Tipo padrão warning
- ✅ Suporta diferentes tipos
- ✅ Fecha com delay após confirmação
- ✅ Lida com múltiplas confirmações sequenciais

**Total**: 10 testes | **Coverage**: ~95%

---

### ✅ Componentes (3 componentes testados)

#### 1. Toast Component
- ✅ Renderiza toast com mensagem
- ✅ Renderiza success toast com estilo correto
- ✅ Renderiza error toast com estilo correto
- ✅ Renderiza warning toast com estilo correto
- ✅ Renderiza info toast com estilo correto
- ✅ Chama onClose ao clicar no botão fechar
- ✅ Auto-fecha após duration
- ✅ Usa duration padrão de 5000ms
- ✅ Não auto-fecha se duration é 0

**ToastContainer**:
- ✅ Renderiza container vazio sem toasts
- ✅ Renderiza múltiplos toasts
- ✅ Renderiza toasts na ordem correta

**Total**: 12 testes | **Coverage**: ~100%

#### 2. StatusBadge Component
- ✅ Renderiza status NEW corretamente
- ✅ Renderiza status SENT corretamente
- ✅ Renderiza status RESPONDED corretamente
- ✅ Renderiza status SCHEDULED corretamente
- ✅ Renderiza status ARCHIVED corretamente
- ✅ Tem classes base corretas
- ✅ Renderiza como elemento span
- ✅ Renderiza todos os status sem erros

**Total**: 8 testes | **Coverage**: ~100%

#### 3. StatCard Component
- ✅ Renderiza label e value
- ✅ Renderiza com valor string
- ✅ Renderiza ícone
- ✅ Renderiza com cor de fundo padrão
- ✅ Renderiza com cor customizada
- ✅ Renderiza tendência para cima
- ✅ Renderiza tendência para baixo
- ✅ Aplica cor verde para tendência up
- ✅ Aplica cor vermelha para tendência down
- ✅ Não renderiza seção de tendência sem trend
- ✅ Tem classes de hover effect
- ✅ Tem estrutura de classes adequada
- ✅ Lida com números grandes
- ✅ Lida com string vazia
- ✅ Lida com tendência neutra

**Total**: 15 testes | **Coverage**: ~100%

---

### ✅ Testes de Integração (1 arquivo)

#### ToastProvider Integration
- ✅ Integra ToastProvider com useToast hook
- ✅ Mostra toast ao clicar no botão
- ✅ Mostra múltiplos toasts de tipos diferentes
- ✅ Remove toast ao clicar no botão fechar

**Total**: 4 testes | **Coverage**: ~95%

---

## 📊 Resumo de Testes

### Status Atual

```
✅ Hooks:           4/4 (100%)   - 37 testes
✅ Componentes:     3/18 (17%)   - 35 testes
✅ Integração:      1 arquivo    - 4 testes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 TOTAL:          76 testes implementados
🎯 Coverage atual: ~50-60% (estimado)
🎯 Meta coverage:  70%
```

### Próximos Testes a Implementar

**Alta Prioridade**:
1. `LoginPage.test.tsx` - Componente de autenticação
2. `KanbanBoard.test.tsx` - Pipeline de oportunidades
3. `PatientsTable.test.tsx` - Tabela principal
4. `DateRangeFilter.test.tsx` - Filtro de datas
5. `ExportMenu.test.tsx` - Menu de exportação

**Média Prioridade**:
6. `SettingsModal.test.tsx` - Configurações
7. `ProfileModal.test.tsx` - Perfil do usuário
8. `NotificationsPopover.test.tsx` - Centro de notificações
9. `Charts.test.tsx` - Gráficos (4 tipos)
10. `LoadingSpinner.test.tsx` - Skeletons

**Baixa Prioridade**:
11. `ScheduleModal.test.tsx`
12. `PatientDetailsModal.test.tsx`
13. `ConfirmModal.test.tsx`
14. `DarkModeToggle.test.tsx`

---

## 🧪 Como Escrever Novos Testes

### Estrutura Básica de Teste

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '../utils/test-utils';
import { MeuComponente } from '../../components/MeuComponente';

describe('MeuComponente', () => {
  it('should render correctly', () => {
    render(<MeuComponente />);

    expect(screen.getByText('Título')).toBeInTheDocument();
  });

  it('should call callback on button click', async () => {
    const handleClick = vi.fn();
    render(<MeuComponente onClick={handleClick} />);

    const button = screen.getByRole('button');
    await userEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Boas Práticas

1. **Usar queries semânticas**: Prefira `getByRole`, `getByLabelText`, `getByText` ao invés de `getByTestId`
2. **Testar comportamento, não implementação**: Foque no que o usuário vê e faz
3. **Usar user-event**: Prefira `userEvent` ao invés de `fireEvent`
4. **Mocks mínimos**: Mock apenas o necessário
5. **Cleanup automático**: O setup.ts já configura cleanup após cada teste
6. **Timers**: Use `vi.useFakeTimers()` para testes com delays

### Queries Recomendadas (em ordem de preferência)

```typescript
// 1. Accessible para todos
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/username/i)

// 2. Queries semânticas
screen.getByAltText(/profile picture/i)
screen.getByTitle(/close/i)

// 3. Texto visível
screen.getByText(/hello world/i)

// 4. Último recurso
screen.getByTestId('custom-element')
```

---

## ⚙️ Configuração

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
```

### Coverage Thresholds

- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

---

## 🐛 Debugging

### Visualizar o DOM durante o teste

```typescript
import { screen } from '@testing-library/react';

it('debug test', () => {
  render(<MeuComponente />);
  screen.debug(); // Imprime o DOM no console
});
```

### Usar Vitest UI

```bash
npm run test:ui
```

Abre uma interface visual para ver os testes em tempo real.

---

## 📚 Recursos

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## ✅ Checklist para Novos Testes

- [ ] Teste renderiza corretamente
- [ ] Teste props são aplicadas
- [ ] Teste interações do usuário (click, type, etc)
- [ ] Teste estados (loading, error, success)
- [ ] Teste callbacks são chamados
- [ ] Teste edge cases
- [ ] Teste acessibilidade básica
- [ ] Coverage >= 70%

---

**Documentação criada por IntelliX.AI** 🧠
**Data**: 02/12/2025
**Versão**: 1.0
