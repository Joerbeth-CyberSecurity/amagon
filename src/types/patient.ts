// ===== PATIENT TYPES =====

export interface Patient {
  idpessoa: number
  nomepessoa: string
  cpf: string | null
  dtnasc: string | null
  email: string | null
  endereco: string | null
  telefone?: string | null
  celular?: string | null
  idpaciente: number
}

// ===== APPOINTMENT TYPES =====

export interface Appointment {
  idmarcacao: number
  dtmarcacao: string
  hrmarcacao: string | null
  status: string
  nome_dentista: string | null
}

// ===== CLINICAL DATA TYPES =====

export interface OrcamentoItemRepasse {
  dtrepasse?: string | null
  vr_repasse?: number | null
  isvrrepasse?: number | null
  vr_baserepasse?: number | null
  motivorepasse?: string | null
}

export interface OrcamentoItemAuditoria {
  usuarioinc?: number | null
  datainc?: string | null
  usuarioalt?: number | null
  dataalt?: string | null
}

export interface OrcamentoItem {
  idorcaitem: number
  item: string
  quantidade: number
  valor: number
  nome_procedimento: string | null
  total?: number | null
  desconto?: number | null
  data?: string | null
  numerodente?: number | null
  faseorcamento?: number | null
  situacao_realizacao?: number | null
  situacao_faturamento?: number | null
  observacao?: string | null
  repasse?: OrcamentoItemRepasse | null
  auditoria?: OrcamentoItemAuditoria | null
}

export interface ClinicalData {
  idorcamento: number
  nunorca?: string | null
  dtorcamento: string
  valortotal: number
  tpregistro: number
  nome_dentista: string | null
  idconvenio?: number | null
  idplano?: number | null
  idclinica?: number | null
  numguia?: number | null
  idorcamentosituacao?: number | null
  obs?: string | null
  descacre?: number | null
  tpdescacre?: string | null
  dtinicio?: string | null
  dtvencimento?: string | null
  numparcelas?: number | null
  isfechado?: number | null
  matricula?: string | null
  titular?: string | null
  totcopart?: number | null
  itens?: OrcamentoItem[]
}

// ===== FINANCIAL DATA TYPES =====

export interface Lancamento {
  idlancamento: number
  dtvencimento: string
  valorlancamento: number
  status: string
}

export interface Movimentacao {
  idmovconta: number
  dtmovimento: string
  valormovimento: number
  iscredito: boolean
}

export interface FinancialData {
  lancamentos: Lancamento[]
  movimentacoes: Movimentacao[]
}

// ===== CLINICAL TEAM TYPES =====

export interface ClinicalTeamMember {
  iddentista: number
  nome_dentista: string
  cro: string | null
  sigla: string | null
}

// ===== ANAMNESE TYPES =====

export interface Anamnese {
  queixa: string | null
  sofredoenca: number | null
  qualdoenca: string | null
  medicoassist: number | null
  alergia: number | null
  qualalergia: string | null
  doencasexual: number | null
  qualdoencasexual: string | null
  observacoes: string | null
}

// ===== IMAGE TYPES =====

export interface PatientImage {
  idpacienteimagem: number
  data: string
  historico: string | null
  pathimagem: string | null
  iddente: number | null
  idface: number | null
  orcaimagem: string | null
  nome_dentista: string | null
}

export interface OrcamentoImage {
  idorcamentoimagem: number
  idorcamento: number
  data: string
  historico: string | null
  pathimagem: string | null
  iddente: number | null
  idface: number | null
  orcaimagem: string | null
  idavaliacao: number | null
  nome_dentista: string | null
  dtorcamento: string
}

// ===== ORTHODONTICS TYPES =====

export interface Orthodontics {
  idorcamento: number
  dtorcamento: string
  valortotal: number
  dtinicio: string | null
  numparcelas: number | null
  dtvencimento: string | null
  nome_dentista: string | null
  itens?: OrcamentoItem[]
}
