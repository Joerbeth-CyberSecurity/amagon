import { supabase } from '@/lib/supabase'
import type {
  Patient,
  Appointment,
  ClinicalData,
  FinancialData,
  ClinicalTeamMember,
  Anamnese,
  PatientImage,
  OrcamentoImage,
  Orthodontics
} from '@/types/patient'
import { cleanCPF } from '@/utils/formatters'

/**
 * Busca pacientes por nome (parcial) ou CPF
 */
export async function searchPatients(searchTerm: string): Promise<Patient[]> {
  try {
    const trimmedTerm = searchTerm.trim()
    
    // Remove espaços e caracteres especiais do CPF, mantendo apenas números
    const cleanTerm = cleanCPF(trimmedTerm)
    
    // Verifica se é busca por CPF (tem pelo menos 9 dígitos numéricos)
    const isCPF = cleanTerm.length >= 9 && /^\d+$/.test(cleanTerm)
    
    let query = supabase
      .from('sis_pessoa')
      .select(`
        idpessoa,
        pessoa,
        cnpj_cpf,
        nascimento,
        email,
        endereco
      `)
    
    if (isCPF) {
      // Busca por CPF - O CPF no banco está formatado (ex: 100.592.046-05)
      // Como o Supabase client não suporta REPLACE para remover formatação no SQL,
      // vamos fazer uma busca mais ampla e filtrar depois
      
      const searchTermClean = trimmedTerm.replace(/\s+/g, '')
      
      // Se o termo tem formatação (tem pontos ou traços), busca direto
      // Se não tem formatação (só números), busca parcial e filtra depois
      const hasFormatting = /[.\-]/.test(searchTermClean)
      
      if (hasFormatting) {
        // Termo já está formatado (ex: 100.592.046-05), busca direto
        query = query.ilike('cnpj_cpf', `%${searchTermClean}%`)
      } else {
        // Termo sem formatação (ex: 10059204605) - busca mais ampla
        // Como o banco está formatado, vamos buscar pelos primeiros dígitos
        // Ex: buscar "100" para encontrar "100.592.046-05"
        // Isso vai retornar mais resultados, mas filtraremos depois
        if (cleanTerm.length >= 3) {
          query = query.ilike('cnpj_cpf', `%${cleanTerm.slice(0, 3)}%`)
        } else {
          query = query.ilike('cnpj_cpf', `%${cleanTerm}%`)
        }
      }
    } else {
      // Busca por nome
      query = query.ilike('pessoa', `%${trimmedTerm}%`)
    }
    
    // Aumenta o limite para CPF sem formatação para poder filtrar depois
    if (isCPF) {
      query = query.limit(200) // Busca mais resultados para filtrar depois
    }
    
    const { data, error } = await query.order('pessoa')
    
    if (error) throw error
    
    // Filtrar resultados para garantir que o CPF bate (removendo formatação)
    let results = data || []
    
    if (isCPF && results.length > 0) {
      // Filtra para garantir que o CPF limpo bate com o termo de busca limpo
      results = results.filter((row: any) => {
        const rowCPFClean = cleanCPF(row.cnpj_cpf || '')
        // Verifica se o CPF limpo contém o termo de busca limpo ou vice-versa
        return rowCPFClean.includes(cleanTerm) || cleanTerm.includes(rowCPFClean)
      })
      
      // Limita a 50 resultados finais
      results = results.slice(0, 50)
    }
    
    // Transforma os dados para o formato esperado
    return results.map((row: any) => ({
      idpessoa: row.idpessoa,
      nomepessoa: row.pessoa,
      cpf: row.cnpj_cpf,
      dtnasc: row.nascimento,
      email: row.email,
      endereco: row.endereco,
      idpaciente: row.idpessoa // Usando idpessoa como idpaciente
    }))
    
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error)
    throw error
  }
}

/**
 * Busca dados bÃ¡sicos de um paciente especÃ­fico
 */
export async function getPatientById(idPessoa: number): Promise<Patient | null> {
  try {
    const { data, error } = await supabase
      .from('sis_pessoa')
      .select('idpessoa, pessoa, cnpj_cpf, nascimento, email, endereco')
      .eq('idpessoa', idPessoa)
      .single()
    
    if (error) throw error
    if (!data) return null
    
    return {
      idpessoa: data.idpessoa,
      nomepessoa: data.pessoa,
      cpf: data.cnpj_cpf,
      dtnasc: data.nascimento,
      email: data.email,
      endereco: data.endereco,
      telefone: null,
      celular: null,
      idpaciente: data.idpessoa
    }
    
  } catch (error) {
    console.error('Erro ao buscar dados do paciente:', error)
    throw error
  }
}

