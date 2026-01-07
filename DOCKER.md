# 🐳 ClinicaFlow - Docker Setup Guide

Guia completo para executar o ClinicaFlow usando Docker em ambiente de produção.

## 📋 Pré-requisitos

- **Docker Desktop** instalado e rodando
  - Windows: [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
  - Versão mínima: 20.10+
- **Docker Compose** (incluído no Docker Desktop)
- **PowerShell** 5.1 ou superior (para scripts de automação)
- **4GB RAM** disponível (mínimo)
- **10GB** de espaço em disco

## 🚀 Quick Start

### 1. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure suas credenciais:

```powershell
# Copiar template
Copy-Item .env.docker.example .env

# Editar com suas configurações
notepad .env
```

**Variáveis obrigatórias** que você DEVE configurar:

```env
# Supabase (obtenha em https://app.supabase.com/project/_/settings/api)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_key

# JWT Secrets (gere com: openssl rand -base64 32)
JWT_SECRET=sua_secret_key_forte
JWT_REFRESH_SECRET=sua_refresh_secret_key_forte
```

### 2. Build das Imagens

Execute o script de build:

```powershell
.\scripts\docker-build.ps1
```

Opções disponíveis:
- `-NoBuildCache`: Força rebuild completo sem cache
- `-Verbose`: Mostra output detalhado do build

### 3. Iniciar Aplicação

Execute o script de start:

```powershell
.\scripts\docker-up.ps1
```

O script irá:
- ✅ Verificar se Docker está rodando
- ✅ Validar arquivo `.env`
- ✅ Iniciar containers
- ✅ Monitorar health checks
- ✅ Mostrar URLs de acesso

**Opções disponíveis:**
- `-Detached`: Roda em background (sem logs no terminal)
- `-Build`: Faz build antes de iniciar
- `-WaitSeconds 120`: Tempo máximo de espera pelos health checks

### 4. Acessar Aplicação

Após containers ficarem "healthy":

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📊 Monitoramento e Logs

### Ver Logs em Tempo Real

```powershell
# Todos os serviços
.\scripts\docker-logs.ps1 -Follow

# Apenas backend
.\scripts\docker-logs.ps1 -Service backend -Follow

# Apenas frontend
.\scripts\docker-logs.ps1 -Service frontend -Follow
```

### Ver Últimas N Linhas

```powershell
# Últimas 100 linhas (padrão)
.\scripts\docker-logs.ps1

# Últimas 500 linhas do backend
.\scripts\docker-logs.ps1 -Service backend -Tail 500
```

### Ver Logs de Período Específico

```powershell
# Logs das últimas 2 horas
.\scripts\docker-logs.ps1 -Since 2h

# Logs desde timestamp
.\scripts\docker-logs.ps1 -Since "2025-11-29T10:00:00"
```

## 🛠️ Comandos Úteis

### Status dos Containers

```powershell
# Ver containers rodando
docker ps

# Apenas ClinicaFlow
docker ps --filter "name=clinicaflow"

# Status detalhado com health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Gerenciamento de Containers

```powershell
# Parar containers
docker-compose down

# Parar e remover volumes
docker-compose down -v

# Reiniciar serviço específico
docker-compose restart backend

# Reiniciar todos
docker-compose restart
```

### Inspeção e Debug

```powershell
# Entrar no container backend
docker exec -it clinicaflow-backend sh

# Entrar no container frontend
docker exec -it clinicaflow-frontend sh

# Ver logs de um container específico
docker logs clinicaflow-backend -f

# Inspecionar health check
docker inspect --format='{{json .State.Health}}' clinicaflow-backend
```

### Limpeza

```powershell
# Remover containers parados
docker-compose down

# Remover imagens antigas
docker image prune -a

# Limpeza completa (cuidado!)
docker system prune -a --volumes
```

## 🏗️ Arquitetura Docker

### Estrutura de Serviços

```
┌─────────────────────────────────────────┐
│          Frontend (Nginx)               │
│     http://localhost:80                 │
│  ┌──────────────────────────────────┐   │
│  │   React App (Vite Build)         │   │
│  │   - Static Assets Cached         │   │
│  │   - Gzip Compression             │   │
│  │   - Security Headers             │   │
│  └──────────────────────────────────┘   │
└─────────────┬───────────────────────────┘
              │ Proxy /api/*
              ▼
┌─────────────────────────────────────────┐
│       Backend API (Node.js)             │
│     http://backend:3001                 │
│  ┌──────────────────────────────────┐   │
│  │   Express + TypeScript           │   │
│  │   - JWT Auth                     │   │
│  │   - Rate Limiting                │   │
│  │   - Winston Logging              │   │
│  └──────────────────────────────────┘   │
└─────────────┬───────────────────────────┘
              │
              ▼
    ┌──────────────────┐
    │  Supabase Cloud  │
    │   (PostgreSQL)   │
    └──────────────────┘
```

### Imagens Docker

**Backend** (`clinicaflow-backend:latest`):
- Base: `node:20-alpine`
- Multi-stage build
- Tamanho final: ~150MB
- Non-root user (nodejs:1001)
- Health check com curl

**Frontend** (`clinicaflow-frontend:latest`):
- Base: `nginx:alpine`
- Multi-stage build com Node.js 20
- Tamanho final: ~50MB
- Health check com curl

### Volumes Persistentes

```yaml
backend-logs:
  - Armazena logs do Winston (opcional)
  - Persiste entre restarts
  - Localização: /app/logs
```

### Resource Limits

**Backend**:
- CPU: 0.5-1 core
- RAM: 256-512MB

**Frontend**:
- CPU: 0.25-0.5 core
- RAM: 128-256MB

## 🔐 Segurança

### Secrets Management

**❌ NÃO FAÇA:**
- Comitar arquivo `.env` no Git
- Usar secrets padrão em produção
- Expor portas desnecessárias

**✅ FAÇA:**
- Use o `.env.docker.example` como template
- Gere secrets fortes: `openssl rand -base64 32`
- Configure `.env` em cada ambiente separadamente
- Use Docker secrets em orquestradores (Swarm/Kubernetes)

### Security Headers

O Nginx está configurado com:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (geolocation, camera, microphone)

### Rate Limiting

- **Nginx**: 10 req/s no endpoint `/api` (burst: 20)
- **Backend**: Rate limiting global via express-rate-limit

## 🐛 Troubleshooting

### Container Não Fica "Healthy"

**Sintomas**: Container inicia mas health check falha

```powershell
# Ver motivo do health check falhar
docker inspect --format='{{json .State.Health}}' clinicaflow-backend | ConvertFrom-Json

# Ver logs do container
docker logs clinicaflow-backend --tail 50
```

**Soluções comuns**:
1. Backend não consegue conectar ao Supabase → Verifique `SUPABASE_URL` e `SUPABASE_ANON_KEY`
2. Porta já em uso → Mude `FRONTEND_PORT` no `.env`
3. Timeout no build → Aumente `start_period` no health check

### Build Falha

**Erro: "Cannot find module..."**

```powershell
# Rebuild sem cache
.\scripts\docker-build.ps1 -NoBuildCache
```

**Erro: "COPY failed: no source files..."**

- Verifique se `.dockerignore` não está excluindo arquivos necessários
- Confirme que `package.json` existe no contexto

### Frontend Não Consegue Conectar ao Backend

**Problema**: API calls falham com erro de rede

**Solução**: Verifique configuração no `.env`:

```env
# IMPORTANTE: `VITE_API_URL` é embutida no bundle e roda no navegador.
# Portanto, não pode usar o DNS interno do Docker (ex: http://backend:3001).
# Recomendado: usar a mesma origem e deixar o Nginx fazer o proxy para o backend.
VITE_API_URL=/api

# Origem do frontend (usada no CORS do backend)
FRONTEND_URL=http://localhost
```

### Permissões Negadas (Linux)

```bash
# Dar permissão de execução aos scripts
chmod +x scripts/*.ps1

# OU usar pwsh explicitamente
pwsh scripts/docker-build.ps1
```

### Porta Já em Uso

```powershell
# Verificar o que está usando a porta
netstat -ano | findstr :80
netstat -ano | findstr :3001

# Mudar porta do frontend no .env
FRONTEND_PORT=8080
```

## 📈 Monitoria de Performance

### Ver Uso de Recursos

```powershell
# Em tempo real
docker stats

# Apenas ClinicaFlow
docker stats clinicaflow-backend clinicaflow-frontend
```

### Métricas Importantes

- **Backend**: CPU < 50%, RAM < 400MB (normal)
- **Frontend**: CPU < 10%, RAM < 150MB (normal)
- **Network**: < 1MB/s (tráfego típico)

### Logs de Performance

```powershell
# Ver logs de requisições HTTP (Morgan)
docker logs clinicaflow-backend | Select-String "GET\|POST\|PUT\|DELETE"
```

## 🚀 Deploy em Produção

### Checklist Pré-Deploy

- [ ] Todos os secrets configurados corretamente
- [ ] `NODE_ENV=production` no `.env`
- [ ] Build testado localmente
- [ ] Health checks passando
- [ ] Resource limits configurados
- [ ] Backup strategy definida
- [ ] Monitoring configurado (Sentry, etc)

### Variáveis de Produção

```env
NODE_ENV=production
FRONTEND_URL=https://seu-dominio.com
# Se o backend estiver atrás do mesmo domínio via reverse-proxy:
VITE_API_URL=/api
# Se o backend estiver em outro host/domínio, inclua o prefixo /api:
# VITE_API_URL=https://api.seu-dominio.com/api
```

### HTTPS / SSL

Para produção, recomenda-se:
1. **Reverse Proxy** (Traefik, Caddy, Nginx externo)
2. **Cloud Load Balancer** (AWS ALB, GCP LB, Azure App Gateway)
3. **Let's Encrypt** para certificados SSL

Exemplo com Traefik:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.clinicaflow.rule=Host(`seu-dominio.com`)"
  - "traefik.http.routers.clinicaflow.tls.certresolver=letsencrypt"
```

## 🔄 Backup e Restore

### Backup de Volumes

```powershell
# Backup de logs
docker run --rm -v clinicaflow_backend-logs:/data -v ${PWD}/backup:/backup alpine tar czf /backup/logs-backup.tar.gz -C /data .
```

### Restore

```powershell
# Restore de logs
docker run --rm -v clinicaflow_backend-logs:/data -v ${PWD}/backup:/backup alpine tar xzf /backup/logs-backup.tar.gz -C /data
```

## 📚 Referências

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [ClinicaFlow GitHub](https://github.com/seu-usuario/clinicaflow)

## 💡 Dicas Avançadas

### Auto-restart em Produção

O `restart: unless-stopped` garante que containers reiniciem automaticamente após:
- Crash do container
- Reinício do servidor
- Atualização do Docker

### Otimização de Build

```powershell
# Use BuildKit para builds mais rápidos
$env:DOCKER_BUILDKIT=1
$env:COMPOSE_DOCKER_CLI_BUILD=1

docker-compose build
```

### Multi-Platform Build

Para deploy em ARM (Raspberry Pi, M1 Mac):

```powershell
docker buildx build --platform linux/amd64,linux/arm64 -t clinicaflow-backend:latest ./backend
```

---

**Desenvolvido por IntelliX.AI** 🧠
**Versão**: 1.0.0
**Data**: 29/11/2025
