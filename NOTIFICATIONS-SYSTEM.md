# 🔔 Sistema de Notificações Real-Time - ClinicaFlow

Documentação completa do sistema de notificações com WebSocket (Socket.io) implementado no ClinicaFlow.

## 📋 Overview

O sistema de notificações permite enviar e receber notificações em tempo real através de WebSocket, com persistência no banco de dados e suporte para notificações globais ou direcionadas a usuários específicos.

### Tecnologias Utilizadas

- **Socket.io 4.7.2** - WebSocket com fallback para polling
- **Supabase PostgreSQL** - Persistência de notificações
- **Winston** - Logging estruturado
- **Zod** - Validação de dados

---

## 🏗️ Arquitetura

```
┌─────────────┐         WebSocket          ┌─────────────────┐
│   Frontend  │ ◄────────────────────────► │   Socket.io     │
│  (Cliente)  │         Socket.io          │    Server       │
└─────────────┘                            └─────────────────┘
                                                    │
                                                    ▼
                                            ┌─────────────────┐
                                            │  Notification   │
                                            │    Service      │
                                            └─────────────────┘
                                                    │
                                                    ▼
                                            ┌─────────────────┐
                                            │    Supabase     │
                                            │   PostgreSQL    │
                                            └─────────────────┘
```

---

## 🚀 Backend - Implementação

### 1. NotificationService (`notification.service.ts`)

Classe singleton que gerencia todo o sistema de notificações.

#### Métodos Principais:

```typescript
// Inicializar Socket.io
initializeSocket(httpServer: HTTPServer): void

// Criar notificação (persiste e emite via Socket)
createNotification(data: CreateNotificationData): Promise<Notification | null>

// Buscar notificações
getUserNotifications(userId?: string, limit?: number): Promise<Notification[]>
getUnreadNotifications(userId?: string): Promise<Notification[]>

// Marcar como lida
markAsRead(notificationId: string): Promise<boolean>
markAllAsRead(userId?: string): Promise<boolean>

// Deletar
deleteNotification(notificationId: string): Promise<boolean>

// Utilitários
getConnectedUsersCount(): number
isUserConnected(userId: string): boolean
```

#### Eventos Socket.io:

**Cliente → Servidor:**
- `authenticate` - Autenticar usuário (envia userId)
- `mark_as_read` - Marcar notificação como lida (envia notificationId)
- `disconnect` - Desconexão

**Servidor → Cliente:**
- `new_notification` - Nova notificação criada
- `unread_notifications` - Lista de notificações não lidas (ao conectar)
- `notification_read` - Confirmação de leitura

---

### 2. Controller (`notification.controller.ts`)

#### Endpoints REST:

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/notifications` | Lista todas notificações |
| GET | `/api/notifications/unread` | Lista não lidas |
| GET | `/api/notifications/stats` | Estatísticas |
| POST | `/api/notifications` | Cria notificação (emite via Socket) |
| PATCH | `/api/notifications/:id/read` | Marca como lida |
| PATCH | `/api/notifications/mark-all-read` | Marca todas como lidas |
| DELETE | `/api/notifications/:id` | Deleta notificação |

#### Exemplos de Requisição:

**Criar Notificação:**
```bash
POST /api/notifications
Content-Type: application/json

{
  "title": "Novo Agendamento",
  "message": "Paciente João agendou consulta para amanhã",
  "type": "info",
  "userId": "uuid-opcional"  // Omitir para notificação global
}
```

**Buscar Não Lidas:**
```bash
GET /api/notifications/unread?userId=abc-123
```

**Estatísticas:**
```bash
GET /api/notifications/stats?userId=abc-123

Response:
{
  "success": true,
  "data": {
    "total": 45,
    "unread": 3,
    "read": 42,
    "connectedUsers": 2,
    "isConnected": true
  }
}
```

---

### 3. Configuração do Servidor (`server.ts`)

```typescript
import { createServer } from 'http';
import notificationService from './services/notification.service';

const app = express();
const httpServer = createServer(app);  // ← HTTP Server para Socket.io

// Inicializar Socket.io
notificationService.initializeSocket(httpServer);

// Usar httpServer.listen ao invés de app.listen
httpServer.listen(PORT, () => {
  console.log('Socket.io initialized and ready');
});
```

---

### 4. Migração do Banco (`02_add_user_id_to_notifications.sql`)

```sql
-- Adiciona campo user_id (nullable)
ALTER TABLE notifications
ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Índices para performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read)
WHERE read = false;
```

**Estrutura da Tabela `notifications`:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| title | VARCHAR(200) | Título da notificação |
| message | VARCHAR(500) | Mensagem |
| type | ENUM | success, info, warning, error |
| read | BOOLEAN | Lida ou não |
| user_id | UUID (nullable) | Usuário destinatário (NULL = global) |
| created_at | TIMESTAMP | Data de criação |

---

## 💻 Frontend - Integração

### 1. Instalar Socket.io Client

```bash
npm install socket.io-client@^4.7.2
```

### 2. Hook useNotifications (Exemplo)

```typescript
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

