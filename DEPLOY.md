# 🚀 Guia de Deploy - ClinicaFlow

Deploy completo do sistema ClinicaFlow em produção usando serviços gratuitos/acessíveis.

---

## 📋 Pré-requisitos

- [x] Conta no [Supabase](https://supabase.com) (Banco de dados)
- [x] Conta no [Render](https://render.com) (Backend - Free tier)
- [x] Conta no [Vercel](https://vercel.com) (Frontend - Free tier)
- [x] GitHub account (para integração CI/CD)

---

## 🗄️ Passo 1: Configurar Banco de Dados (Supabase)

### 1.1 Criar Projeto

```bash
1. Acesse https://supabase.com/dashboard
2. Clique em "New Project"
3. Preencha:
   - Name: ClinicaFlow Production
   - Database Password: [SENHA_FORTE - Anote!]
   - Region: South America (São Paulo)
4. Aguarde ~2 minutos para provisionar
```

### 1.2 Executar Migrations

```sql
-- No Supabase Dashboard → SQL Editor

-- 1. Migration inicial (criar tabelas)
-- Cole o conteúdo de: backend/supabase/migrations/01_create_tables.sql

-- 2. Adicionar user_id a notifications
-- Cole o conteúdo de: backend/supabase/migrations/02_add_user_id_to_notifications.sql

-- 3. Seed data (opcional - apenas para demonstração)
-- Cole o conteúdo de: backend/supabase/migrations/03_seed_data.sql
```

### 1.3 Obter Credenciais

```bash
# No Supabase Dashboard → Project Settings → API

Anote:
- Project URL: https://xxxxxxxxxxxxx.supabase.co
- anon/public key: eyJhbGc...
- service_role key: eyJhbGc... (SECRET - não compartilhar!)
```

---

## ⚙️ Passo 2: Deploy do Backend (Render.com)

### 2.1 Preparar Repositório

```bash
# 1. Push do código para GitHub
git init
git add .
git commit -m "feat: ClinicaFlow production ready"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/allo-oral-clinic-backend.git
git push -u origin main
```

### 2.2 Criar Web Service no Render

```bash
1. Acesse https://dashboard.render.com
2. Clique em "New +" → "Web Service"
3. Conecte seu repositório GitHub
4. Configurar:
   - Name: clinicaflow-backend
   - Region: Oregon (ou mais próximo)
   - Branch: main
   - Root Directory: backend
   - Runtime: Node
   - Build Command: npm install && npm run build
   - Start Command: npm start
   - Plan: Free
```

### 2.3 Configurar Variáveis de Ambiente

```bash
# No Render Dashboard → Environment

Adicionar:

NODE_ENV=production
PORT=3001

# Supabase
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# CORS
FRONTEND_URL=https://seu-app.vercel.app

# JWT (gerar com: openssl rand -base64 32)
JWT_SECRET=sua_chave_secreta_aqui_32_caracteres

# Logging
LOG_LEVEL=info
```

### 2.4 Deploy

```bash
1. Clique em "Create Web Service"
2. Aguarde ~5 minutos para build e deploy
3. Acesse a URL fornecida: https://clinicaflow-backend.onrender.com
4. Teste: https://clinicaflow-backend.onrender.com/health

Resposta esperada:
{
  "status": "ok",
  "socketio": { "connected": 0 }
}
```

---

## 🎨 Passo 3: Deploy do Frontend (Vercel)

### 3.1 Preparar para Deploy

```bash
# Criar arquivo vercel.json na raiz do projeto
```

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/assets/(.*)",
      "dest": "/assets/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### 3.2 Deploy via Vercel CLI

**Opção A: Via Dashboard (Recomendado)**

```bash
1. Acesse https://vercel.com/new
2. Import Git Repository
3. Selecione seu repositório GitHub
4. Configure:
   - Framework Preset: Vite
   - Root Directory: ./
   - Build Command: npm run build
   - Output Directory: dist
5. Environment Variables:
   - VITE_API_URL = https://clinicaflow-backend.onrender.com
6. Deploy!
```

**Opção B: Via CLI**

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Adicionar variável de ambiente
vercel env add VITE_API_URL
# Cole: https://clinicaflow-backend.onrender.com
```

### 3.3 Verificar Deploy

```bash
# Acesse a URL fornecida
https://clinicaflow.vercel.app

# Verificar:
✓ Página carrega corretamente
✓ Console sem erros (F12)
✓ Socket.io conecta ao backend
✓ Login funciona
✓ Notificações aparecem
```

---

## 🔐 Passo 4: Configurar SSL e Domínio (Opcional)

### 4.1 Domínio Customizado

**Vercel (Frontend):**
```bash
1. Dashboard → Settings → Domains
2. Adicione: app.clinicaflow.com.br
3. Configure DNS do seu domínio:
   - Type: CNAME
   - Name: app
   - Value: cname.vercel-dns.com
```

**Render (Backend):**
```bash
1. Dashboard → Settings → Custom Domain
2. Adicione: api.clinicaflow.com.br
3. Configure DNS:
   - Type: CNAME
   - Name: api
   - Value: clinicaflow-backend.onrender.com
```

### 4.2 Atualizar Variáveis de Ambiente

```bash
# Render → Environment
FRONTEND_URL=https://app.clinicaflow.com.br

# Vercel → Environment Variables
VITE_API_URL=https://api.clinicaflow.com.br
```

---

## 📊 Passo 5: Monitoramento (Opcional)

### 5.1 Sentry (Erro Tracking)

```bash
# Criar conta em https://sentry.io

# Instalar no backend
cd backend
npm install @sentry/node @sentry/tracing

# Instalar no frontend
npm install @sentry/react @sentry/tracing
```

**Backend - `backend/src/server.ts`:**

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://xxxxx@xxxxx.ingest.sentry.io/xxxxx",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

**Frontend - `main.tsx`:**

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://xxxxx@xxxxx.ingest.sentry.io/xxxxx",
  environment: import.meta.env.MODE,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

### 5.2 Analytics (Google Analytics)

```html
<!-- index.html -->
<head>
  <!-- Global site tag (gtag.js) - Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-XXXXXXXXXX');
  </script>
</head>
```

---

## 🧪 Passo 6: Testes em Produção

### 6.1 Smoke Tests

```bash
# 1. Health Check Backend
curl https://api.clinicaflow.com.br/health

# 2. Criar notificação de teste
curl -X POST https://api.clinicaflow.com.br/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deploy Teste",
    "message": "Sistema em produção!",
    "type": "success"
  }'

# 3. Verificar Frontend
- Acesse https://app.clinicaflow.com.br
- Faça login
- Verifique se notificação apareceu em tempo real
- Teste todas as funcionalidades principais
```

### 6.2 Performance Tests

```bash
# Lighthouse (Google Chrome DevTools)
1. Abrir DevTools (F12)
2. Aba "Lighthouse"
3. Gerar relatório

Metas:
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90
```

---

## 🔄 Passo 7: CI/CD (Automação)

### 7.1 GitHub Actions

Criar `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render deploy
        run: curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel deploy
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### 7.2 Configurar Secrets

```bash
# GitHub → Settings → Secrets and variables → Actions

Adicionar:
- RENDER_DEPLOY_HOOK (pegar no Render Dashboard)
- VERCEL_TOKEN (pegar em Vercel → Settings → Tokens)
```

---

## 📝 Checklist Final

### Antes de ir ao ar:

- [ ] Todas as migrations executadas no Supabase
- [ ] Seed data carregado (se necessário)
- [ ] Backend rodando no Render sem erros
- [ ] Frontend rodando no Vercel sem erros
- [ ] Socket.io conectando corretamente
- [ ] CORS configurado corretamente
- [ ] SSL ativo (HTTPS) em ambos
- [ ] Domínio customizado configurado (opcional)
- [ ] Variáveis de ambiente corretas
- [ ] Senhas fortes e seguras
- [ ] Backup do banco configurado
- [ ] Monitoramento ativo (Sentry/Analytics)
- [ ] Smoke tests passando
- [ ] Lighthouse score > 90

### Após deploy:

- [ ] Treinar equipe no uso do sistema
- [ ] Criar documentação de usuário
- [ ] Configurar backups automáticos
- [ ] Monitorar logs diariamente (primeira semana)
- [ ] Coletar feedback dos usuários
- [ ] Planejar próximas features

---

## 🆘 Troubleshooting Produção

### Socket.io não conecta

**Problema:** Frontend não conecta ao Socket.io

**Solução:**
```bash
# Verificar CORS no backend/src/server.ts
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true
};
app.use(cors(corsOptions));

# Verificar se Socket.io está usando HTTP server correto
const httpServer = createServer(app);
notificationService.initializeSocket(httpServer);
httpServer.listen(PORT);  // Não app.listen()!
```

### Erros 502 Bad Gateway

**Problema:** Render retorna 502

**Solução:**
```bash
# Verificar logs no Render Dashboard
# Comum: timeout na build ou start

# Aumentar timeout (render.yaml):
services:
  - type: web
    name: clinicaflow-backend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /health
```

### Build falha no Vercel

**Problema:** `Error: Command "npm run build" exited with 1`

**Solução:**
```bash
# Verificar se VITE_API_URL está configurada
# Verificar se todas as dependências estão no package.json
# Testar build localmente: npm run build
```

---

## 💰 Custos Estimados

### Free Tier (Começar)

- **Supabase:** Free (até 500MB DB, 2GB bandwidth)
- **Render:** Free (15 minutos de build, sleep após 15min inatividade)
- **Vercel:** Free (100GB bandwidth)
- **Total:** R$ 0/mês

### Produção (Escalado)

- **Supabase Pro:** $25/mês (8GB DB, 50GB bandwidth)
- **Render Starter:** $7/mês (no sleep, 512MB RAM)
- **Vercel Pro:** $20/mês (1TB bandwidth)
- **Domínio:** ~R$ 40/ano
- **Total:** ~$52/mês (R$ 260/mês)

---

## 📚 Recursos

- [Supabase Docs](https://supabase.com/docs)
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Socket.io Production Best Practices](https://socket.io/docs/v4/using-multiple-nodes/)

---

**Desenvolvido por:** IntelliX.AI
**Última atualização:** 02/12/2025
**Versão:** 1.0.0
