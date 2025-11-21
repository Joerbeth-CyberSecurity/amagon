-- ============================================================================
-- Script para verificar a estrutura da tabela fat_procedimento
-- Execute este script no SQL Editor do Supabase para descobrir o nome correto da coluna
-- ============================================================================

-- Verifica se a tabela existe e mostra suas colunas
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'fat_procedimento'
ORDER BY ordinal_position;

-- Verifica a chave primária da tabela
SELECT 
    a.attname AS column_name
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
WHERE i.indrelid = 'fat_procedimento'::regclass
    AND i.indisprimary;

-- ============================================================================
-- Após executar, use o nome da coluna encontrado para ajustar o script de índices
-- ============================================================================

