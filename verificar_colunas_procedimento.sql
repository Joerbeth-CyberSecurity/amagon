-- ============================================================================
-- Script para verificar colunas relacionadas a procedimento
-- Execute este script para descobrir os nomes corretos das colunas
-- ============================================================================

-- 1. Verifica estrutura da tabela fat_procedimento
SELECT 
    'fat_procedimento' AS tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'fat_procedimento'
ORDER BY ordinal_position;

-- 2. Verifica chave primária de fat_procedimento
SELECT 
    'fat_procedimento PK' AS info,
    a.attname AS column_name
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
WHERE i.indrelid = 'fat_procedimento'::regclass
    AND i.indisprimary;

-- 3. Verifica se amb_orcaitem tem coluna idprocedimento
SELECT 
    'amb_orcaitem' AS tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'amb_orcaitem'
    AND column_name LIKE '%procedimento%'
ORDER BY ordinal_position;

-- 4. Lista todas as colunas de amb_orcaitem (para referência)
SELECT 
    'amb_orcaitem (todas)' AS info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'amb_orcaitem'
ORDER BY ordinal_position;

