-- ============================================================================
-- PARTE 3: ANALYZE (Execute DEPOIS das Partes 1 e 2)
-- ============================================================================
-- Execute este script APENAS após todos os índices terem sido criados
-- O ANALYZE atualiza as estatísticas do PostgreSQL para melhorar o planejamento
-- ============================================================================
-- IMPORTANTE: Execute um ANALYZE por vez se estiver dando timeout
-- ============================================================================

-- Analisar tabelas para atualizar estatísticas (ajuda o planner do PostgreSQL)
-- Execute um de cada vez se necessário:

ANALYZE amb_marcacao;
ANALYZE fin_lancamentopr;
ANALYZE amb_orcamento;
ANALYZE amb_orcaitem;
ANALYZE fin_movconta;
ANALYZE sis_pessoa;
ANALYZE sis_paciente;
ANALYZE sis_pacienteimagem;
ANALYZE amb_orcamentoimagem;
-- ANALYZE fat_procedimento; -- Comentado: verifique se a tabela existe antes de executar
ANALYZE sis_dentista;

-- ============================================================================
-- Se der timeout, execute cada ANALYZE separadamente:
-- ============================================================================
-- ANALYZE amb_marcacao;
-- (aguarde alguns segundos)
-- ANALYZE fin_lancamentopr;
-- (aguarde alguns segundos)
-- ... e assim por diante
-- ============================================================================

