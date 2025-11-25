-- CONSULTA SIMPLES: Lançamentos "Em aberto" com detalhes do paciente
-- Execute esta query no SQL Editor do Supabase

SELECT 
    l.idlancamento,
    l.idpessoa,
    p.pessoa AS nome_pessoa,
    p.cnpj_cpf AS cpf,
    l.dtvencimento AS vencimento,
    l.vrliquido AS valor,
    CASE 
        WHEN l.isencerrado = 1 THEN 'Liquidado'
        WHEN l.isencerrado = 0 OR l.isencerrado IS NULL THEN 'Em aberto'
        ELSE 'Desconhecido'
    END AS status
FROM fin_lancamentopr l
LEFT JOIN sis_pessoa p ON l.idpessoa = p.idpessoa
WHERE l.isencerrado = 0 OR l.isencerrado IS NULL
ORDER BY l.dtvencimento DESC;

