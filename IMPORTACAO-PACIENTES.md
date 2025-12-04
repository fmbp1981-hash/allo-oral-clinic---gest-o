# Guia de Importação de Pacientes

Este guia explica como importar sua base de pacientes para o sistema usando arquivos CSV ou XLSX.

## 📋 Formato do Arquivo

O sistema aceita arquivos **CSV** ou **XLSX** com as seguintes colunas (em qualquer ordem):

### Colunas Obrigatórias:
- **Nome** ou **name** - Nome do paciente (obrigatório)
- **Telefone** ou **phone** ou **Celular** - Telefone/celular do paciente (obrigatório)

### Colunas Opcionais:
- **Email** ou **E-mail** - Email do paciente
- **Historico** ou **history** ou **Observacoes** - Histórico de tratamentos, procedimentos realizados, observações

## 📝 Exemplo de Arquivo CSV

```csv
Nome,Telefone,Email,Historico
João Silva,11999998888,joao@email.com,"Implante realizado em 2023, consulta de rotina"
Maria Santos,11988887777,maria@email.com,"Clareamento dental, aparelho ortodôntico"
Carlos Oliveira,11977776666,carlos@email.com,"Extração de siso, canal tratado"
```

## 📊 Exemplo de Arquivo XLSX (Excel)

| Nome            | Telefone      | Email             | Historico                                |
|-----------------|---------------|-------------------|------------------------------------------|
| João Silva      | 11999998888   | joao@email.com    | Implante realizado em 2023              |
| Maria Santos    | 11988887777   | maria@email.com   | Clareamento dental, aparelho            |
| Carlos Oliveira | 11977776666   | carlos@email.com  | Extração de siso, canal tratado         |

## 🔀 Nomes de Colunas Aceitos

O sistema é flexível e aceita diferentes nomes para as colunas:

| Campo      | Nomes Aceitos                                          |
|------------|--------------------------------------------------------|
| Nome       | `name`, `Nome`, `NOME`                                 |
| Telefone   | `phone`, `Telefone`, `TELEFONE`, `Celular`, `CELULAR` |
| Email      | `email`, `Email`, `EMAIL`, `E-mail`                    |
| Histórico  | `history`, `Historico`, `HISTORICO`, `Observacoes`, `OBSERVACOES` |

## 🚀 Como Importar

### Pelo Frontend:
1. Acesse a página **"Base de Pacientes"**
2. Clique no botão **"Importar Pacientes"**
3. Selecione seu arquivo CSV ou XLSX
4. Aguarde o processamento
5. Veja o resumo da importação:
   - Total de linhas no arquivo
   - Pacientes válidos encontrados
   - Pacientes importados com sucesso
   - Erros (se houver)

### Validações:
- ✅ Só importa linhas com **Nome** E **Telefone**
- ✅ Linhas sem nome ou telefone são automaticamente ignoradas
- ✅ Remove duplicatas baseado em nome+telefone
- ✅ Associa automaticamente ao usuário logado (isolamento de dados)

## 🔒 Segurança

- ✅ **Isolamento Automático:** Todos os pacientes importados são automaticamente associados ao seu `user_id`
- ✅ **Sem Acesso Cruzado:** Você só verá seus próprios pacientes, nunca os de outros usuários
- ✅ **Row Level Security (RLS):** O Supabase garante isolamento no nível do banco de dados

## ⚠️ Limitações

- **Tamanho máximo:** Recomendado até 10.000 pacientes por arquivo
- **Formato de telefone:** Aceita qualquer formato (com ou sem DDD, com ou sem pontuação)
- **Encoding:** Use UTF-8 para caracteres especiais (acentos, ç, etc.)
- **Importações em lote:** Processamento em batches de 100 pacientes por vez

## 🛠 Exemplo de Preparação de Dados

Se você está exportando de outro sistema:

1. **Exporte para CSV ou XLSX**
2. **Renomeie as colunas** para os nomes aceitos (veja tabela acima)
3. **Verifique os dados:**
   - Nome e telefone preenchidos em todas as linhas
   - Sem caracteres especiais estranhos
   - Encoding UTF-8
4. **Importe no sistema**

## 📞 Suporte

Se tiver problemas na importação:
- Verifique se as colunas obrigatórias (Nome e Telefone) estão preenchidas
- Certifique-se de que o arquivo está em formato CSV ou XLSX válido
- Verifique o encoding (deve ser UTF-8)
- Veja os logs de erro retornados após a importação
