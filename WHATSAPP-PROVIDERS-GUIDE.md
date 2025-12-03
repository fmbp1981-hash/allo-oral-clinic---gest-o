# Guia de Configuração - Provedores WhatsApp

Este guia explica como configurar cada provedor de WhatsApp disponível no ClinicaFlow.

---

## 📱 Provedores Disponíveis

1. **Evolution API** - Auto-hospedado, gratuito, mais popular
2. **WhatsApp Business Cloud** - Oficial da Meta, Cloud
3. **Z-API** - Serviço brasileiro, fácil de configurar
4. **WhatsApp Web** - Fallback manual, sem configuração

---

## 1️⃣ Evolution API (Recomendado)

### Vantagens
- ✅ Gratuito e open-source
- ✅ Auto-hospedado (você controla)
- ✅ Suporta múltiplas instâncias
- ✅ QR Code integrado
- ✅ Webhook para receber mensagens

### Instalação

**Opção A: Docker (Mais Fácil)**
```bash
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=SUA_CHAVE_SECRETA_AQUI \
  atendai/evolution-api
```

**Opção B: Docker Compose**
```yaml
version: '3'
services:
  evolution-api:
    image: atendai/evolution-api
    ports:
      - "8080:8080"
    environment:
      - AUTHENTICATION_API_KEY=SUA_CHAVE_SECRETA_AQUI
```

### Configuração no ClinicaFlow

1. Acesse **Integrações** (apenas admin)
2. Escolha **Evolution API**
3. Preencha:
   - **URL**: `http://localhost:8080` (ou seu IP/domínio)
   - **Instance Name**: `clinicaflow` (ou qualquer nome)
   - **API Key**: Mesma chave definida em `AUTHENTICATION_API_KEY`
4. Salve

### Conectar WhatsApp

Após salvar, a primeira mensagem vai gerar um QR Code que você escaneia com seu WhatsApp.

---

## 2️⃣ WhatsApp Business Cloud (Meta/Facebook)

### Vantagens
- ✅ Oficial da Meta
- ✅ Cloud (sem infraestrutura)
- ✅ Templates de mensagens
- ✅ Escalável

### Desvantagens
- ❌ Processo de aprovação demorado
- ❌ Custos após certo volume
- ❌ Requer Facebook Business Manager

### Configuração

1. Acesse [Meta for Developers](https://developers.facebook.com)
2. Crie um App WhatsApp Business
3. Configure um número de telefone
4. Obtenha:
   - **Phone Number ID**: Na seção WhatsApp → Configurações
   - **Access Token**: Em Credenciais → Token de Acesso Permanente

### Configuração no ClinicaFlow

1. Acesse **Integrações**
2. Escolha **WhatsApp Business Cloud**
3. Preencha:
   - **Phone Number ID**: Copiado do Meta for Developers
   - **Access Token**: Token permanente
4. Salve

### Limitações

- Mensagens devem usar templates aprovados (para primeiros contatos)
- Período de 24h para responder conversas iniciadas pelo cliente

---

## 3️⃣ Z-API

### Vantagens
- ✅ Serviço brasileiro
- ✅ Fácil de configurar
- ✅ Suporte em português
- ✅ Dashboard completo
- ✅ Webhooks inclusos

### Desvantagens
- ❌ Pago (mas tem trial gratuito)

### Configuração

1. Acesse [Z-API.io](https://www.z-api.io)
2. Crie uma conta
3. Crie uma nova instância
4. Conecte seu WhatsApp escaneando QR Code
5. Obtenha:
   - **Instance ID**: No dashboard da instância
   - **Token**: No dashboard da instância

### Configuração no ClinicaFlow

1. Acesse **Integrações**
2. Escolha **Z-API**
3. Preencha:
   - **Z-API URL**: `https://api.z-api.io` (default)
   - **Instance ID**: Copiado do dashboard
   - **Token**: Copiado do dashboard
4. Salve

---

## 4️⃣ WhatsApp Web (Fallback)

### Quando usar
- Sem configuração de provedor
- Testes iniciais
- Backup manual

### Como funciona

1. Clique no botão de mensagem no Pipeline
2. Uma nova aba abre com WhatsApp Web
3. Mensagem já vem preenchida
4. Basta clicar em enviar

**Nota**: Não é automático, requer ação manual.

---

## 🔧 Variáveis de Ambiente (Opcional)

Você pode pré-configurar via variáveis de ambiente:

```env
# Provedor padrão
VITE_WHATSAPP_PROVIDER=evolution

# Evolution API
VITE_WHATSAPP_EVOLUTION_BASE_URL=http://localhost:8080
VITE_WHATSAPP_EVOLUTION_INSTANCE_NAME=clinicaflow
VITE_WHATSAPP_EVOLUTION_API_KEY=sua_chave

# WhatsApp Business Cloud
VITE_WHATSAPP_BUSINESS_PHONE_ID=123456789
VITE_WHATSAPP_BUSINESS_TOKEN=seu_token

# Z-API
VITE_WHATSAPP_ZAPI_URL=https://api.z-api.io
VITE_WHATSAPP_ZAPI_INSTANCE=seu_instance_id
VITE_WHATSAPP_ZAPI_TOKEN=seu_token
```

---

## ✅ Testando a Configuração

1. Configurenounidades do provedor em **Integrações**
2. Vá para **Pipeline**
3. Clique no ícone de mensagem em qualquer oportunidade
4. Verifique os logs no console do navegador (F12)
5. Confirme o envio da mensagem

### Logs Esperados

```
[WhatsApp] Provider: evolution
[WhatsApp] Phone: 5511999999999
[WhatsApp] Sending via Evolution API...
[WhatsApp] Message sent via Evolution API
```

---

## 🐛 Troubleshooting

### Evolution API não conecta
- Verifique se o container Docker está rodando: `docker ps`
- Teste API: `curl http://localhost:8080/instance/connect/clinicaflow`
- Verifique API Key está correta

### Business Cloud retorna erro
- Verifique se o número está verificado
- Confirme que o token não expirou
- Use templates aprovados para primeira mensagem

### Z-API não funciona
- Confirme que a instância está conectada no dashboard
- Verifique se o token está correto
- Teste no dashboard da Z-API primeiro

### Fallback para WhatsApp Web
Se qualquer provedor falhar, o sistema automaticamente abre WhatsApp Web como fallback.

---

## 💡 Recomendações

1. **Para testes**: Use Evolution API (gratuito)
2. **Para produção pequena/média**: Evolution API ou Z-API
3. **Para produção em larga escala**: WhatsApp Business Cloud
4. **Para uso pessoal**: WhatsApp Web

---

**Desenvolvido por IntelliX.AI** 🧠
