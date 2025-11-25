# 📱 Guia de Setup - WhatsApp Integration

**Versão**: 7.0.0
**Data**: 25/11/2025

---

## 🎯 Visão Geral

O ClinicaFlow suporta **3 provedores de WhatsApp**:

| Provider | Dificuldade | Custo | Recomendação |
|----------|-------------|-------|--------------|
| **Evolution API** | Baixa | Grátis (self-hosted) | ⭐ **RECOMENDADO** |
| **Z-API** | Muito Baixa | Pago (~R$49/mês) | 💰 Mais fácil |
| **Meta Business API** | Alta | Grátis | 🏢 Empresarial |

---

## ⚡ Setup Rápido - Evolution API (RECOMENDADO)

### 1. Instalar Evolution API

**Opção A: Docker (Recomendado)**

```bash
# Clone o repositório
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# Configure o .env
cp .env.example .env

# Inicie com Docker
docker-compose up -d
```

**Opção B: Cloud (Mais Fácil)**

Use um serviço cloud que hospeda Evolution API:
- https://evolution-api.com/pricing
- Ou hospede no seu próprio VPS

### 2. Criar Instância

```bash
# Crie uma instância via API
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: SEU_API_KEY" \
  -d '{
    "instanceName": "clinicaflow"
  }'
```

### 3. Conectar WhatsApp

```bash
# Obtenha o QR Code
curl -X GET http://localhost:8080/instance/connect/clinicaflow \
  -H "apikey: SEU_API_KEY"

# Escaneie o QR Code com o WhatsApp
```

### 4. Configurar no ClinicaFlow

Adicione no `.env`:

```bash
WHATSAPP_PROVIDER="evolution"
WHATSAPP_EVOLUTION_BASE_URL="http://localhost:8080"
WHATSAPP_EVOLUTION_INSTANCE_NAME="clinicaflow"
WHATSAPP_EVOLUTION_API_KEY="seu_api_key_aqui"
```

### 5. Testar

```bash
# Reinicie o backend
npm run dev

# Teste o endpoint
curl http://localhost:3001/api/whatsapp/status
```

✅ **Pronto!** Sua integração Evolution API está funcionando!

---

## 💰 Setup - Z-API (Mais Fácil)

### 1. Criar Conta

1. Acesse: https://z-api.io/
2. Crie uma conta (14 dias grátis)
3. Crie uma instância

### 2. Conectar WhatsApp

1. No painel da Z-API, clique em "Conectar"
2. Escaneie o QR Code com WhatsApp
3. Aguarde a confirmação

### 3. Obter Credenciais

No painel da Z-API:
- **Instance ID**: Ex: `3D3B45C1234`
- **Token**: Ex: `A1B2C3D4E5...`

### 4. Configurar no ClinicaFlow

Adicione no `.env`:

```bash
WHATSAPP_PROVIDER="zapi"
WHATSAPP_ZAPI_INSTANCE_ID="3D3B45C1234"
WHATSAPP_ZAPI_TOKEN="seu_token_aqui"
```

### 5. Testar

```bash
npm run dev

curl http://localhost:3001/api/whatsapp/status
```

✅ **Pronto!** Integração Z-API configurada!

---

## 🏢 Setup - Meta Business API (Avançado)

### 1. Criar App no Meta

1. Acesse: https://developers.facebook.com/
2. Crie um App (tipo: Business)
3. Adicione o produto "WhatsApp"

### 2. Configurar Número

1. Dashboard > WhatsApp > API Setup
2. Adicione um número de telefone
3. Verifique o número

### 3. Obter Credenciais

- **Phone Number ID**: Dashboard > WhatsApp > API Setup
- **Access Token**: Dashboard > WhatsApp > API Setup > Generate Token
- **Business Account ID**: Dashboard > Settings > Basic

### 4. Criar Token Permanente

```bash
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?\
  grant_type=fb_exchange_token&\
  client_id=SEU_APP_ID&\
  client_secret=SEU_APP_SECRET&\
  fb_exchange_token=SEU_TEMP_TOKEN"
```

### 5. Configurar Webhook

**URL**: `https://seu-dominio.com/api/whatsapp/webhook`

**Verify Token**: `clinicaflow_webhook_token`

**Subscribe to**: messages

### 6. Configurar no ClinicaFlow

Adicione no `.env`:

