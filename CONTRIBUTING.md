# 🤝 Guia de Contribuição - ClinicaFlow

Obrigado por considerar contribuir com o ClinicaFlow! Este documento fornece diretrizes e melhores práticas para contribuir com o projeto.

---

## 📋 Índice

1. [Código de Conduta](#código-de-conduta)
2. [Como Contribuir](#como-contribuir)
3. [Configuração do Ambiente](#configuração-do-ambiente)
4. [Padrões de Código](#padrões-de-código)
5. [Commits e Branches](#commits-e-branches)
6. [Pull Requests](#pull-requests)
7. [Reportando Bugs](#reportando-bugs)
8. [Sugerindo Features](#sugerindo-features)

---

## Código de Conduta

### Nossos Princípios

- **Seja respeitoso**: Trate todos com respeito e consideração.
- **Seja construtivo**: Feedback deve ser construtivo e orientado a soluções.
- **Seja inclusivo**: Acolha contribuidores de todos os níveis de experiência.
- **Seja profissional**: Mantenha discussões focadas no projeto.

### Comportamento Inaceitável

- Linguagem ou imagens ofensivas
- Ataques pessoais ou políticos
- Assédio público ou privado
- Divulgação de informações privadas sem permissão

---

## Como Contribuir

### Tipos de Contribuição

1. **🐛 Correção de Bugs**: Identificar e corrigir problemas
2. **✨ Novas Features**: Implementar funcionalidades
3. **📝 Documentação**: Melhorar ou adicionar documentação
4. **🧪 Testes**: Adicionar ou melhorar cobertura de testes
5. **🎨 UI/UX**: Melhorias de interface e experiência
6. **🔧 Refatoração**: Melhorar qualidade do código

### Fluxo de Contribuição

```
1. Fork do repositório
         │
         ▼
2. Clone do seu fork
         │
         ▼
3. Criar branch para sua feature/fix
         │
         ▼
4. Desenvolver e testar
         │
         ▼
5. Commit seguindo convenções
         │
         ▼
6. Push para seu fork
         │
         ▼
7. Abrir Pull Request
         │
         ▼
8. Code Review
         │
         ▼
9. Merge (após aprovação)
```

---

## Configuração do Ambiente

### Pré-requisitos

- Node.js 20+
- npm 10+
- Git
- Conta no Supabase (para desenvolvimento com banco real)

### Setup Inicial

```bash
# 1. Fork e clone
git clone https://github.com/SEU_USUARIO/clinicaflow.git
cd clinicaflow

# 2. Instalar dependências do frontend
npm install

# 3. Instalar dependências do backend
cd backend
npm install
cd ..

# 4. Configurar variáveis de ambiente
cp backend/.env.example backend/.env
# Edite o arquivo .env com suas credenciais

# 5. Iniciar em modo desenvolvimento
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
npm run dev
```

### Estrutura de Diretórios

```
clinicaflow/
├── App.tsx              # Componente principal
├── components/          # Componentes React
├── hooks/               # Hooks customizados
├── services/            # Services de API
├── types.ts             # Interfaces TypeScript
├── backend/             # API Node.js
│   ├── src/
│   │   ├── controllers/ # Lógica de negócio
│   │   ├── routes/      # Definição de rotas
│   │   ├── middlewares/ # Auth, validation, etc
│   │   ├── services/    # Services backend
│   │   └── lib/         # Utilitários
│   └── tests/           # Testes do backend
├── tests/               # Testes E2E
└── docs/                # Documentação
```

---

## Padrões de Código

### TypeScript

```typescript
// ✅ BOM: Tipagem explícita
interface Patient {
    id: string;
    name: string;
    phone: string;
    email?: string;
}

const getPatient = async (id: string): Promise<Patient> => {
    // ...
};

// ❌ RUIM: any ou tipagem implícita
const getPatient = async (id) => {
    // ...
};
```

### React Components

```tsx
// ✅ BOM: Componente funcional com tipagem
interface ButtonProps {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    label,
    onClick,
    variant = 'primary',
    disabled = false,
}) => {
    return (
        <button
            className={cn(buttonVariants[variant], disabled && 'opacity-50')}
            onClick={onClick}
            disabled={disabled}
        >
            {label}
        </button>
    );
};

// ❌ RUIM: Props não tipadas, export default anônimo
export default function({ label, onClick, ...props }) {
    return <button {...props}>{label}</button>;
}
```

### Nomenclatura

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Componentes | PascalCase | `PatientDetailsModal` |
| Hooks | camelCase com `use` | `useDebounce` |
| Funções | camelCase | `formatPhoneNumber` |
| Constantes | UPPER_SNAKE_CASE | `MAX_ITEMS_PER_PAGE` |
| Arquivos componentes | PascalCase.tsx | `LoginPage.tsx` |
| Arquivos utilitários | camelCase.ts | `formatters.ts` |
| Testes | *.test.ts ou *.spec.ts | `auth.controller.test.ts` |

### Backend Controllers

```typescript
// ✅ BOM: Controller com tratamento de erros adequado
export const getPatients = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const tenantId = req.user?.tenantId;

        if (!userId || !tenantId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) {
            logger.error('Error fetching patients:', error);
            return res.status(500).json({ error: 'Error fetching patients' });
        }

        res.json(data || []);
    } catch (error: any) {
        logger.error('Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
```

### CSS/Tailwind

```tsx
// ✅ BOM: Classes organizadas e responsivas
<div className="
    flex flex-col md:flex-row
    gap-4 p-4
    bg-white dark:bg-gray-800
    rounded-lg shadow-md
    hover:shadow-lg transition-shadow
">

// ❌ RUIM: Classes desorganizadas
<div className="p-4 hover:shadow-lg bg-white flex gap-4 rounded-lg shadow-md dark:bg-gray-800 flex-col md:flex-row transition-shadow">
```

---

## Commits e Branches

### Conventional Commits

Seguimos a convenção [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

#### Tipos de Commit

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| `feat` | Nova feature | `feat(auth): add password reset flow` |
| `fix` | Correção de bug | `fix(kanban): fix drag-and-drop on mobile` |
| `docs` | Documentação | `docs: update API documentation` |
| `style` | Formatação (sem mudança de lógica) | `style: format code with prettier` |
| `refactor` | Refatoração | `refactor(api): simplify error handling` |
| `test` | Testes | `test(patient): add unit tests` |
| `chore` | Manutenção | `chore: update dependencies` |
| `perf` | Performance | `perf(query): optimize patient search` |

#### Exemplos de Commits

```bash
# Feature
git commit -m "feat(notifications): add real-time WebSocket support"

# Bug fix
git commit -m "fix(auth): resolve token refresh race condition"

# Breaking change
git commit -m "feat(api)!: change patient endpoint response format

BREAKING CHANGE: The patients endpoint now returns paginated results.
Update your client code to handle the new { data, pagination } format."
```

### Branches

| Tipo | Padrão | Exemplo |
|------|--------|---------|
| Feature | `feature/<description>` | `feature/whatsapp-integration` |
| Bug fix | `fix/<description>` | `fix/login-validation` |
| Hotfix | `hotfix/<description>` | `hotfix/critical-auth-bug` |
| Docs | `docs/<description>` | `docs/api-documentation` |
| Refactor | `refactor/<description>` | `refactor/cleanup-services` |

```bash
# Criar branch de feature
git checkout -b feature/export-pdf

# Trabalhar na feature
git add .
git commit -m "feat(export): add PDF export functionality"

# Push
git push origin feature/export-pdf
```

---

## Pull Requests

### Antes de Abrir um PR

1. **Atualize sua branch**: Faça rebase com a branch principal
2. **Rode os testes**: Certifique-se que passam localmente
3. **Verifique lint**: Execute `npm run lint`
4. **Teste manualmente**: Verifique que a feature funciona

### Template de PR

```markdown
## Descrição

Breve descrição do que foi alterado e por quê.

## Tipo de Mudança

- [ ] Bug fix (correção não-breaking)
- [ ] Nova feature (funcionalidade não-breaking)
- [ ] Breaking change (correção/feature que quebra compatibilidade)
- [ ] Documentação

## Como Testar

1. Passo 1
2. Passo 2
3. Resultado esperado

## Checklist

- [ ] Meu código segue os padrões do projeto
- [ ] Realizei self-review do código
- [ ] Adicionei comentários em áreas complexas
- [ ] Atualizei a documentação
- [ ] Adicionei/atualizei testes
- [ ] Testes passam localmente
- [ ] Não há novos warnings

## Screenshots (se aplicável)

| Antes | Depois |
|-------|--------|
| screenshot | screenshot |
```

### Code Review

**Como reviewer**:
- Seja respeitoso e construtivo
- Explique o "porquê" das sugestões
- Diferencie entre bloqueadores e sugestões
- Aprove quando estiver satisfeito

**Como autor**:
- Responda a todos os comentários
- Não leve críticas para o lado pessoal
- Agradeça o tempo do reviewer

---

## Reportando Bugs

### Template de Bug Report

```markdown
## Descrição do Bug

Descrição clara e concisa do que aconteceu.

## Passos para Reproduzir

1. Ir para '...'
2. Clicar em '...'
3. Rolar até '...'
4. Ver o erro

## Comportamento Esperado

O que deveria ter acontecido.

## Comportamento Atual

O que realmente aconteceu.

## Screenshots

Se aplicável, adicione screenshots.

## Ambiente

- OS: [ex: Windows 11]
- Browser: [ex: Chrome 120]
- Versão: [ex: 4.1.0]

## Contexto Adicional

Qualquer informação adicional relevante.
```

### Antes de Reportar

1. **Verifique issues existentes**: O bug já foi reportado?
2. **Reproduza o problema**: Consegue reproduzir consistentemente?
3. **Colete informações**: Console logs, network requests, etc.

---

## Sugerindo Features

### Template de Feature Request

```markdown
## Problema

Descrição clara do problema que esta feature resolveria.

## Solução Proposta

Descrição clara da solução desejada.

## Alternativas Consideradas

Outras soluções consideradas e por que foram descartadas.

## Contexto Adicional

Mockups, exemplos de outras aplicações, etc.
```

### Critérios de Avaliação

Features são avaliadas por:

1. **Alinhamento**: Está alinhada com os objetivos do projeto?
2. **Impacto**: Quantos usuários serão beneficiados?
3. **Esforço**: Qual o esforço de implementação?
4. **Manutenção**: Qual o custo de manutenção a longo prazo?

---

## Recursos Adicionais

### Links Úteis

- [Documentação da API](./docs/API.md)
- [Arquitetura do Sistema](./docs/ARCHITECTURE.md)
- [Schema do Banco](./docs/DATABASE.md)
- [Documentação de Componentes](./docs/COMPONENTS.md)

### Contato

- **Issues**: Para bugs e features
- **Discussions**: Para dúvidas e discussões gerais
- **Email**: dev@clinicaflow.com

---

## Agradecimentos

Obrigado por dedicar seu tempo para contribuir com o ClinicaFlow! 🎉

Cada contribuição, grande ou pequena, ajuda a tornar o projeto melhor para todos.
