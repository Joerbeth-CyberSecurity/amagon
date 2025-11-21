-- Script para criar índices no Supabase e melhorar performance
-- Execute este script no SQL Editor do Supabase Dashboard

-- Índices para amb_marcacao (agendamentos)
CREATE INDEX IF NOT EXISTS idx_amb_marcacao_idpaciente ON amb_marcacao(idpaciente);
CREATE INDEX IF NOT EXISTS idx_amb_marcacao_iddentista ON amb_marcacao(iddentista);
CREATE INDEX IF NOT EXISTS idx_amb_marcacao_data ON amb_marcacao(data DESC);
CREATE INDEX IF NOT EXISTS idx_amb_marcacao_idpaciente_data ON amb_marcacao(idpaciente, data DESC);

-- Índices para fin_lancamentopr (lançamentos financeiros)
CREATE INDEX IF NOT EXISTS idx_fin_lancamentopr_idpessoa ON fin_lancamentopr(idpessoa);
CREATE INDEX IF NOT EXISTS idx_fin_lancamentopr_dtvencimento ON fin_lancamentopr(dtvencimento DESC);
CREATE INDEX IF NOT EXISTS idx_fin_lancamentopr_idpessoa_dtvencimento ON fin_lancamentopr(idpessoa, dtvencimento DESC);

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

-- Índices para sis_pessoa (busca por nome e CPF)
CREATE INDEX IF NOT EXISTS idx_sis_pessoa_pessoa ON sis_pessoa(pessoa);
CREATE INDEX IF NOT EXISTS idx_sis_pessoa_cnpj_cpf ON sis_pessoa(cnpj_cpf);
-- Índice para busca ILIKE (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_sis_pessoa_pessoa_lower ON sis_pessoa(LOWER(pessoa));

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

-- Analisar tabelas para atualizar estatísticas (ajuda o planner do PostgreSQL)
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