/**
 * Busca agendamentos de um paciente
 */
export async function getPatientAppointments(idPessoa: number): Promise<Appointment[]> {
  try {
    const { data, error } = await supabase
      .from('amb_marcacao')
      .select('idmarcacao, data, hora, isatendido, isbloqueado, dtcanc, dtfaltou, iddentista')
      .eq('idpaciente', idPessoa)
      .order('data', { ascending: false })
      .order('hora', { ascending: false })
    
    if (error) throw error
    
    // Buscar IDs únicos de dentistas (iddentista = idpessoa diretamente)
    const dentistasIds = [...new Set((data || []).map((r: any) => r.iddentista).filter(Boolean))]
    
    // Buscar nomes dos dentistas (iddentista é igual a idpessoa)
    const dentistasMap = new Map<number, string>()
    if (dentistasIds.length > 0) {
      const { data: pessoas, error: pessoasError } = await supabase
        .from('sis_pessoa')
        .select('idpessoa, pessoa')
        .in('idpessoa', dentistasIds)
      
      if (!pessoasError && pessoas) {
        for (const pessoa of pessoas) {
          dentistasMap.set(pessoa.idpessoa, pessoa.pessoa || '')
        }
      }
    }
    
    return (data || []).map((row: any) => {
      let status = 'Agendado'
      if (row.isatendido === 1) status = 'Atendido'
      else if (row.isbloqueado === 1) status = 'Bloqueado'
      else if (row.dtcanc) status = 'Cancelado'
      else if (row.dtfaltou) status = 'Faltou'
      
      const nome_dentista = row.iddentista ? dentistasMap.get(row.iddentista) || null : null
      
      return {
        idmarcacao: row.idmarcacao,
        dtmarcacao: row.data,
        hrmarcacao: row.hora,
        status,
        nome_dentista
      }
    })
    
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error)
    throw error
  }
}

/**
 * Busca dados clÃ­nicos (orÃ§amentos/contratos) de um paciente
 */
