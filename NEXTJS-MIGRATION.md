# Migração para Next.js

## Resumo

O projeto foi migrado de Vite para Next.js mantendo compatibilidade retroativa. Ambos os sistemas de build funcionam paralelamente.

## Estrutura

```
app/
├── layout.tsx      # Layout root com metadata, fonts, scripts CDN
├── page.tsx        # Página principal (importa App.tsx dinamicamente)
├── globals.css     # Importa ../index.css existente
```

## Scripts Disponíveis

### Vite (modo legado)
```bash
npm run dev       # Desenvolvimento com Vite (porta 5173)
npm run build     # Build de produção → dist/
```

### Next.js (recomendado)
```bash
npm run dev:next   # Desenvolvimento com Next.js (porta 3000)
npm run build:next # Build de produção → out/
npm run start:next # Servidor estático para testar build
```

## Variáveis de Ambiente

As variáveis foram migradas de `VITE_*` para `NEXT_PUBLIC_*`:

| Antes (Vite)              | Depois (Next.js)               |
|---------------------------|--------------------------------|
| VITE_API_URL              | NEXT_PUBLIC_API_URL            |
| VITE_WHATSAPP_*           | NEXT_PUBLIC_WHATSAPP_*         |

**Nota:** Para compatibilidade, o `vite.config.ts` também injeta as variáveis `NEXT_PUBLIC_*` quando usando Vite.

## Arquivos de Configuração

- **next.config.mjs** - Configuração Next.js (static export, ESLint ignorado)
- **tsconfig.json** - Modificado para suportar Next.js
- **tailwind.config.js** - Atualizado com `app/**` no content

## Dockerfile

O Dockerfile foi atualizado para usar Next.js:
- Build: `node ./node_modules/next/dist/bin/next build`
- Output: pasta `out/` (static export)
- Variável: `NEXT_PUBLIC_API_URL=/api`

## Pontos Importantes

### SSR Desativado
O aplicativo é 100% client-side (usa localStorage, socket.io, etc.). Por isso:
- `app/page.tsx` usa `dynamic(..., { ssr: false })`
- Next.js gera arquivos estáticos sem prerendering

### Proxy de API
Em desenvolvimento, Next.js não tem proxy configurado por padrão. Use:
- Vite dev: `/api` → proxy para `localhost:3001`
- Next.js dev: Configure `.env.local` com `NEXT_PUBLIC_API_URL=http://localhost:3001/api`
- Produção: Nginx faz proxy `/api` → backend

## Validações

- ✅ `npm run build` (Vite) funciona
- ✅ `npm run build:next` (Next.js) funciona
- ✅ `npm run dev:next` inicia servidor de desenvolvimento
- ✅ Build gera pasta `out/` com arquivos estáticos

## Próximos Passos (Opcionais)

1. **Remover Vite** - Após validação completa, pode remover:
   - `vite.config.ts`
   - `vite-env.d.ts`
   - `index.html` (root)
   - Dependências: `vite`, `@vitejs/plugin-react`

2. **Migrar para App Router** - Criar rotas separadas:
   - `/login` → `app/login/page.tsx`
   - `/dashboard` → `app/dashboard/page.tsx`

3. **SSR/SSG** - Habilitar renderização no servidor para páginas que não usam browser APIs
