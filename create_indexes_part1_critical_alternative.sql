-- ============================================================================
-- PARTE 1 ALTERNATIVA: ÍNDICES CRÍTICOS (Use se a versão principal der erro)
-- ============================================================================
-- Use este script se o script principal der erro sobre a extensão pg_trgm
-- Este script não usa trigram, mas ainda melhora significativamente a performance
-- ============================================================================

-- Índices para sis_pessoa (BUSCA POR NOME - CRÍTICO!)
-- Este é o mais importante pois está causando timeout nas buscas
CREATE INDEX IF NOT EXISTS idx_sis_pessoa_pessoa_lower ON sis_pessoa(LOWER(pessoa));
CREATE INDEX IF NOT EXISTS idx_sis_pessoa_cnpj_cpf ON sis_pessoa(cnpj_cpf);
-- Índice adicional para busca por nome (pode ajudar em alguns casos)
CREATE INDEX IF NOT EXISTS idx_sis_pessoa_pessoa ON sis_pessoa(pessoa);

-- Índices para amb_marcacao (AGENDAMENTOS - CRÍTICO!)
-- Essas queries estão dando timeout constantemente
CREATE INDEX IF NOT EXISTS idx_amb_marcacao_idpaciente ON amb_marcacao(idpaciente);
CREATE INDEX IF NOT EXISTS idx_amb_marcacao_idpaciente_data ON amb_marcacao(idpaciente, data DESC);
CREATE INDEX IF NOT EXISTS idx_amb_marcacao_iddentista ON amb_marcacao(iddentista);
-- Índice para query com not.is.null em iddentista
CREATE INDEX IF NOT EXISTS idx_amb_marcacao_idpaciente_iddentista ON amb_marcacao(idpaciente, iddentista) WHERE iddentista IS NOT NULL;

-- Índices para fin_lancamentopr (LANÇAMENTOS FINANCEIROS - CRÍTICO!)
-- Essas queries estão dando timeout constantemente
CREATE INDEX IF NOT EXISTS idx_fin_lancamentopr_idpessoa ON fin_lancamentopr(idpessoa);
CREATE INDEX IF NOT EXISTS idx_fin_lancamentopr_idpessoa_dtvencimento ON fin_lancamentopr(idpessoa, dtvencimento DESC);

-- ============================================================================
-- IMPORTANTE: Aguarde 2-3 minutos após executar este script antes de continuar
-- ============================================================================

