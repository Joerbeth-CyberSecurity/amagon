-- Script para verificar lançamentos "Em aberto" no Supabase
-- Este script busca todos os lançamentos que ainda não foram liquidados

-- 1. Verificar estrutura da tabela fin_lancamentopr
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'fin_lancamentopr'
ORDER BY ordinal_position;

-- 2. Buscar todos os lançamentos em aberto com detalhes (apenas colunas básicas confirmadas)
SELECT 
    l.idlancamento,
    l.idpessoa,
    p.pessoa AS nome_pessoa,
    p.cnpj_cpf AS cpf,
    l.dtvencimento,
    l.vrliquido AS valor_liquido,
    l.isencerrado,
    CASE 
        WHEN l.isencerrado = 1 THEN 'Liquidado'
        WHEN l.isencerrado = 0 OR l.isencerrado IS NULL THEN 'Em aberto'
        ELSE 'Desconhecido'
    END AS status
FROM fin_lancamentopr l
LEFT JOIN sis_pessoa p ON l.idpessoa = p.idpessoa
WHERE l.isencerrado = 0 OR l.isencerrado IS NULL
ORDER BY l.dtvencimento DESC
LIMIT 100;

-- 3. Contar total de lançamentos em aberto por paciente
SELECT 
    l.idpessoa,
    p.pessoa AS nome_pessoa,
    p.cnpj_cpf AS cpf,
    COUNT(*) AS total_em_aberto,
    SUM(l.vrliquido) AS valor_total_em_aberto
FROM fin_lancamentopr l
LEFT JOIN sis_pessoa p ON l.idpessoa = p.idpessoa
WHERE l.isencerrado = 0 OR l.isencerrado IS NULL
GROUP BY l.idpessoa, p.pessoa, p.cnpj_cpf
ORDER BY valor_total_em_aberto DESC;

-- 4. Verificar se há movimentações (recebimentos) para os lançamentos em aberto
SELECT 
    l.idlancamento,
    l.idpessoa,
    p.pessoa AS nome_pessoa,
    l.dtvencimento,
    l.vrliquido AS valor_lancamento,
    COUNT(m.idmovconta) AS total_movimentacoes,
    SUM(CASE WHEN m.iscredito = 1 THEN m.valormovimento ELSE 0 END) AS total_recebido,
    (l.vrliquido - COALESCE(SUM(CASE WHEN m.iscredito = 1 THEN m.valormovimento ELSE 0 END), 0)) AS saldo_restante
FROM fin_lancamentopr l
LEFT JOIN sis_pessoa p ON l.idpessoa = p.idpessoa
LEFT JOIN fin_movconta m ON l.idlancamento = m.idlancamento
WHERE l.isencerrado = 0 OR l.isencerrado IS NULL
GROUP BY l.idlancamento, l.idpessoa, p.pessoa, l.dtvencimento, l.vrliquido
HAVING (l.vrliquido - COALESCE(SUM(CASE WHEN m.iscredito = 1 THEN m.valormovimento ELSE 0 END), 0)) > 0
ORDER BY l.dtvencimento DESC
LIMIT 50;

-- 5. Buscar lançamentos em aberto de um paciente específico (substitua o ID)
-- SELECT 
--     l.idlancamento,
--     l.idpessoa,
--     p.pessoa AS nome_pessoa,
--     p.cnpj_cpf AS cpf,
--     l.dtvencimento,
--     l.vrliquido AS valor,
--     l.isencerrado,
--     CASE 
--         WHEN l.isencerrado = 1 THEN 'Liquidado'
--         ELSE 'Em aberto'
--     END AS status
-- FROM fin_lancamentopr l
-- LEFT JOIN sis_pessoa p ON l.idpessoa = p.idpessoa
-- WHERE l.idpessoa = 12345  -- SUBSTITUA PELO ID DO PACIENTE
--     AND (l.isencerrado = 0 OR l.isencerrado IS NULL)
-- ORDER BY l.dtvencimento DESC;

