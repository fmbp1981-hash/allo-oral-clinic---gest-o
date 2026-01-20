# Guia de Configuração do Trello

Este guia explica como obter as credenciais necessárias para integrar o sistema com o Trello.

## 📋 Pré-requisitos

1. Uma conta no Trello (gratuita ou paga)
2. Acesso ao Trello Power-Up Admin

---

## 🔑 Passo 1: Obter a API Key

1. Acesse o **Trello Power-Up Admin**:
   - URL: https://trello.com/power-ups/admin

2. Se solicitado, faça login com sua conta Trello

3. Clique em **"New"** para criar um novo Power-Up (ou use um existente)

4. Preencha os campos básicos:
   - **Name**: "Allo Oral Clinic CRM" (ou nome de sua preferência)
   - **Workspace**: Selecione seu workspace
   - **Email**: Seu email de contato

5. Clique em **"Create"**

6. Na página do Power-Up criado, você verá sua **API Key**
   - Copie e guarde este valor

---

## 🎫 Passo 2: Gerar o Token

1. Na mesma página da API Key, clique no link:
   **"Token"** ou **"Generate a Token"**

2. Você será redirecionado para uma página de autorização

3. Revise as permissões solicitadas:
   - ✅ Read/Write access to boards
   - ✅ Read/Write access to cards
   - ✅ Read/Write access to lists

4. Clique em **"Allow"** para autorizar

5. Um **Token** será gerado e exibido
   - **⚠️ IMPORTANTE**: Copie e guarde este token em local seguro
   - Este token não será exibido novamente!

---

## ⚙️ Passo 3: Configurar no Sistema

1. No sistema Allo Oral Clinic, vá em **Configurações** (ícone de engrenagem)

2. Na seção **"3. Integração Trello"**:
   - Cole a **API Key** no campo correspondente
   - Cole o **Token** no campo correspondente

3. Clique em **"Testar Conexão"** para verificar

4. Se a conexão for bem-sucedida:
   - Selecione o **Board** que deseja usar
   - Clique em **"Configurar Listas Automáticas"** para criar as listas do CRM

5. Ative a **"Sincronização Automática"** se desejar

6. Clique em **"Salvar Configuração"**

---

## 📂 Estrutura de Listas Criadas

Ao configurar as listas automáticas, o sistema criará (ou usará existentes):

| Lista | Descrição |
|-------|-----------|
| 📥 Novos Leads | Oportunidades novas/recém-criadas |
| 📤 Mensagem Enviada | Paciente foi contatado |
| 💬 Respondeu | Paciente respondeu à mensagem |
| 📅 Agendado | Consulta foi agendada |
| ✅ Arquivado | Oportunidade finalizada |

---

## 🔄 Funcionalidades da Integração

### Sincronização Bidirecional

- **Sistema → Trello**: Quando uma oportunidade é criada ou atualizada, um cartão correspondente é criado/atualizado no Trello

- **Trello → Sistema**: Quando um cartão é movido entre listas no Trello, o status da oportunidade é atualizado automaticamente

### Ações Disponíveis

| Ação | Descrição |
|------|-----------|
| Criar cartão | Ao criar oportunidade no sistema |
| Mover cartão | Ao mudar status da oportunidade |
| Atualizar cartão | Ao editar informações do paciente |
| Adicionar comentário | Notas são sincronizadas como comentários |

---

## 🔒 Segurança

- As credenciais são armazenadas de forma segura no banco de dados
- O token tem escopo limitado apenas ao seu workspace
- Você pode revogar o token a qualquer momento no Trello

### Para Revogar Acesso

1. Acesse: https://trello.com/your-account
2. Vá em **Settings** → **Apps**
3. Encontre "Allo Oral Clinic CRM" e clique em **Revoke**

---

## ❓ Solução de Problemas

### "Falha na conexão"
- Verifique se a API Key e Token estão corretos
- Certifique-se de que não há espaços extras
- O token pode ter expirado - gere um novo

### "Board não encontrado"
- O board deve estar no mesmo workspace do Power-Up
- Verifique se você tem permissão de acesso ao board

### "Erro ao criar listas"
- Verifique se você tem permissão de edição no board
- Tente usar um board diferente

---

## 📞 Suporte

Em caso de dúvidas, entre em contato com o suporte técnico.
