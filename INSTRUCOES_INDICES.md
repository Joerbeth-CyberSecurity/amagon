# 📋 Instruções para Criar Índices no Supabase

## ⚠️ Problema Atual
As queries estão dando timeout porque faltam índices nas tabelas. O script completo está muito grande e também dá timeout.

## ✅ Solução: Executar em Partes

### **PASSO 1: Execute a Parte 1 (CRÍTICO)**
1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
2. Vá em **SQL Editor**
3. Abra o arquivo `create_indexes_part1_critical.sql`
4. **Cole TODO o conteúdo** no editor SQL
5. Clique em **Run** ou **Execute**
6. ⏳ **AGUARDE 2-3 MINUTOS** para os índices serem criados

### **PASSO 2: Execute a Parte 2 (SECUNDÁRIO)**
1. Após a Parte 1 ter sido executada com sucesso
2. No SQL Editor, abra o arquivo `create_indexes_part2_secondary.sql`
3. **Cole TODO o conteúdo** no editor SQL
4. Clique em **Run** ou **Execute**
5. ⏳ **AGUARDE 2-3 MINUTOS** para os índices serem criados

### **PASSO 3: Execute a Parte 3 (ANALYZE) - OPCIONAL**
1. Após as Partes 1 e 2 terem sido executadas
2. No SQL Editor, abra o arquivo `create_indexes_part3_analyze.sql`
3. **Cole TODO o conteúdo** no editor SQL
4. Clique em **Run** ou **Execute**
5. ⚠️ Se der timeout, execute cada `ANALYZE` separadamente

## 🎯 Índices Mais Importantes (Parte 1)

Os índices da Parte 1 são os **mais críticos** porque estão causando timeout nas queries:

- ✅ `sis_pessoa` - Busca por nome (ILIKE) - **CRÍTICO!**
  - Usa índice **trigram (GIN)** para buscas `ILIKE '%termo%'` eficientes
  - Habilita automaticamente a extensão `pg_trgm` se necessário
- ✅ `amb_marcacao` - Agendamentos por paciente - **CRÍTICO!**
  - Inclui índice para queries com `iddentista IS NOT NULL`
- ✅ `fin_lancamentopr` - Lançamentos financeiros - **CRÍTICO!**

## 📊 Verificar se os Índices Foram Criados

Após executar cada parte, você pode verificar se os índices foram criados executando:

```sql
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('sis_pessoa', 'amb_marcacao', 'fin_lancamentopr', 'amb_orcamento')
ORDER BY tablename, indexname;
```

## ⚡ Dicas

1. **Execute uma parte por vez** - não tente executar tudo de uma vez
2. **Aguarde entre execuções** - dê tempo para o PostgreSQL criar os índices
3. **Se der timeout na Parte 3**, execute cada `ANALYZE` separadamente
4. **Teste o sistema** após cada parte para ver se melhorou

## 🔍 Queries que Estão Dando Timeout

As seguintes queries estão dando timeout e serão resolvidas pelos índices:

1. `GET /sis_pessoa?pessoa=ilike.%25maria%25` - Resolvido por `idx_sis_pessoa_pessoa_lower`
2. `GET /amb_marcacao?idpaciente=eq.295828` - Resolvido por `idx_amb_marcacao_idpaciente`
3. `GET /fin_lancamentopr?idpessoa=eq.295828` - Resolvido por `idx_fin_lancamentopr_idpessoa`

## 📝 Notas

- Os índices são criados com `IF NOT EXISTS`, então é seguro executar múltiplas vezes
- A criação de índices pode levar alguns minutos em tabelas grandes
- O sistema continuará funcionando durante a criação dos índices (pode ficar um pouco mais lento)
- O índice **trigram (GIN)** na tabela `sis_pessoa` é especialmente importante para buscas por nome
- A extensão `pg_trgm` será habilitada automaticamente se ainda não estiver habilitada

## ⚠️ Se a Extensão pg_trgm Não Estiver Disponível

Se você receber um erro sobre a extensão `pg_trgm` não estar disponível:

**Opção 1 (Recomendado):**
1. No Supabase Dashboard, vá em **Database** → **Extensions**
2. Procure por **pg_trgm** (PostgreSQL Trigram)
3. Habilite a extensão
4. Execute novamente o script `create_indexes_part1_critical.sql`

**Opção 2 (Alternativa):**
1. Use o script alternativo: `create_indexes_part1_critical_alternative.sql`
2. Este script não usa trigram, mas ainda melhora significativamente a performance
3. Continue com as Partes 2 e 3 normalmente