export const useNotifications = (userId?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Conectar ao Socket.io
    const newSocket = io(process.env.VITE_API_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
    });

    // Autenticar
    if (userId) {
      newSocket.emit('authenticate', userId);
    }

    // Ouvir eventos
    newSocket.on('new_notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      // Toast ou som aqui
    });

    newSocket.on('unread_notifications', (unread) => {
      setNotifications(unread);
      setUnreadCount(unread.length);
    });

    newSocket.on('notification_read', (notificationId) => {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId]);

  const markAsRead = (notificationId: string) => {
    socket?.emit('mark_as_read', notificationId);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    isConnected: socket?.connected || false,
  };
};
```

### 3. Uso no Componente

```typescript
function App() {
  const user = getStoredUser();
  const { notifications, unreadCount, markAsRead } = useNotifications(user?.id);

  return (
    <div>
      <NotificationBell count={unreadCount} />
      <NotificationList
        notifications={notifications}
        onMarkAsRead={markAsRead}
      />
    </div>
  );
}
```

---

## 🔧 Configuração

### Variáveis de Ambiente

**Backend `.env`:**
```env
FRONTEND_URL=http://localhost:5173
PORT=3001
```

**Frontend `.env`:**
```env
VITE_API_URL=http://localhost:3001
```

### Docker

Socket.io já está configurado no `docker-compose.yml`. Nenhuma alteração necessária.

---

## 🧪 Testes

### Testar Socket.io Manualmente

**1. Conectar via Postman/Thunder Client:**
```javascript
// Aba WebSocket
ws://localhost:3001

// Enviar evento
{
  "event": "authenticate",
  "data": "user-uuid-here"
}
```

**2. Criar Notificação via API:**
```bash
curl -X POST http://localhost:3001/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Teste",
    "message": "Mensagem de teste",
    "type": "info"
  }'
```

**3. Verificar Health Check:**
```bash
curl http://localhost:3001/health

Response:
{
  "status": "ok",
  "socketio": {
    "connected": 2  // ← Usuários conectados
  }
}
```

---

## 📊 Casos de Uso

### 1. Notificação Global (Todos os Usuários)

```typescript
await notificationService.createNotification({
  title: 'Manutenção Programada',
  message: 'Sistema ficará offline às 23h',
  type: 'warning',
  // userId não fornecido = global
});
```

### 2. Notificação Específica para Usuário

```typescript
await notificationService.createNotification({
  title: 'Agendamento Confirmado',
  message: 'Sua consulta foi confirmada',
  type: 'success',
  userId: 'abc-123',  // ← Específico
});
```

### 3. Auto-Notificação em Eventos

Exemplo: Notificar quando nova oportunidade é criada.

```typescript
// Em opportunity.controller.ts
export const createOpportunity = async (req, res) => {
  // ... criar oportunidade

  // Notificar automaticamente
  await notificationService.createNotification({
    title: 'Nova Oportunidade',
    message: `${opportunity.name} - ${opportunity.keywordFound}`,
    type: 'success',
    userId: req.user.id,  // Do middleware de auth
  });

  res.json({ success: true, data: opportunity });
};
```

---

## 🔒 Segurança

### Considerações:

1. **Autenticação**: Implementar validação de JWT no evento `authenticate`
2. **Autorização**: Validar que usuário só pode acessar suas notificações
3. **Rate Limiting**: Socket.io já tem proteção, mas configurar limites adicionais
4. **XSS**: Sanitizar HTML em mensagens de notificação no frontend

### Melhorias Futuras:

```typescript
// Validar JWT no evento authenticate
socket.on('authenticate', async (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    this.connectedUsers.set(userId, socket);
    this.sendUnreadNotifications(userId, socket);
  } catch (error) {
    socket.disconnect();
  }
});
```

---

## 📈 Performance

### Otimizações Implementadas:

- ✅ Índices no banco (user_id, read)
- ✅ Limite de notificações por query (padrão: 50)
- ✅ Cleanup automático ao desconectar
- ✅ Eventos específicos (não broadcast desnecessário)

### Monitoramento:

```typescript
// Verificar usuários conectados
console.log(notificationService.getConnectedUsersCount());

// Verificar se usuário está online
console.log(notificationService.isUserConnected('user-id'));
```

---

## 🐛 Troubleshooting

### Problema: Socket não conecta

**Solução:**
1. Verificar CORS em `server.ts`
2. Verificar `FRONTEND_URL` no `.env`
3. Tentar `transports: ['polling']` no cliente

### Problema: Notificações não aparecem

**Solução:**
1. Verificar se evento `authenticate` foi emitido
2. Verificar logs do Winston
3. Testar via health check se Socket.io está ativo

### Problema: Performance lenta

**Solução:**
1. Aumentar limite de conexões no Socket.io
2. Implementar Redis para distribuição (cluster)
3. Adicionar mais índices no banco

---

## 📚 Recursos

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Socket.io Client API](https://socket.io/docs/v4/client-api/)
- [Supabase Real-time](https://supabase.com/docs/guides/realtime)

---

## ✅ Checklist de Implementação

**Backend:**
- [x] Socket.io configurado no server.ts
- [x] NotificationService criado
- [x] Controller com 7 endpoints
- [x] Rotas atualizadas
- [x] Migração do banco (user_id)
- [x] Logging estruturado
- [x] Validação Zod

**Frontend (Pendente):**
- [ ] Instalar socket.io-client
- [ ] Criar hook useNotifications
- [ ] Atualizar NotificationsPopover
- [ ] Adicionar toast para novas notificações
- [ ] Som de notificação (opcional)
- [ ] Badge de contador atualizado

**Deploy:**
- [ ] Variáveis de ambiente configuradas
- [ ] Testar em staging
- [ ] Monitoramento ativo (Sentry)

---

**Documentação criada por IntelliX.AI** 🧠
**Data**: 02/12/2025
**Versão**: 1.0
