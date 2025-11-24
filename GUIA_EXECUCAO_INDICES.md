# 🚀 Guia de Execução - Scripts de Índices para Resolver Lentidão

## ⚠️ Problema
Queries dando timeout e alto consumo no Supabase devido à falta de índices nas tabelas.

## ✅ Solução em 3 Partes

Execute os scripts **na ordem abaixo**, aguardando alguns minutos entre cada execução.

---

## 📋 PARTE 1: ÍNDICES CRÍTICOS (Execute PRIMEIRO)

**Arquivo:** `create_indexes_part1_critical.sql`

### O que este script faz:
- ✅ Cria índices para **busca por nome** em `sis_pessoa` (usa trigram GIN para ILIKE eficiente)
- ✅ Cria índices para **agendamentos** em `amb_marcacao`
- ✅ Cria índices para **lançamentos financeiros** em `fin_lancamentopr`

### Como executar:
1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
2. Vá em **SQL Editor**
3. Abra o arquivo `create_indexes_part1_critical.sql`
4. **Cole TODO o conteúdo** no editor SQL
5. Clique em **Run** ou **Execute**
6. ⏳ **AGUARDE 2-3 MINUTOS** para os índices serem criados

### ⚠️ Se der erro sobre extensão `pg_trgm`:
- Use o arquivo alternativo: `create_indexes_part1_critical_alternative.sql`
- Ou habilite a extensão em: **Database** → **Extensions** → **pg_trgm**

---

## 📋 PARTE 2: ÍNDICES SECUNDÁRIOS (Execute DEPOIS da Parte 1)

**Arquivo:** `create_indexes_part2_secondary.sql`

### O que este script faz:
- ✅ Cria índices adicionais para `amb_marcacao`
- ✅ Cria índices para **orçamentos** (`amb_orcamento`)
- ✅ Cria índices para **itens de orçamento** (`amb_orcaitem`)
- ✅ Cria índices para **movimentações financeiras** (`fin_movconta`)
- ✅ Cria índices para **pacientes, imagens e dentistas**

### Como executar:
1. **Aguarde 2-3 minutos** após a Parte 1
2. No SQL Editor, abra o arquivo `create_indexes_part2_secondary.sql`
3. **Cole TODO o conteúdo** no editor SQL
4. Clique em **Run** ou **Execute**
5. ⏳ **AGUARDE 2-3 MINUTOS** para os índices serem criados

---

## 📋 PARTE 3: ANALYZE (Execute DEPOIS das Partes 1 e 2)

**Arquivo:** `create_indexes_part3_analyze.sql`

### O que este script faz:
- ✅ Atualiza estatísticas do PostgreSQL para melhorar o planejamento de queries
- ✅ Ajuda o otimizador a escolher os melhores índices

### Como executar:
1. **Aguarde 2-3 minutos** após a Parte 2
2. No SQL Editor, abra o arquivo `create_indexes_part3_analyze.sql`
3. **Cole TODO o conteúdo** no editor SQL
4. Clique em **Run** ou **Execute**
5. ⚠️ Se der timeout, execute cada `ANALYZE` separadamente

---

## 🔍 Verificar se os Índices Foram Criados

Após executar cada parte, você pode verificar se os índices foram criados:

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

---

## 📊 Queries que Serão Otimizadas

Após executar os scripts, estas queries que estavam dando timeout serão resolvidas:

1. ✅ `GET /sis_pessoa?pessoa=ilike.%25maria%25` 
   - Resolvido por: `idx_sis_pessoa_pessoa_trgm` (trigram GIN)

2. ✅ `GET /amb_marcacao?idpaciente=eq.295828`
   - Resolvido por: `idx_amb_marcacao_idpaciente`

3. ✅ `GET /fin_lancamentopr?idpessoa=eq.295828`
   - Resolvido por: `idx_fin_lancamentopr_idpessoa`

4. ✅ `GET /amb_marcacao?iddentista=not.is.null`
   - Resolvido por: `idx_amb_marcacao_idpaciente_iddentista` (índice parcial)

---

## ⚡ Dicas Importantes

1. **Execute uma parte por vez** - não tente executar tudo de uma vez
2. **Aguarde entre execuções** - dê tempo para o PostgreSQL criar os índices
3. **Se der timeout na Parte 3**, execute cada `ANALYZE` separadamente
4. **Teste o sistema** após cada parte para ver se melhorou
5. **Os índices são criados com `IF NOT EXISTS`**, então é seguro executar múltiplas vezes

---

## 📝 Notas Técnicas

- Os índices são criados com `IF NOT EXISTS`, então é seguro executar múltiplas vezes
- A criação de índices pode levar alguns minutos em tabelas grandes
- O sistema continuará funcionando durante a criação dos índices (pode ficar um pouco mais lento)
- O índice **trigram (GIN)** na tabela `sis_pessoa` é especialmente importante para buscas por nome
- A extensão `pg_trgm` será habilitada automaticamente se ainda não estiver habilitada

---

## 🎯 Resultado Esperado

Após executar todas as partes:
- ✅ Queries de busca por nome serão **muito mais rápidas**
- ✅ Queries de agendamentos por paciente serão **instantâneas**
- ✅ Queries de lançamentos financeiros serão **otimizadas**
- ✅ Timeouts devem **desaparecer completamente**
- ✅ Consumo de recursos no Supabase deve **diminuir significativamente**

---

## 🆘 Problemas Comuns

### Erro: "extension pg_trgm does not exist"
**Solução:** Use `create_indexes_part1_critical_alternative.sql` ou habilite a extensão manualmente.

### Erro: "column idprocedimento does not exist"
**Solução:** Normal, essa coluna foi comentada. Execute `verificar_colunas_procedimento.sql` se precisar desse índice.

### Timeout ao executar ANALYZE
**Solução:** Execute cada `ANALYZE` separadamente, aguardando alguns segundos entre cada um.

---

## ✅ Checklist de Execução

- [ ] Executei a **Parte 1** (`create_indexes_part1_critical.sql`)
- [ ] Aguardei 2-3 minutos
- [ ] Executei a **Parte 2** (`create_indexes_part2_secondary.sql`)
- [ ] Aguardei 2-3 minutos
- [ ] Executei a **Parte 3** (`create_indexes_part3_analyze.sql`)
- [ ] Verifiquei os índices criados
- [ ] Testei o sistema e confirmei melhoria na performance

---

**Boa sorte! 🚀**

