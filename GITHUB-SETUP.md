# 🚀 Como Subir o Projeto no GitHub

Guia completo passo-a-passo para fazer o upload do ClinicaFlow para o GitHub.

---

## 📋 Pré-requisitos

- ✅ Git instalado no seu computador
- ✅ Conta no GitHub criada
- ✅ Projeto funcionando localmente

---

## 🔧 Passo 1: Verificar Segurança

Antes de fazer o commit, confirme que nenhum arquivo sensível será enviado:

```bash
# Voltar para raiz do projeto
cd "C:\Projects\allo-oral-clinic---gestão"

# Verificar se .env está no .gitignore
type .gitignore | findstr ".env"
# Deve mostrar: .env

# Verificar arquivos que serão commitados
git status --ignored

# Se algum arquivo .env aparecercomo "to be committed", PARE e adicione ao .gitignore
```

**✅ Confirmações obrigatórias:**
- [ ] Arquivo `.gitignore` contém `.env`
- [ ] Arquivo `.env.example` existe (SEM credenciais reais)
- [ ] Arquivo `backend/.env.example` existe (SEM credenciais reais)
- [ ] Nenhum `.env` aparece no `git status`

---

## 🌐 Passo 2: Criar Repositório no GitHub

1. **Acesse** [github.com](https://github.com) e faça login

2. **Clique** no botão verde **"New"** (canto superior direito)

3. **Preencha:**
   - **Repository name:** `clinicaflow` (ou nome de sua escolha)
   - **Description:** "Sistema de gestão para clínicas odontológicas com CRM, pipeline Kanban e notificações em tempo real"
   - **Visibility:**
     - ✅ **Public** - Se quiser compartilhar com todos
     - ✅ **Private** - Se quiser manter privado
   - **NÃO marque** "Initialize this repository with a README"
   - **NÃO adicione** .gitignore (já temos um)

4. **Clique** em **"Create repository"**

5. **Copie** a URL do repositório (vai aparecer na tela):
   ```
   https://github.com/SEU-USUARIO/clinicaflow.git
   ```

---

## 💻 Passo 3: Inicializar Git Local

```bash
# Voltar para raiz do projeto
cd "C:\Projects\allo-oral-clinic---gestão"

# Inicializar repositório Git (se ainda não foi feito)
git init

# Verificar branch atual
git branch
# Se não for 'main', renomeie:
git branch -M main

# Adicionar remote do GitHub (SUBSTITUA pela SUA URL)
git remote add origin https://github.com/SEU-USUARIO/clinicaflow.git

# Verificar se o remote foi adicionado
git remote -v
```

**Saída esperada:**
```
origin  https://github.com/SEU-USUARIO/clinicaflow.git (fetch)
origin  https://github.com/SEU-USUARIO/clinicaflow.git (push)
```

---

## 📦 Passo 4: Preparar Primeiro Commit

```bash
# Adicionar TODOS os arquivos (exceto os do .gitignore)
git add .

# Verificar o que será commitado
git status

# ATENÇÃO: Se ver algum arquivo .env na lista, PARE e remova:
git reset backend/.env
git reset .env

# Criar o primeiro commit
git commit -m "Initial commit: ClinicaFlow v1.0

- Sistema completo de gestão para clínicas odontológicas
- Frontend: React 19 + TypeScript + Vite + TailwindCSS
- Backend: Node.js + Express + Supabase + Socket.io
- Features: Dashboard, Pipeline Kanban, Notificações Real-time
- Auth: JWT com refresh tokens
- 76 testes unitários implementados"
```

---

## 🚀 Passo 5: Fazer Push para GitHub

### Opção A: Push com HTTPS (Recomendado para iniciantes)

```bash
# Push para o GitHub
git push -u origin main
```

**Se pedir credenciais:**
- **Username:** seu_usuario_github
- **Password:** use um **Personal Access Token** (não a senha da conta)

**Como criar Personal Access Token:**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token → Classic
3. Marque: `repo` (Full control of private repositories)
4. Copie o token gerado (só aparece uma vez!)

### Opção B: Push com SSH (Mais seguro, requer configuração)

```bash
# 1. Gerar chave SSH (se não tiver)
ssh-keygen -t ed25519 -C "seu_email@example.com"

# 2. Copiar chave pública
type %USERPROFILE%\.ssh\id_ed25519.pub

# 3. Adicionar no GitHub:
# GitHub → Settings → SSH and GPG keys → New SSH key
# Cole a chave copiada

# 4. Mudar remote para SSH
git remote set-url origin git@github.com:SEU-USUARIO/clinicaflow.git

# 5. Push
git push -u origin main
```

---

## ✅ Passo 6: Verificar Upload

1. **Acesse** seu repositório no GitHub: `https://github.com/SEU-USUARIO/clinicaflow`

2. **Verifique:**
   - [ ] README.md está sendo exibido
   - [ ] Arquivos `.env.example` estão presentes
   - [ ] Arquivos `.env` **NÃO** estão presentes
   - [ ] Estrutura de pastas correta (backend/, components/, hooks/, etc)
   - [ ] Badge do README estão funcionando

---

## 🔒 Passo 7: Configurar Secrets (Para Colaboradores)

Se outras pessoas vão contribuir, crie um arquivo de instrução:

```bash
# Criar CONTRIBUTING.md
echo "# Contribuindo

## Setup do Projeto

1. Clone o repositório
2. Copie .env.example para .env em ambos (raiz e backend/)
3. Preencha as variáveis de ambiente com suas próprias credenciais
4. Siga o README.md para instalar dependências

## Nunca commite arquivos .env!
" > CONTRIBUTING.md

git add CONTRIBUTING.md
git commit -m "docs: add contributing guide"
git push
```

---

## 📝 Comandos Úteis (Referência Rápida)

```bash
# Ver status
git status

# Ver histórico de commits
git log --oneline

# Criar nova branch
git checkout -b feature/nome-da-feature

# Voltar para main
git checkout main

# Atualizar do GitHub
git pull origin main

# Ver remotes configurados
git remote -v

# Desfazer último commit (mantém mudanças)
git reset --soft HEAD~1

# Desfazer mudanças não commitadas
git restore .
```

---

## ⚠️ Checklist Final de Segurança

Antes de fazer o primeiro push, confirme:

- [ ] `.gitignore` está configurado corretamente
- [ ] Nenhum arquivo `.env` será enviado
- [ ] Nenhuma credencial (API keys, passwords) hardcoded no código
- [ ] Arquivos `.env.example` estão no repositório como templates
- [ ] README.md tem instruções claras de setup
- [ ] Commit message é descritiva

---

## 🐛 Troubleshooting

### Erro: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/SEU-USUARIO/clinicaflow.git
```

### Erro: "failed to push some refs"
```bash
# Se o repositório remoto tem commits que você não tem localmente:
git pull origin main --rebase
git push origin main
```

### Erro: Commitei .env por engano!
```bash
# ANTES de fazer push:
git reset HEAD~1
git reset backend/.env
git commit -m "fix: remove sensitive files"

# DEPOIS de fazer push (NUNCA use se outras pessoas já clonaram!):
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

---

## 🎉 Pronto!

Seu projeto agora está no GitHub! 🚀

**Próximos passos:**
- Adicionar badges ao README
- Configurar GitHub Actions (CI/CD)
- Criar Releases
- Adicionar CONTRIBUTING.md
- Configurar GitHub Projects para gestão de issues

---

**Desenvolvido por IntelliX.AI 🧠**
