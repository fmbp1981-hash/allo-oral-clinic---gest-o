# Plano Atual — ClinicaFlow

## Status da Branch `feature/melhorias-gerais`

### ✅ Concluído

- **Remoção total do Trello** — todas as rotas, componentes, serviços e migrations deletados. Sem referências residuais.
- **WhatsApp + Agente IA** (`feat(campaigns+agent)`) — implementado conforme plano `docs/superpowers/plans/2026-03-17-reativacao-whatsapp-agente-ia.md`:
  - Importação de pacientes via Excel (`/api/patients/import`)
  - Campanhas de reativação com personalização via OpenAI (`/api/campaigns/*`)
  - Agente passivo com webhooks Evolution API + Meta (`/api/webhook/whatsapp/*`)
  - UI: `CampaignWizard`, `CampaignHistory`, `AgentConfigPanel`
  - Utilitários: `provider-factory.ts`, `normalize-phone.ts`, `send-message.ts`
  - Testes unitários para whatsapp normalizer, excel parser, agent-response
- **Build TypeScript** — zero erros.

---

## ⚠️ Migrations Pendentes no Supabase

As migrations abaixo **existem como arquivos** mas precisam ser aplicadas manualmente no Supabase SQL Editor:

| Arquivo | Conteúdo |
|---------|---------|
| `backend/migrations/012_extend_patients_import.sql` | Adiciona `category`, `dentist_name`, `observations`, `source`, `imported_at` à tabela `patients` |
| `backend/migrations/013_campaigns_agent_tables.sql` | Cria `campaigns`, `campaign_patients`, `agent_conversations`, `agent_messages` |
| `backend/migrations/014_agent_config_in_settings.sql` | Adiciona `agent_config JSONB` à tabela `user_settings` |

**Como aplicar:** Supabase Dashboard → SQL Editor → executar cada arquivo em ordem (012 → 013 → 014).

---

## 🔜 Próximas Tasks

1. Aplicar migrations 012/013/014 no Supabase (necessário para campanhas e agente IA funcionarem)
2. Configurar variáveis de ambiente: `OPENAI_API_KEY`, `NEXT_PUBLIC_WHATSAPP_PROVIDER`
3. Testar fluxo completo: importar Excel → criar campanha → disparar → receber resposta do agente
4. Preparar deploy (Vercel frontend + configurar webhooks Evolution/Meta com URL pública)
