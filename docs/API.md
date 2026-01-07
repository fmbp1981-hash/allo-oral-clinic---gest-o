# 📡 API Documentation - ClinicaFlow

**Versão**: 4.1.0  
**Base URL**: `http://localhost:3001/api`  
**Última Atualização**: 05/01/2026

---

## 📋 Índice

1. [Autenticação](#autenticação)
2. [Endpoints](#endpoints)
   - [Auth](#auth)
   - [Patients](#patients)
   - [Opportunities](#opportunities)
   - [Notifications](#notifications)
   - [WhatsApp](#whatsapp)
   - [Settings](#settings)
   - [Users](#users)
   - [Clinical Records](#clinical-records)
3. [Códigos de Erro](#códigos-de-erro)
4. [Rate Limiting](#rate-limiting)
5. [WebSocket Events](#websocket-events)

---

## Autenticação

A API utiliza **JWT Bearer Token** para autenticação.

### Headers Obrigatórios

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Fluxo de Autenticação

1. **Login**: `POST /api/auth/login` → Retorna `accessToken` e `refreshToken`
2. **Usar Access Token**: Incluir em todas as requisições autenticadas
3. **Refresh**: Quando expirar, chamar `POST /api/auth/refresh` com o `refreshToken`

### Tempos de Expiração

| Token | Duração |
|-------|---------|
| Access Token | 15 minutos |
| Refresh Token | 7 dias |

---

## Endpoints

### Auth

#### POST /api/auth/login

Autentica um usuário.

**Request Body:**
```json
{
    "email": "admin@exemplo.com",
    "password": "SUA_SENHA"
}
```

**Response 200:**
```json
{
    "user": {
        "id": "uuid",
        "name": "Admin",
        "email": "admin@exemplo.com",
        "clinic_name": "Allo Oral Clinic",
        "avatar_url": null,
        "role": "admin",
        "tenant_id": "uuid",
        "created_at": "2026-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 401:**
```json
{
    "error": "Invalid credentials"
}
```

---

#### POST /api/auth/register

Registra um novo usuário.

**Request Body:**
```json
{
    "name": "Dr. João Silva",
    "email": "joao@clinica.com",
    "password": "senha123",
    "clinicName": "Clínica Sorriso",
    "avatarUrl": "https://example.com/avatar.jpg"
}
```

**Response 200:**
```json
{
    "user": {
        "id": "uuid",
        "name": "Dr. João Silva",
        "email": "joao@clinica.com",
        "clinic_name": "Clínica Sorriso",
        "avatar_url": "https://example.com/avatar.jpg",
        "role": "user",
        "tenant_id": "uuid",
        "created_at": "2026-01-05T10:00:00.000Z"
    },
    "accessToken": "...",
    "refreshToken": "..."
}
```

**Response 400:**
```json
{
    "error": "User already exists"
}
```

---

#### POST /api/auth/refresh

Renova os tokens de acesso.

**Request Body:**
```json
{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 200:**
```json
{
    "accessToken": "new_access_token",
    "refreshToken": "new_refresh_token"
}
```

---

#### POST /api/auth/request-password-reset

Solicita reset de senha (envia código de 6 dígitos).

**Request Body:**
```json
{
    "email": "admin@exemplo.com"
}
```

**Response 200:**
```json
{
    "message": "If this email exists, a reset code will be sent to it."
}
```

---

#### POST /api/auth/reset-password

Reseta a senha com o código recebido.

**Request Body:**
```json
{
    "email": "admin@exemplo.com",
    "resetToken": "123456",
    "newPassword": "novaSenha123"
}
```

**Response 200:**
```json
{
    "message": "Password reset successfully. You can now login with your new password."
}
```

---

#### POST /api/auth/logout

Faz logout (invalida refresh token).

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
    "message": "Logged out successfully"
}
```

---

### Patients

#### GET /api/patients

Lista todos os pacientes do tenant.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
[
    {
        "id": "uuid",
        "name": "Maria Santos",
        "phone": "(11) 99999-9999",
        "email": "maria@email.com",
        "history": "Implante dentário em 2024. Retorno agendado.",
        "user_id": "uuid",
        "tenant_id": "uuid",
        "created_at": "2026-01-01T00:00:00.000Z",
        "updated_at": "2026-01-05T10:00:00.000Z",
        "clinical_records": [...],
        "opportunities": [...]
    }
]
```

---

#### POST /api/patients

Cria um novo paciente.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
    "name": "Maria Santos",
    "phone": "(11) 99999-9999",
    "email": "maria@email.com",
    "history": "Primeira consulta para avaliação de implante."
}
```

**Response 200:**
```json
{
    "id": "uuid",
    "name": "Maria Santos",
    "phone": "(11) 99999-9999",
    "email": "maria@email.com",
    "history": "Primeira consulta para avaliação de implante.",
    "user_id": "uuid",
    "tenant_id": "uuid",
    "created_at": "2026-01-05T10:00:00.000Z"
}
```

---

#### GET /api/patients/:id

Busca um paciente por ID.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
    "id": "uuid",
    "name": "Maria Santos",
    "phone": "(11) 99999-9999",
    "email": "maria@email.com",
    "history": "...",
    "clinical_records": [
        {
            "id": "uuid",
            "date": "2025-06-15",
            "description": "Avaliação para implante dentário",
            "type": "consulta"
        }
    ],
    "opportunities": [...]
}
```

**Response 404:**
```json
{
    "error": "Patient not found"
}
```

---

#### PUT /api/patients/:id

Atualiza um paciente.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
    "name": "Maria Santos Silva",
    "phone": "(11) 88888-8888",
    "history": "Histórico atualizado..."
}
```

**Response 200:** Retorna o paciente atualizado.

---

#### DELETE /api/patients/:id

Remove um paciente.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
    "message": "Patient deleted successfully"
}
```

---

#### GET /api/patients/search

Busca pacientes por termo.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| query | string | Sim | Termo de busca (nome, telefone, email ou histórico) |

**Exemplo:** `GET /api/patients/search?query=implante`

**Response 200:** Lista de pacientes que correspondem à busca.

---

#### POST /api/patients/import

Importa pacientes em lote via CSV/Excel.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
    "patients": [
        {
            "name": "João Silva",
            "phone": "(11) 99999-1111",
            "email": "joao@email.com",
            "history": "Ortodontia"
        },
        {
            "Nome": "Maria Santos",
            "Telefone": "(11) 99999-2222"
        }
    ]
}
```

**Response 200:**
```json
{
    "success": true,
    "message": "Successfully imported 2 patients",
    "total": 2,
    "valid": 2,
    "imported": 2,
    "skipped": 0
}
```

---

### Opportunities

#### GET /api/opportunities

Lista todas as oportunidades do pipeline.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
[
    {
        "id": "uuid",
        "patient_id": "uuid",
        "name": "Maria Santos",
        "phone": "(11) 99999-9999",
        "keyword_found": "implante",
        "status": "NEW",
        "last_contact": null,
        "scheduled_date": null,
        "notes": null,
        "user_id": "uuid",
        "tenant_id": "uuid",
        "created_at": "2026-01-05T10:00:00.000Z",
        "patient": {
            "id": "uuid",
            "name": "Maria Santos",
            "phone": "(11) 99999-9999",
            "email": "maria@email.com",
            "history": "..."
        }
    }
]
```

---

#### POST /api/opportunities

Cria uma oportunidade manualmente.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
    "patientId": "uuid",
    "name": "Maria Santos",
    "phone": "(11) 99999-9999",
    "keywordFound": "implante",
    "status": "NEW"
}
```

---

#### POST /api/opportunities/search

Busca pacientes por keyword no histórico para criar oportunidades.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
    "keyword": "implante",
    "limit": 20
}
```

**Response 200:**
```json
[
    {
        "id": "opp_1704456000000_uuid",
        "patientId": "uuid",
        "name": "Maria Santos",
        "phone": "(11) 99999-9999",
        "keywordFound": "implante",
        "status": "NEW",
        "createdAt": "2026-01-05T10:00:00.000Z",
        "clinicalRecords": [...]
    }
]
```

---

#### PATCH /api/opportunities/:id/status

Atualiza o status de uma oportunidade (move no Kanban).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
    "status": "SENT",
    "scheduledDate": "2026-01-10T14:00:00.000Z"
}
```

**Status válidos:**
- `NEW` - Identificado
- `SENT` - Contatado
- `RESPONDED` - Respondeu
- `SCHEDULED` - Agendado
- `ARCHIVED` - Arquivado

---

#### PATCH /api/opportunities/:id/notes

Atualiza as notas de uma oportunidade.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
    "notes": "Paciente interessado em consulta para orçamento. Preferência por horários da manhã."
}
```

---

#### DELETE /api/opportunities/:id

Remove uma oportunidade.

**Headers:** `Authorization: Bearer <token>`

---

#### DELETE /api/opportunities

Remove todas as oportunidades do tenant.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
    "message": "All opportunities deleted successfully"
}
```

---

### Notifications

#### GET /api/notifications

Lista todas as notificações do usuário.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
[
    {
        "id": "uuid",
        "user_id": "uuid",
        "tenant_id": "uuid",
        "title": "Paciente respondeu!",
        "message": "Maria Santos respondeu sua mensagem via WhatsApp",
        "type": "success",
        "read": false,
        "created_at": "2026-01-05T10:00:00.000Z"
    }
]
```

---

#### GET /api/notifications/unread

Retorna contagem de notificações não lidas.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
    "count": 5
}
```

---

#### POST /api/notifications

Cria uma nova notificação.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
    "title": "Lembrete",
    "message": "Ligar para Maria Santos às 14h",
    "type": "info"
}
```

**Tipos válidos:** `success`, `info`, `warning`, `error`

---

#### PATCH /api/notifications/:id/read

Marca uma notificação como lida.

**Headers:** `Authorization: Bearer <token>`

---

#### PATCH /api/notifications/mark-all-read

Marca todas as notificações como lidas.

**Headers:** `Authorization: Bearer <token>`

---

#### DELETE /api/notifications/:id

Remove uma notificação.

**Headers:** `Authorization: Bearer <token>`

---

### WhatsApp

#### GET /api/whatsapp/status

Verifica status da conexão WhatsApp.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
    "connected": true,
    "provider": "evolution",
    "instanceName": "clinicaflow",
    "phone": "5511999999999"
}
```

---

#### POST /api/whatsapp/send

Envia mensagem WhatsApp.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
    "phone": "5511999999999",
    "message": "Olá Maria! Tudo bem? Notamos que você realizou um tratamento de implante conosco..."
}
```

**Response 200:**
```json
{
    "success": true,
    "messageId": "3EB0123456789",
    "timestamp": "2026-01-05T10:00:00.000Z"
}
```

---

#### POST /api/whatsapp/send-opportunity/:id

Envia mensagem para uma oportunidade específica usando template.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
    "templateName": "reativacao_implante"
}
```

---

#### POST /api/whatsapp/send-template

Envia mensagem usando template personalizado.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
    "phone": "5511999999999",
    "template": "Olá {name}! Notamos que você demonstrou interesse em {keyword}. Gostaria de agendar uma consulta?",
    "variables": {
        "name": "Maria",
        "keyword": "implante dentário"
    }
}
```

---

#### GET /api/whatsapp/webhook

Endpoint de verificação para webhooks (Meta Business API).

**Query Parameters:**
- `hub.mode`
- `hub.verify_token`
- `hub.challenge`

---

#### POST /api/whatsapp/webhook

Recebe mensagens e eventos do WhatsApp.

**Request Body:** Varia conforme o provider (Evolution, Z-API ou Meta).

---

### Settings

#### GET /api/settings

Busca configurações do sistema.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
    "id": "uuid",
    "webhook_url": "https://n8n.example.com/webhook/clinicaflow",
    "messaging_webhook_url": "https://n8n.example.com/webhook/whatsapp",
    "api_key": "sk_live_xxx",
    "message_template": "Olá {name}! Como podemos ajudá-lo(a) hoje?"
}
```

---

#### PUT /api/settings

Atualiza configurações do sistema.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
    "webhookUrl": "https://n8n.example.com/webhook/new",
    "messagingWebhookUrl": "https://n8n.example.com/webhook/whatsapp",
    "messageTemplate": "Novo template de mensagem"
}
```

---

### Users

#### GET /api/users/profile

Busca perfil do usuário logado.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
    "id": "uuid",
    "name": "Admin",
    "email": "admin@exemplo.com",
    "clinic_name": "Allo Oral Clinic",
    "avatar_url": null,
    "role": "admin",
    "created_at": "2026-01-01T00:00:00.000Z"
}
```

---

#### PUT /api/users/profile

Atualiza perfil do usuário.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
    "name": "Dr. Admin",
    "clinicName": "Allo Oral Clinic - Sede",
    "avatarUrl": "https://example.com/avatar.jpg"
}
```

---

### Clinical Records

#### GET /api/clinical-records/:patientId

Lista registros clínicos de um paciente.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
[
    {
        "id": "uuid",
        "patient_id": "uuid",
        "date": "2025-06-15",
        "description": "Avaliação para implante dentário no dente 36",
        "type": "consulta",
        "created_at": "2025-06-15T14:00:00.000Z"
    }
]
```

---

#### POST /api/clinical-records

Cria um registro clínico.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
    "patientId": "uuid",
    "date": "2026-01-05",
    "description": "Moldagem para prótese",
    "type": "procedimento"
}
```

---

#### PUT /api/clinical-records/:id

Atualiza um registro clínico.

**Headers:** `Authorization: Bearer <token>`

---

#### DELETE /api/clinical-records/:id

Remove um registro clínico.

**Headers:** `Authorization: Bearer <token>`

---

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Token inválido ou ausente |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error |

### Formato de Erro

```json
{
    "error": "Descrição do erro"
}
```

Em desenvolvimento, erros 500 incluem stack trace:

```json
{
    "error": "Descrição do erro",
    "stack": "Error: ...\n    at ..."
}
```

---

## Rate Limiting

| Endpoint | Limite | Janela |
|----------|--------|--------|
| Geral (`/api/*`) | 100 requisições | 15 minutos |
| Login (`/api/auth/login`) | 5 requisições | 15 minutos |
| Password Reset | 3 requisições | 15 minutos |

**Headers de Rate Limit:**

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704456900
```

**Response 429:**
```json
{
    "error": "Too many requests, please try again later."
}
```

---

## WebSocket Events

### Conexão

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
    auth: {
        token: accessToken
    }
});

// Autenticar após conexão
socket.emit('authenticate', { userId: 'uuid' });
```

### Eventos Recebidos (Server → Client)

#### `notification`

Notificação em tempo real.

```typescript
socket.on('notification', (data: {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
    createdAt: string;
}) => {
    console.log('Nova notificação:', data);
});
```

#### `whatsapp:message`

Mensagem recebida via WhatsApp.

```typescript
socket.on('whatsapp:message', (data: {
    from: string;
    message: string;
    timestamp: string;
}) => {
    console.log('Mensagem WhatsApp:', data);
});
```

#### `opportunity:update`

Atualização em oportunidade.

```typescript
socket.on('opportunity:update', (data: {
    opportunityId: string;
    status: string;
    updatedBy: string;
}) => {
    console.log('Oportunidade atualizada:', data);
});
```

### Eventos Enviados (Client → Server)

#### `authenticate`

Autentica a conexão WebSocket.

```typescript
socket.emit('authenticate', { userId: 'uuid' });
```

#### `join:room`

Entra em uma sala específica (ex: para acompanhar um paciente).

```typescript
socket.emit('join:room', { room: 'patient:uuid' });
```

---

## Exemplos de Uso

### cURL - Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
    -d '{"email":"admin@exemplo.com","password":"SUA_SENHA"}'
```

### cURL - Buscar Pacientes

```bash
curl http://localhost:3001/api/patients \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### JavaScript - Busca Ativa

```javascript
const response = await fetch('http://localhost:3001/api/opportunities/search', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
        keyword: 'implante',
        limit: 20
    })
});

const opportunities = await response.json();
```

---

## Changelog

| Versão | Data | Alterações |
|--------|------|------------|
| 4.1.0 | 05/01/2026 | Documentação inicial completa |
| 4.0.0 | 01/01/2026 | Multi-tenancy, refresh tokens |
| 3.0.0 | 15/12/2025 | Integração WhatsApp multi-provider |
| 2.0.0 | 01/11/2025 | Sistema de notificações real-time |
| 1.0.0 | 01/10/2025 | Versão inicial |
