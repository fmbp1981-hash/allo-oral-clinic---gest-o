# Guia de Início Rápido - ClinicaFlow

## Configuração Rápida (5 minutos)

### Pré-requisitos
- Node.js 18+ instalado
- Acesso ao banco Neon configurado
- Terminal/CMD

### Passo 1: Backend

```bash
# Navegue até a pasta do backend
cd backend

# Instale as dependências
npm install

# Configure o banco de dados
npx prisma generate
npx prisma db push

# Inicie o servidor
npm run dev
```

✅ Backend rodando em `http://localhost:3001`

### Passo 2: Frontend

```bash
# Volte para a raiz e instale dependências
cd ..
npm install

# Inicie o frontend
npm run dev
```

✅ Frontend rodando em `http://localhost:3000`

### Passo 3: Primeiro Acesso

1. Abra `http://localhost:3000`
2. Clique em "Criar Conta"
3. Preencha os dados:
   - Nome: Seu nome
   - Email: seu@email.com
   - Senha: suasenha123
   - Nome da Clínica: Allo Oral Clinic
4. Faça login

### Passo 4: Teste o Sistema

1. **Dashboard**: Veja as métricas iniciais
2. **Busca Ativa**:
   - Digite "implante"
   - Quantidade: 5
   - Clique em "Prospectar"
3. **Pipeline**: Arraste os cards entre as colunas
4. **Base de Pacientes**: Veja todos os pacientes cadastrados

---

## Variáveis de Ambiente

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001/api
```

### Backend (.env)
```env
PORT=3001
DATABASE_URL="sua_url_do_neon_aqui"
JWT_SECRET="sua_chave_secreta_aqui"
```

---

## Comandos Úteis

### Backend
```bash
npm run dev      # Inicia em modo desenvolvimento
npm run build    # Compila para produção
npm start        # Inicia servidor de produção
```

### Frontend
```bash
npm run dev      # Inicia em modo desenvolvimento
npm run build    # Compila para produção
npm run preview  # Preview da build de produção
```

### Prisma
```bash
npx prisma studio        # Interface visual do banco
npx prisma migrate dev   # Criar nova migration
npx prisma generate      # Gerar client do Prisma
npx prisma db push       # Sincronizar schema sem migration
```

---

## Solução de Problemas Comuns

### Backend não conecta ao banco
- Verifique se a `DATABASE_URL` está correta no `.env`
- Teste a conexão com o Neon Dashboard
- Execute `npx prisma db push` novamente

### Frontend não encontra o backend
- Confirme que o backend está rodando na porta 3001
- Verifique o `VITE_API_URL` no `.env` do frontend
- Abra o console do navegador (F12) para ver erros

### Erro de autenticação
- Limpe o localStorage do navegador
- Crie uma nova conta
- Verifique se o `JWT_SECRET` está configurado no backend

### Toast não aparece
- Verifique se o `ToastProvider` está no `index.tsx`
- Abra o console para erros do React

---

## Próximos Passos

1. ✅ Conectar seu WhatsApp Business (via webhook)
2. ✅ Configurar templates de mensagem
3. ✅ Importar base de pacientes real
4. ✅ Treinar equipe no sistema

---

## Suporte Rápido

**Erro comum #1**: "Cannot connect to database"
```bash
cd backend
npx prisma db push --force-reset
```

**Erro comum #2**: "Port 3001 already in use"
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

**Erro comum #3**: "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

---

Pronto! Seu ClinicaFlow está configurado e rodando. 🚀

**Desenvolvido por IntelliX.AI** 🧠