export async function getPatientClinicalData(idPessoa: number): Promise<ClinicalData[]> {
  try {
    const { data, error } = await supabase
      .from('amb_orcamento')
      .select(`
        idorcamento,
        nunorca,
        data,
        total,
        tpregistro,
        iddentista,
        idpaciente,
        idconvenio,
        idplano,
        idclinica,
        numguia,
        isfechado,
        idatendimento,
        dtentper,
        idorcamentosituacao,
        matricula,
        titular,
        obs,
        descacre,
        tpdescacre,
        maxfaseorca,
        interfaseorca,
        issinaisdoenca,
        isalttecidomoles,
        desativado,
        system,
        hidden,
        totcopart,
        dtinicio,
        numparcelas,
        dtvencimento
      `)
      .eq('idpaciente', idPessoa)
      .order('data', { ascending: false })
    
    if (error) throw error
    if (!data || data.length === 0) return []
    
    // Buscar IDs únicos de dentistas (iddentista = idpessoa diretamente)
    const dentistasIds = [...new Set((data || []).map((r: any) => r.iddentista).filter(Boolean))]
    
    // Buscar nomes dos dentistas (iddentista é igual a idpessoa)
    const dentistasMap = new Map<number, string>()
    if (dentistasIds.length > 0) {
      const { data: pessoas, error: pessoasError } = await supabase
        .from('sis_pessoa')
        .select('idpessoa, pessoa')
        .in('idpessoa', dentistasIds)
      
      if (!pessoasError && pessoas) {
        for (const pessoa of pessoas) {
          dentistasMap.set(pessoa.idpessoa, pessoa.pessoa || '')
        }
      }
    }
    
    const orcamentosIds = data.map((o: any) => o.idorcamento)
    
    let allItens: any[] = []
    if (orcamentosIds.length > 0) {
      const { data: itensData, error: itensError } = await supabase
        .from('amb_orcaitem')
        .select(`
          idorcaitem,
          idorcamento,
          linha,
          iditem,
          qtde,
          valor,
          total,
          desconto,
          data,
          iddentista,
          isrealizado,
          isfaturado,
          obs,
          numerodente,
          faseorcamento,
          dtrepasse,
          vr_repasse,
          isvrrepasse,
          vr_baserepasse,
          motivorepasse,
          usuarioinc,
          datainc,
          usuarioalt,
          dataalt
        `)
        .in('idorcamento', orcamentosIds)
        .order('linha', { ascending: true, nullsFirst: false })
      
      if (itensError) {
        console.error('Erro ao buscar itens de orçamento:', itensError)
      }
      
      allItens = itensData || []
    }
    
    // Agrupar itens por orçamento
    const itensPorOrcamento = new Map<number, any[]>()
    if (allItens) {
      for (const item of allItens) {
        if (!itensPorOrcamento.has(item.idorcamento)) {
          itensPorOrcamento.set(item.idorcamento, [])
        }
        itensPorOrcamento.get(item.idorcamento)!.push(item)
      }
    }
    
    // Buscar TODOS os procedimentos de uma vez (otimização)
    const procedimentosIds = [...new Set((allItens || []).map((i: any) => i.iditem).filter(Boolean))]
    const procedimentosMap = new Map<number, { nome: string; codigo: string | null; numero: string | null }>()
    if (procedimentosIds.length > 0) {
      const { data: procedimentos } = await supabase
        .from('fat_procedimento')
        .select('idprocedimento, procedimento, codprocedimento, numprocedimento')
        .in('idprocedimento', procedimentosIds)
      
      if (procedimentos) {
        for (const proc of procedimentos) {
          procedimentosMap.set(proc.idprocedimento, {
            nome: proc.procedimento || '',
            codigo: proc.codprocedimento || null,
            numero: proc.numprocedimento || null
          })
        }
      }
    }
    
    const orcamentos: ClinicalData[] = data.map((row: any) => {
      const itens = itensPorOrcamento.get(row.idorcamento) || []
      
      return {
        idorcamento: row.idorcamento,
        nunorca: row.nunorca,
        dtorcamento: row.data,
        valortotal: row.total,
        tpregistro: row.tpregistro,
        nome_dentista: row.iddentista ? dentistasMap.get(row.iddentista) || null : null,
        idconvenio: row.idconvenio,
        idplano: row.idplano,
        idclinica: row.idclinica,
        numguia: row.numguia,
        idorcamentosituacao: row.idorcamentosituacao,
        obs: row.obs,
        descacre: row.descacre,
        tpdescacre: row.tpdescacre,
        dtinicio: row.dtinicio,
        dtvencimento: row.dtvencimento,
        numparcelas: row.numparcelas,
        isfechado: row.isfechado,
        matricula: row.matricula,
        titular: row.titular,
        totcopart: row.totcopart,
        itens: itens.map((item: any) => {
          const procInfo = item.iditem ? procedimentosMap.get(item.iditem) : null
          const nome_procedimento = procInfo?.nome || null
          const codigo_procedimento = procInfo?.codigo || procInfo?.numero || null
          const item_cod = item.linha || codigo_procedimento || item.iditem?.toString() || ''
          const repasseData =
            item.dtrepasse ||
            item.vr_repasse ||
            item.isvrrepasse ||
            item.vr_baserepasse ||
            item.motivorepasse
              ? {
                  dtrepasse: item.dtrepasse,
                  vr_repasse: item.vr_repasse,
                  isvrrepasse: item.isvrrepasse,
                  vr_baserepasse: item.vr_baserepasse,
                  motivorepasse: item.motivorepasse
                }
              : null
          const auditoriaData =
            item.usuarioinc ||
            item.datainc ||
            item.usuarioalt ||
            item.dataalt
              ? {
                  usuarioinc: item.usuarioinc,
                  datainc: item.datainc,
                  usuarioalt: item.usuarioalt,
                  dataalt: item.dataalt
                }
              : null
          
          return {
            idorcaitem: item.idorcaitem,
            item: item_cod,
            proc: item_cod,
            descricao: nome_procedimento,
            quantidade: item.qtde,
            valor: item.valor,
            nome_procedimento,
            total: item.total,
            desconto: item.desconto,
            data: item.data,
            numerodente: item.numerodente,
            faseorcamento: item.faseorcamento,
            situacao_realizacao: item.isrealizado,
            situacao_faturamento: item.isfaturado,
            observacao: item.obs,
            repasse: repasseData,
            auditoria: auditoriaData
          }
        })
      }
    })
    
    return orcamentos
    
  } catch (error) {
    console.error('Erro ao buscar dados clÃ­nicos:', error)
    throw error
  }
}

/**
 * Busca dados financeiros de um paciente
 */
