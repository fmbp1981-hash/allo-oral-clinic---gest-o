# Deploy Guide - ClinicaFlow

Guia completo para fazer deploy do ClinicaFlow no GitHub e Vercel.

## Pré-requisitos

- Conta no [GitHub](https://github.com)
- Conta no [Vercel](https://vercel.com)
- Conta no [Supabase](https://supabase.com) (para banco de dados)
- [Git](https://git-scm.com/) instalado
- [Node.js](https://nodejs.org/) v18+ instalado

---

## Passo 1: Preparar Repositório GitHub

### 1.1 Criar Repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Nome: `clinicaflow` (ou outro nome de sua preferência)
3. Descrição: "Sistema de gestão e reativação de pacientes para clínicas odontológicas"
4. Deixe como **Privado** (recomendado) ou Público
5. **NÃO** inicialize com README, .gitignore ou LICENSE
6. Clique em **Create repository**

### 1.2 Conectar Projeto Local ao GitHub

No terminal, dentro da pasta do projeto:

```bash
# Inicializar Git (se ainda não estiver inicializado)
git init

# Adicionar todos os arquivos
git add .

# Fazer commit inicial
git commit -m "feat: initial commit - ClinicaFlow v1.0"

# Adicionar remote do GitHub (substitua USERNAME e REPO_NAME)
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Push para o GitHub
git push -u origin main
```

> **Nota**: Se o branch padrão for `master` ao invés de `main`, use:
> ```bash
> git branch -M main
> git push -u origin main
> ```

---

## Passo 2: Configurar Supabase

### 2.1 Criar Projeto no Supabase

1. Acesse [app.supabase.com](https://app.supabase.com)
2. Clique em **New Project**
3. Preencha:
   - **Name**: `clinicaflow-prod`
   - **Database Password**: Escolha uma senha forte
   - **Region**: Escolha a região mais próxima (ex: South America - São Paulo)
4. Clique em **Create new project** e aguarde ~2 minutos

### 2.2 Executar Migrations

1. No Supabase, vá em **SQL Editor**
2. Clique em **New query**
3. Copie e cole o conteúdo de `backend/supabase/schema.sql`
4. Clique em **Run** (F5)
5. Repita para cada migration em `backend/supabase/migrations/`:
   - `001_initial_schema.sql` (se existe)
   - `002_add_notifications.sql` (se existe)
   - `003_add_user_roles.sql` ✅

### 2.3 Obter Credenciais

1. No Supabase, vá em **Settings** → **API**
2. Copie:
   - **URL** (Project URL)
   - **anon public** (API Key)
3. Guarde essas informações - você vai precisar no Vercel

---

## Passo 3: Deploy do Backend

### 3.1 Opção A: Deploy no Vercel (Recomendado)

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe o repositório do GitHub
3. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. Adicione as **Environment Variables**:
   ```
   PORT=3001
   NODE_ENV=production
   SUPABASE_URL=sua_url_do_supabase
   SUPABASE_ANON_KEY=sua_key_do_supabase
   JWT_SECRET=gere_uma_chave_secreta_aqui
   JWT_REFRESH_SECRET=gere_outra_chave_secreta_aqui
   FRONTEND_URL=https://seu-frontend.vercel.app
   WHATSAPP_EVOLUTION_BASE_URL=http://localhost:8080
   WHATSAPP_EVOLUTION_INSTANCE_NAME=clinicaflow
   WHATSAPP_EVOLUTION_API_KEY=sua_api_key_evolution
   ```

   > **Dica**: Para gerar secrets seguros:
   > ```bash
   > node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   > ```

5. Clique em **Deploy**

### 3.2 Opção B: Deploy no Railway

1. Acesse [railway.app](https://railway.app)
2. Clique em **New Project** → **Deploy from GitHub repo**
3. Selecione o repositório
4. Configure da mesma forma que o Vercel
5. Railway vai detectar automaticamente o Node.js

---

##  Passo 4: Deploy do Frontend

### 4.1 Deploy no Vercel

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe o mesmo repositório do GitHub (ou crie novo projeto)
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (raiz)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. Adicione as **Environment Variables**:
   ```
   VITE_API_URL=https://seu-backend.vercel.app
   VITE_WHATSAPP_EVOLUTION_BASE_URL=http://localhost:8080
   VITE_WHATSAPP_EVOLUTION_INSTANCE_NAME=clinicaflow
   VITE_WHATSAPP_EVOLUTION_API_KEY=sua_api_key
   ```

5. Clique em **Deploy**

---

## Passo 5: Configurar Domínios (Opcional)

### Frontend
1. No Vercel, vá em **Settings** → **Domains**
2. Adicione seu domínio customizado (ex: `app.clinicaflow.com`)
3. Configure DNS conforme instruções do Vercel

### Backend
1. Faça o mesmo para o backend (ex: `api.clinicaflow.com`)
2. Atualize a variável `VITE_API_URL` do frontend com a nova URL

---

## Passo 6: Definir Usuário Admin

Após o deploy, você precisa definir o usuário admin no banco:

1. No Supabase, vá em **SQL Editor**
2. Execute:
   ```sql
   UPDATE users 
   SET role = 'admin' 
   WHERE email = 'fmbp1981@gmail.com';
   ```

---

## Passo 7: Verificações Pós-Deploy

### Backend
- [ ] Testar health check: `https://seu-backend.vercel.app/health`
- [ ] Verificar logs no Vercel Dashboard
- [ ] Testar login

### Frontend
- [ ] Acessar aplicação: `https://seu-frontend.vercel.app`
- [ ] Testar login com usuário admin
- [ ] Verificar se botão "Integrações" aparece (apenas para admin)
- [ ] Testar dark mode
- [ ] Testar drag and drop no Pipeline
- [ ] Testar envio de mensagem WhatsApp

---

## Troubleshooting

### Erro de CORS
Se aparecer erro de CORS, verifique:
1. Variável `FRONTEND_URL` está correta no backend
2. URL do backend está correta no frontend (`VITE_API_URL`)

### Banco de dados vazio
1. Verifique se as migrations foram executadas
2. Execute o schema.sql novamente no Supabase

### WhatsApp não funciona
1. Veri fique se o Evolution API está rodando
2. Configure as variáveis `VITE_WHATSAPP_*`
3. Em desenvolvimento, vai abrir WhatsApp Web como fallback

---

## Atualizações Futuras

Para atualizar o deploy:

```bash
# Fazer mudanças no código
git add .
git commit -m "feat: sua descrição"
git push origin main
```

O Vercel vai fazer deploy automaticamente!

---

## Suporte

Em caso de problemas:
1. Verifique os logs no Vercel Dashboard
2. Verifique os logs no Supabase Dashboard
3. Consulte a documentação do projeto

---

**Desenvolvido por IntelliX.AI** 🧠