```bash
WHATSAPP_PROVIDER="meta"
WHATSAPP_META_ACCESS_TOKEN="seu_access_token"
WHATSAPP_META_PHONE_NUMBER_ID="seu_phone_number_id"
WHATSAPP_META_BUSINESS_ACCOUNT_ID="seu_business_account_id"
WHATSAPP_META_API_VERSION="v18.0"
```

### 7. Testar

```bash
npm run dev

curl http://localhost:3001/api/whatsapp/status
```

✅ **Pronto!** Integração Meta API configurada!

---

## 🧪 Testando a Integração

### 1. Verificar Status

```bash
GET http://localhost:3001/api/whatsapp/status
```

**Resposta esperada:**
```json
{
  "configured": true,
  "provider": "evolution",
  "phoneNumber": "***1234"
}
```

### 2. Enviar Mensagem de Teste

```bash
POST http://localhost:3001/api/whatsapp/send
Content-Type: application/json
Authorization: Bearer SEU_TOKEN

{
  "phone": "5511999999999",
  "message": "Olá! Esta é uma mensagem de teste do ClinicaFlow."
}
```

### 3. Verificar Logs

```bash
# Backend logs devem mostrar:
# [info]: Sending message via Evolution API
# [info]: Message sent successfully via Evolution API
```

---

## 🔧 Troubleshooting

### Problema: "WhatsApp service not configured"

**Solução:**
1. Verifique se o `.env` está configurado corretamente
2. Reinicie o servidor backend
3. Verifique os logs para ver qual provider está sendo carregado

### Problema: "Evolution API error: 401"

**Solução:**
1. Verifique se o `WHATSAPP_EVOLUTION_API_KEY` está correto
2. Verifique se a instância existe: `GET /instance/fetchInstances`

### Problema: "QR Code não aparece"

**Solução:**
1. Verifique se a instância já está conectada
2. Desconecte e conecte novamente: `GET /instance/logout/:instanceName`

### Problema: "Z-API: Phone number invalid"

**Solução:**
1. Número deve estar no formato: `5511999999999` (sem espaços, parênteses ou traços)
2. Deve incluir código do país (55 para Brasil)

### Problema: "Meta API: Template not found"

**Solução:**
1. Templates precisam ser pré-aprovados no Meta
2. Use mensagens de texto simples primeiro
3. Crie templates no Meta Business Manager

---

## 📋 Checklist de Produção

Antes de ir para produção:

- [ ] WhatsApp provider configurado e testado
- [ ] Mensagens sendo enviadas com sucesso
- [ ] Webhook configurado (se aplicável)
- [ ] Rate limiting configurado
- [ ] Logs estruturados funcionando
- [ ] Variáveis de ambiente em produção configuradas
- [ ] Backups das credenciais em local seguro
- [ ] Monitoramento de erros ativo (Sentry)
- [ ] Testes com números reais realizados
- [ ] Políticas de privacidade atualizadas

---

## 💡 Dicas

### Evolution API:
- ✅ Melhor para auto-hospedagem
- ✅ Grátis e open-source
- ✅ QR Code fácil de usar
- ⚠️ Requer servidor próprio

### Z-API:
- ✅ Mais fácil de configurar
- ✅ Sem necessidade de servidor
- ✅ Suporte brasileiro
- ⚠️ Pago (planos a partir de R$49/mês)

### Meta Business API:
- ✅ Grátis
- ✅ Escalável para grandes volumes
- ✅ Recursos avançados (templates, botões)
- ⚠️ Configuração complexa
- ⚠️ Requer verificação de negócio

---

## 📚 Recursos

### Evolution API:
- Docs: https://doc.evolution-api.com/
- GitHub: https://github.com/EvolutionAPI/evolution-api
- Telegram: https://t.me/evolutionapi

### Z-API:
- Docs: https://developer.z-api.io/
- Suporte: suporte@z-api.io
- WhatsApp: +55 11 97547-1142

### Meta Business API:
- Docs: https://developers.facebook.com/docs/whatsapp
- Community: https://developers.facebook.com/community/
- Support: https://business.facebook.com/business/help

---

## 🔄 Migrando Entre Providers

Para trocar de provider:

1. Pare o backend
2. Altere `WHATSAPP_PROVIDER` no `.env`
3. Configure as variáveis do novo provider
4. Reinicie o backend
5. Teste com `/api/whatsapp/status`

**Sem necessidade de alterar código!** 🎉

---

**Desenvolvido por**: IntelliX.AI
**Data**: 25/11/2025
**Versão**: 7.0.0
