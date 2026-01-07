# 📧 Configuração SMTP Gmail - Allo Oral Clinic

Este guia explica como configurar o envio de emails (recuperação de senha, boas-vindas, etc.) usando o Gmail.

---

## ⚠️ Importante: Gmail requer "Senha de App"

O Gmail **não aceita** sua senha normal para aplicações de terceiros. Você precisa criar uma **Senha de App**.

---

## 🔧 Passo a Passo

### 1️⃣ Ativar Verificação em 2 Etapas

1. Acesse: https://myaccount.google.com/security
2. Em **"Como você faz login no Google"**, clique em **"Verificação em duas etapas"**
3. Siga o fluxo para ativar (se ainda não estiver ativa)

### 2️⃣ Criar Senha de App

1. Acesse: https://myaccount.google.com/apppasswords
2. Em **"Selecionar app"**, escolha **"Outro (nome personalizado)"**
3. Digite: `ClinicaFlow` ou `AlloOral`
4. Clique em **"Gerar"**
5. **COPIE a senha de 16 caracteres** que aparece (ex: `abcd efgh ijkl mnop`)
   - ⚠️ **GUARDE essa senha!** Ela só aparece uma vez!

> **Nota**: A senha aparece com espaços, mas você deve usar **SEM espaços** no `.env`

### 3️⃣ Configurar o arquivo .env

Abra o arquivo `backend/.env` e configure:

```env
# ========================================
# EMAIL CONFIGURATION (SMTP - Gmail)
# ========================================

# Gmail SMTP Server
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Seu email Gmail
SMTP_USER=seu-email@gmail.com

# Senha de App (SEM ESPAÇOS!)
# A senha gerada é algo como: abcd efgh ijkl mnop
# Use assim (sem espaços): abcdefghijklmnop
SMTP_PASS=suasenhadapp16caracteres

# Email que aparece como remetente
EMAIL_FROM=Allo Oral Clinic <noreply@allooral.com>

# URL do frontend (para links de reset)
FRONTEND_URL=http://localhost:5173
```

### 4️⃣ Reiniciar o Backend

```bash
cd backend
npm run dev
```

Você deve ver no console:
```
✅ Email service configured successfully
```

---

## 🧪 Testar a Configuração

### Teste via API

```bash
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "seu-email@gmail.com"}'
```

### Teste no Frontend

1. Acesse a tela de login
2. Clique em **"Esqueci minha senha"**
3. Digite seu email
4. Verifique sua caixa de entrada (e spam!)

---

## 🔍 Troubleshooting

### Erro: "Email service not configured"

Verifique se todas as variáveis estão no `.env`:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

### Erro: "Invalid login" / "Authentication failed"

1. Verifique se a Verificação em 2 etapas está **ativada**
2. Confirme que está usando a **Senha de App** (não a senha normal)
3. A senha de app deve estar **SEM espaços**

### Erro: "Less secure app access"

Isso **não se aplica** mais. O Google desativou "apps menos seguros". Use **Senha de App**.

### Email não chega

1. Verifique a pasta **Spam/Lixo Eletrônico**
2. Confirme que o email está correto no cadastro
3. Veja os logs do backend: `backend/logs/`

---

## 📝 Exemplo Completo do .env

```env
# Server
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...

# JWT
JWT_SECRET=sua_chave_secreta_minimo_32_caracteres_aqui
JWT_REFRESH_SECRET=sua_outra_chave_secreta_minimo_32_caracteres

# Frontend
FRONTEND_URL=http://localhost:5173

# Gmail SMTP ✉️
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=clinica.allooral@gmail.com
SMTP_PASS=abcdefghijklmnop
EMAIL_FROM=Allo Oral Clinic <noreply@allooral.com>
```

---

## 🔒 Segurança

- **NUNCA** commite o arquivo `.env` no Git
- Use variáveis de ambiente em produção (Vercel, Render, etc.)
- Revogue a Senha de App se for comprometida: https://myaccount.google.com/apppasswords

---

## 📧 Alternativas ao Gmail

Se preferir outro provedor:

| Provedor | Host | Porta |
|----------|------|-------|
| **Gmail** | smtp.gmail.com | 587 |
| **Outlook** | smtp-mail.outlook.com | 587 |
| **SendGrid** | smtp.sendgrid.net | 587 |
| **Mailgun** | smtp.mailgun.org | 587 |
| **Amazon SES** | email-smtp.{region}.amazonaws.com | 587 |

---

**Desenvolvido por IntelliX.AI** 🧠
