-- ============================================================================
-- PARTE 2: ÍNDICES SECUNDÁRIOS (Execute DEPOIS da Parte 1)
-- ============================================================================
-- Execute este script após a Parte 1 ter sido concluída com sucesso
-- Aguarde alguns minutos entre cada execução se necessário
-- ============================================================================

-- Índices adicionais para amb_marcacao
-- NOTA: idx_amb_marcacao_iddentista já foi criado na Parte 1, mas o IF NOT EXISTS evita erro
CREATE INDEX IF NOT EXISTS idx_amb_marcacao_iddentista ON amb_marcacao(iddentista);
CREATE INDEX IF NOT EXISTS idx_amb_marcacao_data ON amb_marcacao(data DESC);

-- Índices para amb_orcamento (orçamentos)
CREATE INDEX IF NOT EXISTS idx_amb_orcamento_idpaciente ON amb_orcamento(idpaciente);
CREATE INDEX IF NOT EXISTS idx_amb_orcamento_data ON amb_orcamento(data DESC);
CREATE INDEX IF NOT EXISTS idx_amb_orcamento_idpaciente_data ON amb_orcamento(idpaciente, data DESC);
CREATE INDEX IF NOT EXISTS idx_amb_orcamento_tpregistro ON amb_orcamento(tpregistro);

-- Índices para amb_orcaitem (itens de orçamento)
CREATE INDEX IF NOT EXISTS idx_amb_orcaitem_idorcamento ON amb_orcaitem(idorcamento);
-- NOTA: Comentado temporariamente - verifique se a coluna idprocedimento existe em amb_orcaitem
-- Execute verificar_colunas_procedimento.sql para verificar
-- CREATE INDEX IF NOT EXISTS idx_amb_orcaitem_idprocedimento ON amb_orcaitem(idprocedimento);

-- Índices para fin_movconta (movimentações financeiras)
CREATE INDEX IF NOT EXISTS idx_fin_movconta_idlancamento ON fin_movconta(idlancamento);
CREATE INDEX IF NOT EXISTS idx_fin_movconta_dtmovimento ON fin_movconta(dtmovimento DESC);

-- Índices para sis_paciente
CREATE INDEX IF NOT EXISTS idx_sis_paciente_idpaciente ON sis_paciente(idpaciente);

-- Índices para sis_pacienteimagem
CREATE INDEX IF NOT EXISTS idx_sis_pacienteimagem_idpaciente ON sis_pacienteimagem(idpaciente);
CREATE INDEX IF NOT EXISTS idx_sis_pacienteimagem_data ON sis_pacienteimagem(data DESC);

-- Índices para amb_orcamentoimagem
CREATE INDEX IF NOT EXISTS idx_amb_orcamentoimagem_idorcamento ON amb_orcamentoimagem(idorcamento);
CREATE INDEX IF NOT EXISTS idx_amb_orcamentoimagem_data ON amb_orcamentoimagem(data DESC);

-- Índices para fat_procedimento
-- NOTA: Comentado porque a coluna idprocedimento pode não existir ou ter outro nome
-- Se a tabela fat_procedimento tiver uma chave primária, descomente e ajuste o nome da coluna:
-- CREATE INDEX IF NOT EXISTS idx_fat_procedimento_idprocedimento ON fat_procedimento(idprocedimento);

-- Índices para sis_dentista
CREATE INDEX IF NOT EXISTS idx_sis_dentista_iddentista ON sis_dentista(iddentista);

-- ============================================================================
-- IMPORTANTE: Aguarde 2-3 minutos após executar este script antes de continuar
-- ============================================================================

