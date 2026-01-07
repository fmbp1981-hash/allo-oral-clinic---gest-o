# 🚀 Guia de Início Rápido - ClinicaFlow

## ⚡ Setup em 3 Passos (5 minutos)

### Passo 1: Executar Setup Automatizado

**Opção A: Projeto Local (RECOMENDADO)**
```bash
# 1. Copiar projeto para diretório local
xcopy "G:\Meu Drive\Profissional\Empreendedorismo\Inteligência Artificial\IntelliX.AI\Sistemas\allo-oral-clinic---gestão" "C:\Projects\allo-oral-clinic" /E /I /H

# 2. Navegar para o projeto
cd C:\Projects\allo-oral-clinic

# 3. Executar setup
SETUP.bat
```

**Opção B: Google Drive (Com limitações)**
```bash
# 1. PAUSAR sincronização do Google Drive
# (Botão direito no ícone do Google Drive → Pausar)

# 2. Executar setup
cd "G:\Meu Drive\Profissional\Empreendedorismo\Inteligência Artificial\IntelliX.AI\Sistemas\allo-oral-clinic---gestão"
SETUP.bat

# 3. RETOMAR sincronização após instalação
```

---

### Passo 2: Configurar Banco de Dados

**A. Executar Migração**

Acesse seu dashboard do Supabase:
1. Vá em `SQL Editor`
2. Abra o arquivo: `backend/supabase/migrations/02_add_user_id_to_notifications.sql`
3. Cole o conteúdo e execute

**OU via psql:**
```bash
cd backend/supabase/migrations
psql -h [SEU_HOST_SUPABASE] -U postgres -d postgres -f 02_add_user_id_to_notifications.sql
```

**B. Verificar Tabelas**

Execute no SQL Editor:
```sql
-- Verificar se user_id foi adicionado
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notifications';

-- Deve mostrar: user_id | uuid
```

---

### Passo 3: Iniciar Servidores

**Método Automático (RECOMENDADO):**
```bash
START.bat
```

**Método Manual:**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend (nova janela)
npm run dev
```

**Aguarde até ver:**
```
✓ Backend:  Server running on port 3001
✓ Backend:  🔌 Socket.io initialized
✓ Frontend: Local: http://localhost:5173/
```

---

## 🎯 Acessar o Sistema

1. Abra o navegador: **http://localhost:5173**
2. Se for a primeira vez ou após reset do banco:
  - Clique em **"Esqueceu?"** e faça a redefinição de senha via e-mail.
  - O usuário admin é criado/recriado pelo script de reset do banco no backend.

---

## ✅ Verificar Instalação

### 1. Console do Navegador (F12)

Você deve ver:
```
✅ Socket.io conectado
🔐 Autenticado com userId: xxx-xxx-xxx
```

### 2. Testar Notificação Real-Time

**Via Postman ou curl:**
```bash
curl -X POST http://localhost:3001/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Teste Socket.io",
    "message": "Sistema funcionando!",
    "type": "success"
  }'
```

**Resultado esperado:**
- ✅ Notificação aparece instantaneamente no ícone de sino (top-right)
- ✅ Badge contador atualiza automaticamente
- ✅ Toast verde aparece com a mensagem
- ✅ Console mostra: `🔔 Nova notificação recebida:`

### 3. Health Check do Backend

Acesse: **http://localhost:3001/health**

Resposta esperada:
```json
{
  "status": "ok",
  "socketio": {
    "connected": 1
  }
}
```

---

## 🐛 Troubleshooting

### ❌ "Socket.io não conecta"

**Solução:**
1. Verificar se backend está rodando na porta 3001
2. Verificar console do backend para erros
3. Limpar cache: Ctrl+Shift+R no navegador
4. Verificar CORS no `backend/src/server.ts`

### ❌ "npm install falha com TAR_ENTRY_ERROR"

**Causa:** Google Drive sync conflitos

**Solução:**
1. Pausar Google Drive
2. Limpar cache: `npm cache clean --force`
3. Deletar `node_modules`
4. Rodar novamente: `npm install --legacy-peer-deps`

### ❌ "Migração falha com erro de permissão"

**Solução:**
1. Verificar se está conectado ao banco correto
2. Verificar credenciais no `.env`
3. Executar via Supabase Dashboard (SQL Editor) ao invés de CLI

### ❌ "Frontend não carrega"

**Solução:**
1. Verificar se porta 5173 está livre: `netstat -ano | findstr :5173`
2. Matar processo: `taskkill /PID [PID] /F`
3. Rodar novamente: `npm run dev`

---

## 📊 Funcionalidades Principais

### Dashboard
- Métricas em tempo real da base de pacientes
- Taxa de conversão e ativação
- Gráficos de distribuição por status
- Tratamentos mais buscados

### Busca Ativa
- Pesquisa por palavra-chave no banco
- Seleção de quantidade de resultados
- Adição ao pipeline de reativação

### Pipeline Kanban
- Arraste e solte entre colunas
- Status: Novo → Contatado → Respondeu → Agendado → Arquivado
- Notas e observações por paciente
- Agendamento com calendário

### Base de Pacientes
- Visualização completa do banco Neon DB
- Filtros por nome, telefone e tratamento
- Adicionar manualmente ao pipeline
- Export (PDF, Excel, CSV)

### Notificações Real-Time ⚡ NOVO
- Socket.io para updates instantâneos
- Badge contador de não lidas
- Toast para novas notificações
- Marcar como lida
- Histórico persistente

---

## 🔐 Usuários de Teste

Por segurança, este projeto não publica usuários/senhas padrão na documentação.

- Para iniciar do zero, rode o script de reset do banco no backend.
- Depois, use **"Esqueceu?"** na tela de login para definir a senha via e-mail.

---

## 📱 Endpoints da API

### Notificações (Socket.io + REST)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/notifications` | Lista todas notificações |
| GET | `/api/notifications/unread` | Lista não lidas |
| GET | `/api/notifications/stats` | Estatísticas |
| POST | `/api/notifications` | Criar (emite via Socket) |
| PATCH | `/api/notifications/:id/read` | Marcar como lida |
| PATCH | `/api/notifications/mark-all-read` | Marcar todas |
| DELETE | `/api/notifications/:id` | Deletar |

### Pacientes

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/patients` | Lista todos |
| GET | `/api/patients/search?keyword=implante` | Busca por palavra-chave |
| POST | `/api/patients` | Criar paciente |

### Oportunidades

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/opportunities` | Lista todas |
| POST | `/api/opportunities` | Criar oportunidade |
| PATCH | `/api/opportunities/:id/status` | Atualizar status |
| PATCH | `/api/opportunities/:id/notes` | Atualizar notas |
| DELETE | `/api/opportunities` | Deletar todas |

---

## 🎨 Temas

O sistema suporta **Dark Mode** automático!

- Botão de alternância no header (top-right)
- Persiste preferência no localStorage
- Aplica em toda a aplicação

---

## 📞 Suporte

**Desenvolvido por:** IntelliX.AI
**Documentação Completa:**
- `NOTIFICATIONS-SYSTEM.md` - Sistema de notificações
- `TESTING-FRONTEND.md` - Guia de testes

**Arquivos de Log:**
- Backend: `backend/logs/`
- Frontend: Console do navegador (F12)

---

## ✨ Próximas Features

- [ ] Filtros avançados no dashboard
- [ ] Relatórios personalizados
- [ ] Integração com WhatsApp
- [ ] Histórico de contatos
- [ ] Multi-clínicas
- [ ] App mobile

---

**Versão:** 1.0.0
**Última Atualização:** 02/12/2025
**Status:** 85% Completo - MVP Funcional