export async function getPatientFinancialData(idPessoa: number): Promise<FinancialData> {
  try {
    // Busca lanÃ§amentos a receber
    const { data: lancamentos, error: lancError } = await supabase
      .from('fin_lancamentopr')
      .select('idlancamento, dtvencimento, vrliquido, isencerrado')
      .eq('idpessoa', idPessoa)
      .order('dtvencimento', { ascending: false })
    
    if (lancError) throw lancError
    
    // Busca movimentaÃ§Ãµes - buscar todos os lanÃ§amentos primeiro, depois filtrar
    const lancamentosIds = (lancamentos || []).map(l => l.idlancamento)
    
    let movData: any[] = []
    if (lancamentosIds.length > 0) {
      const { data, error: movError } = await supabase
        .from('fin_movconta')
        .select('idmovconta, dtmovimento, valormovimento, iscredito, idlancamento')
        .in('idlancamento', lancamentosIds)
        .order('dtmovimento', { ascending: false })
      
      if (movError) throw movError
      movData = data || []
    }
    
    // Filtrar apenas recebimentos (iscredito = true/1) nas movimentações
    const recebimentos = (movData || []).filter((row: any) => row.iscredito === 1 || row.iscredito === true)
    
    return {
      lancamentos: (lancamentos || []).map((row: any) => ({
        idlancamento: row.idlancamento,
        dtvencimento: row.dtvencimento,
        valorlancamento: row.vrliquido,
        status: row.isencerrado === 1 ? 'Liquidado' : 'Em aberto'
      })),
      movimentacoes: recebimentos.map((row: any) => ({
        idmovconta: row.idmovconta,
        dtmovimento: row.dtmovimento,
        valormovimento: row.valormovimento,
        iscredito: row.iscredito
      }))
    }
    
  } catch (error) {
    console.error('Erro ao buscar dados financeiros:', error)
    throw error
  }
}

/**
 * Busca corpo clÃ­nico associado ao paciente
 */
export async function getPatientClinicalTeam(idPessoa: number): Promise<ClinicalTeamMember[]> {
  try {
    // Buscar dentistas de agendamentos e orÃ§amentos
    // Tentar usar RPC se existir, senão fazer query manual
    let data: any = null
    let error: any = null
    
    try {
      const result = await supabase.rpc('get_patient_clinical_team', {
        p_idpessoa: idPessoa
      })
      data = result.data
      error = result.error
      
      // Se RPC não existe (404 ou função não encontrada), usar fallback sem mostrar erro
      if (error && (
        error.code === 'P0001' || 
        error.message?.includes('404') || 
        error.message?.includes('does not exist') ||
        error.message?.includes('function') ||
        error.hint?.includes('function')
      )) {
        error = null // Ignora erro de RPC não encontrado
        data = null // Força usar fallback
      }
    } catch (rpcError: any) {
      // Ignora erros de RPC não encontrado (404)
      if (rpcError?.code === 'P0001' || rpcError?.message?.includes('404') || rpcError?.message?.includes('does not exist')) {
        error = null
        data = null
      } else {
        error = rpcError
      }
    }
    
    if (error || !data) {
      // Fallback completo quando RPC não existir ou falhar
      const { data: marcacoes } = await supabase
        .from('amb_marcacao')
        .select('iddentista')
        .eq('idpaciente', idPessoa)
        .not('iddentista', 'is', null)
      
      const { data: orcamentos } = await supabase
        .from('amb_orcamento')
        .select('iddentista')
        .eq('idpaciente', idPessoa)
        .not('iddentista', 'is', null)
      
      const dentistasIds = new Set([
        ...(marcacoes || []).map((m: any) => m.iddentista),
        ...(orcamentos || []).map((o: any) => o.iddentista)
      ])
      
      if (dentistasIds.size === 0) return []
      
      // Buscar dentistas (iddentista = idpessoa)
      const { data: dentistas } = await supabase
        .from('sis_dentista')
        .select('iddentista, cro, sigla')
        .in('iddentista', Array.from(dentistasIds))
      
      if (!dentistas || dentistas.length === 0) return []
      
      // Buscar nomes das pessoas (iddentista = idpessoa diretamente)
      const { data: pessoas, error: pessoasError } = await supabase
        .from('sis_pessoa')
        .select('idpessoa, pessoa')
        .in('idpessoa', Array.from(dentistasIds))
      
      // Criar mapa de idpessoa -> nome
      const pessoasMap = new Map<number, string>()
      if (!pessoasError && pessoas) {
        for (const pessoa of pessoas) {
          pessoasMap.set(pessoa.idpessoa, pessoa.pessoa || '')
        }
      }
      
      return dentistas.map((d: any) => {
        const nome_dentista = d.iddentista ? pessoasMap.get(d.iddentista) || '' : ''
        
        return {
          iddentista: d.iddentista,
          nome_dentista,
          cro: d.cro,
          sigla: d.sigla
        }
      })
    }
    
    return data || []
    
  } catch (error) {
    console.error('Erro ao buscar corpo clÃ­nico:', error)
    return []
  }
}

