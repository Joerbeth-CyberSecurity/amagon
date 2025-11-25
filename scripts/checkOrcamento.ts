/**
 * Script utilitário para verificar se um orçamento e seus itens
 * estão disponíveis no Supabase. Uso:
 *
 *  VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npx ts-node scripts/checkOrcamento.ts 11259
 *
 * O script aceita o ID do orçamento como primeiro argumento. Se não for
 * informado, assume 11259.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''

const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variáveis de ambiente do Supabase não configuradas.')
  console.error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY antes de executar.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const orcamentoId = Number(process.argv[2] ?? 11259)

async function main() {
  console.log(`🔍 Buscando orçamento #${orcamentoId}...`)

  const { data: orcamento, error: orcamentoError } = await supabase
    .from('amb_orcamento')
    .select(
      `
        idorcamento,
        nunorca,
        data,
        total,
        tpregistro,
        iddentista,
        idpaciente
      `
    )
    .eq('idorcamento', orcamentoId)
    .maybeSingle()

  if (orcamentoError) {
    console.error('❌ Erro ao buscar orçamento:', orcamentoError.message)
    process.exit(1)
  }

  if (!orcamento) {
    console.warn('⚠️ Orçamento não encontrado.')
    process.exit(0)
  }

  let dentistaNome: string | null = null
  if (orcamento.iddentista) {
    const { data: dentista } = await supabase
      .from('sis_pessoa')
      .select('pessoa')
      .eq('idpessoa', orcamento.iddentista)
      .maybeSingle()

    dentistaNome = dentista?.pessoa ?? null
  }

  const { data: itens, error: itensError } = await supabase
    .from('amb_orcaitem')
    .select('idorcaitem, idprocedimento, linha, iditem, qtde, valor')
    .eq('idorcamento', orcamentoId)
    .order('linha', { ascending: true, nullsFirst: false })

  if (itensError) {
    console.error('❌ Erro ao buscar itens:', itensError.message)
    process.exit(1)
  }

  const procedimentosIds = [...new Set((itens ?? []).map((item) => item.idprocedimento).filter(Boolean))]
  let procedimentosMap = new Map<number, { procedimento: string; codigo: string | null }>()

  if (procedimentosIds.length > 0) {
    const { data: procedimentos } = await supabase
      .from('fat_procedimento')
      .select('idprocedimento, procedimento, codigo')
      .in('idprocedimento', procedimentosIds)

    if (procedimentos) {
      procedimentosMap = new Map(
        procedimentos.map((proc) => [
          proc.idprocedimento,
          { procedimento: proc.procedimento ?? '', codigo: proc.codigo ?? null }
        ])
      )
    }
  }

  console.log('\n=== ORÇAMENTO ===')
  console.log({
    id: orcamento.idorcamento,
    numero: orcamento.nunorca ?? '-',
    data: orcamento.data,
    total: orcamento.total,
    tpregistro: orcamento.tpregistro,
    dentista: dentistaNome ?? '-',
    paciente: orcamento.idpaciente
  })

  if (!itens || itens.length === 0) {
    console.warn('\n⚠️ Nenhum item retornado para este orçamento.')
    return
  }

  const tabela = itens.map((item) => {
    const procInfo = item.idprocedimento ? procedimentosMap.get(item.idprocedimento) : null
    return {
      Proc: item.linha || procInfo?.codigo || item.iditem,
      Descricao: procInfo?.procedimento || '-',
      Quantidade: item.qtde,
      Valor: item.valor
    }
  })

  console.log(`\n=== ITENS (${tabela.length}) ===`)
  console.table(tabela)
}

main()
  .then(() => {
    console.log('\n✅ Consulta concluída.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ Erro inesperado:', err)
    process.exit(1)
  })


