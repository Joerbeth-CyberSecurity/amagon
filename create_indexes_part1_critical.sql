-- ============================================================================
-- PARTE 1: ÍNDICES CRÍTICOS (Execute este PRIMEIRO)
-- ============================================================================
-- Estes são os índices mais importantes que estão causando timeout
-- Execute este script primeiro e aguarde alguns minutos antes de continuar
-- ============================================================================

-- Índices para sis_pessoa (BUSCA POR NOME - CRÍTICO!)
-- Este é o mais importante pois está causando timeout nas buscas
-- Primeiro, habilita a extensão pg_trgm se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice trigram para busca ILIKE eficiente (suporta '%termo%')
CREATE INDEX IF NOT EXISTS idx_sis_pessoa_pessoa_trgm ON sis_pessoa USING gin (pessoa gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sis_pessoa_pessoa_lower ON sis_pessoa(LOWER(pessoa));
CREATE INDEX IF NOT EXISTS idx_sis_pessoa_cnpj_cpf ON sis_pessoa(cnpj_cpf);

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