/**
 * Busca dados de anamnese do paciente
 */
export async function getPatientAnamnese(idPessoa: number): Promise<Anamnese | null> {
  try {
    const { data, error } = await supabase
      .from('sis_paciente')
      .select(`
        queixa,
        sofredoenca,
        qualdoenca,
        medicoassist,
        alergia,
        qualalergia,
        doencasexual,
        qualdoencasexual,
        obsbloqueiopaciente
      `)
      .eq('idpaciente', idPessoa)
      .single()
    
    if (error) throw error
    if (!data) return null
    
    return {
      queixa: data.queixa,
      sofredoenca: data.sofredoenca,
      qualdoenca: data.qualdoenca,
      medicoassist: data.medicoassist,
      alergia: data.alergia,
      qualalergia: data.qualalergia,
      doencasexual: data.doencasexual,
      qualdoencasexual: data.qualdoencasexual,
      observacoes: data.obsbloqueiopaciente
    }
    
  } catch (error) {
    console.error('Erro ao buscar anamnese:', error)
    return null
  }
}

/**
 * Busca imagens/raios-x do paciente
 */
export async function getPatientImages(idPessoa: number): Promise<PatientImage[]> {
  try {
    const { data, error } = await supabase
      .from('sis_pacienteimagem')
      .select('idpacienteimagem, data, historico, pathimagem, iddente, idface, orcaimagem, iddentista')
      .eq('idpaciente', idPessoa)
      .order('data', { ascending: false })
    
    if (error) throw error
    
    // Buscar IDs únicos de dentistas (iddentista = idpessoa diretamente)
    const dentistasIds = [...new Set((data || []).map((r: any) => r.iddentista).filter(Boolean))]
    
    // Buscar nomes dos dentistas (iddentista é igual a idpessoa)
    const dentistasMap = new Map<number, string>()
    if (dentistasIds.length > 0) {
      const { data: pessoas, error: pessoasError } = await supabase
        .from('sis_pessoa')
        .select('idpessoa, pessoa')
        .in('idpessoa', dentistasIds)
      
      if (!pessoasError && pessoas) {
        for (const pessoa of pessoas) {
          dentistasMap.set(pessoa.idpessoa, pessoa.pessoa || '')
        }
      }
    }
    
    return (data || []).map((row: any) => {
      const nome_dentista = row.iddentista ? dentistasMap.get(row.iddentista) || null : null
      
      return {
        idpacienteimagem: row.idpacienteimagem,
        data: row.data,
        historico: row.historico,
        pathimagem: row.pathimagem,
        iddente: row.iddente,
        idface: row.idface,
        orcaimagem: row.orcaimagem,
        nome_dentista
      }
    })
    
  } catch (error) {
    console.error('Erro ao buscar imagens:', error)
    return []
  }
}

/**
 * Busca imagens de orÃ§amentos do paciente
 */
export async function getPatientOrcamentoImages(idPessoa: number): Promise<OrcamentoImage[]> {
  try {
    // Primeiro busca orÃ§amentos do paciente
    const { data: orcamentosData } = await supabase
      .from('amb_orcamento')
      .select('idorcamento, data')
      .eq('idpaciente', idPessoa)
    
    if (!orcamentosData || orcamentosData.length === 0) return []
    
    const orcamentosIds = orcamentosData.map(o => o.idorcamento)
    
    // Depois busca imagens desses orÃ§amentos
    const { data, error } = await supabase
      .from('amb_orcamentoimagem')
      .select('idorcamentoimagem, idorcamento, data, historico, pathimagem, iddente, idface, orcaimagem, idavaliacao, iddentista')
      .in('idorcamento', orcamentosIds)
      .order('data', { ascending: false })
    
    if (error) throw error
    
    return (data || []).map((row: any) => {
      const orc = orcamentosData.find(o => o.idorcamento === row.idorcamento)
      return {
        idorcamentoimagem: row.idorcamentoimagem,
        idorcamento: row.idorcamento,
        data: row.data,
        historico: row.historico,
        pathimagem: row.pathimagem,
        iddente: row.iddente,
        idface: row.idface,
        orcaimagem: row.orcaimagem,
        idavaliacao: row.idavaliacao,
        nome_dentista: null, // SerÃ¡ buscado separadamente se necessÃ¡rio
        dtorcamento: orc?.data || ''
      }
    })
    
  } catch (error) {
    console.error('Erro ao buscar imagens de orÃ§amentos:', error)
    return []
  }
}

/**
 * Busca orçamentos ortodônticos do paciente
 */
export async function getPatientOrthodontics(idPessoa: number): Promise<Orthodontics[]> {
  try {
    const { data, error } = await supabase
      .from('amb_orcamento')
      .select('idorcamento, data, total, dtinicio, numparcelas, dtvencimento, iddentista')
      .eq('idpaciente', idPessoa)
      .eq('tpregistro', 1) // Ortodôntico
      .order('data', { ascending: false })
    
    if (error) throw error
    
    // Buscar IDs únicos de dentistas (iddentista = idpessoa diretamente)
    const dentistasIds = [...new Set((data || []).map((r: any) => r.iddentista).filter(Boolean))]
    
    // Buscar nomes dos dentistas (iddentista é igual a idpessoa)
    const dentistasMap = new Map<number, string>()
    if (dentistasIds.length > 0) {
      const { data: pessoas, error: pessoasError } = await supabase
        .from('sis_pessoa')
        .select('idpessoa, pessoa')
        .in('idpessoa', dentistasIds)
      
      if (!pessoasError && pessoas) {
        for (const pessoa of pessoas) {
          dentistasMap.set(pessoa.idpessoa, pessoa.pessoa || '')
        }
      }
    }
    
    const orcamentos: Orthodontics[] = (data || []).map((row: any) => ({
      idorcamento: row.idorcamento,
      dtorcamento: row.data,
      valortotal: row.total,
      dtinicio: row.dtinicio,
      numparcelas: row.numparcelas,
      dtvencimento: row.dtvencimento,
      nome_dentista: row.iddentista ? dentistasMap.get(row.iddentista) || null : null,
      itens: []
    }))
    
    // Buscar TODOS os itens de uma vez (otimização)
    const orcamentosIds = orcamentos.map(o => o.idorcamento)
    let allItens: any[] = []
    if (orcamentosIds.length > 0) {
      const { data: itensData } = await supabase
        .from('amb_orcaitem')
        .select('idorcaitem, idorcamento, linha, iditem, qtde, valor, idprocedimento')
        .in('idorcamento', orcamentosIds)
        .order('linha', { ascending: true, nullsFirst: false })
      allItens = itensData || []
    }
    
    // Agrupar itens por orçamento
    const itensPorOrcamento = new Map<number, any[]>()
    if (allItens) {
      for (const item of allItens) {
        if (!itensPorOrcamento.has(item.idorcamento)) {
          itensPorOrcamento.set(item.idorcamento, [])
        }
        itensPorOrcamento.get(item.idorcamento)!.push(item)
      }
    }
    
    // Buscar TODOS os procedimentos de uma vez (otimização)
    const procedimentosIds = [...new Set((allItens || []).map((i: any) => i.idprocedimento).filter(Boolean))]
    const procedimentosMap = new Map<number, { nome: string; codigo: string | null }>()
    if (procedimentosIds.length > 0) {
      const { data: procedimentos } = await supabase
        .from('fat_procedimento')
        .select('idprocedimento, procedimento, codigo')
        .in('idprocedimento', procedimentosIds)
      
      if (procedimentos) {
        for (const proc of procedimentos) {
          procedimentosMap.set(proc.idprocedimento, {
            nome: proc.procedimento || '',
            codigo: proc.codigo || null
          })
        }
      }
    }
    
    // Mapear itens para cada orçamento
    for (const orc of orcamentos) {
      const itens = itensPorOrcamento.get(orc.idorcamento) || []
      orc.itens = itens.map((item: any) => {
        const proc = item.idprocedimento ? procedimentosMap.get(item.idprocedimento) : null
        const nome_procedimento = proc?.nome || null
        const codigo_procedimento = proc?.codigo || null
        const item_cod = item.linha || codigo_procedimento || item.iditem?.toString() || ''
        
        return {
          idorcaitem: item.idorcaitem,
          item: item_cod,
          quantidade: item.qtde,
          valor: item.valor,
          nome_procedimento
        }
      })
    }
    
    return orcamentos
    
  } catch (error) {
    console.error('Erro ao buscar ortodontia:', error)
    return []
  }
}
