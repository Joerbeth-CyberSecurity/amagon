import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { executeQuery } = require('./backend/db.js');

async function testPatientData() {
  try {
    console.log('🔍 Testando dados do paciente ALEX DE SOUZA OLIVEIRA (ID: 295828)\n');
    console.log('='.repeat(80));

    const patientId = 295828;

    // 1. Verificar dados básicos do paciente
    console.log('\n📋 1. Dados Básicos:');
    console.log('-'.repeat(80));
    const patient = await executeQuery(`
      SELECT 
        p.idpessoa,
        p.pessoa AS nomepessoa,
        p.cnpj_cpf AS cpf,
        p.nascimento AS dtnasc,
        p.email,
        p.telefone,
        p.celular
      FROM sis_pessoa p
      WHERE p.idpessoa = $1
    `, [patientId]);
    
    if (patient.length > 0) {
      const p = patient[0];
      console.log(`  Nome: ${p.NOMEPESSOA || p.nomepessoa}`);
      console.log(`  CPF: ${p.CPF || p.cpf || '-'}`);
      console.log(`  Data Nasc: ${p.DTNASC || p.dtnasc || '-'}`);
      console.log(`  Email: ${p.EMAIL || p.email || '-'}`);
      console.log(`  Telefone: ${p.TELEFONE || p.telefone || '-'}`);
      console.log(`  Celular: ${p.CELULAR || p.celular || '-'}`);
    }

    // 2. Verificar agendamentos com JOIN de dentista
    console.log('\n📅 2. Agendamentos com JOIN de Dentista:');
    console.log('-'.repeat(80));
    const appointments = await executeQuery(`
      SELECT 
        m.idmarcacao,
        m.data AS dtmarcacao,
        m.hora AS hrmarcacao,
        m.isatendido,
        m.isbloqueado,
        m.dtcanc,
        m.dtfaltou,
        dp.pessoa AS nome_dentista,
        d.cro,
        d.sigla
      FROM amb_marcacao m
      LEFT JOIN sis_dentista d ON m.iddentista = d.iddentista
      LEFT JOIN sis_pessoa dp ON d.iddentista = dp.idpessoa
      WHERE m.idpaciente = $1
      ORDER BY m.data DESC, m.hora DESC
      LIMIT 10
    `, [patientId]);
    
    console.log(`  Total encontrado: ${appointments.length}`);
    appointments.forEach((apt, i) => {
      let status = 'Agendado';
      if (apt.ISATENDIDO || apt.isatendido === 1) status = 'Atendido';
      else if (apt.ISBLOQUEADO || apt.isbloqueado === 1) status = 'Bloqueado';
      else if (apt.DTCANC || apt.dtcanc) status = 'Cancelado';
      else if (apt.DTFALTOU || apt.dtfaltou) status = 'Faltou';
      
      console.log(`  ${i+1}. ${apt.DTMARCACAO || apt.dtmarcacao} ${apt.HRMARCACAO || apt.hrmarcacao || ''} - ${apt.NOME_DENTISTA || apt.nome_dentista || 'Sem dentista'} (${status})`);
    });

    // 3. Verificar dados clínicos com JOIN de dentista e procedimentos
    console.log('\n🦷 3. Dados Clínicos (Orçamentos) com JOIN:');
    console.log('-'.repeat(80));
    const clinical = await executeQuery(`
      SELECT 
        o.idorcamento,
        o.data AS dtorcamento,
        o.total AS valortotal,
        o.tpregistro,
        dp.pessoa AS nome_dentista,
        d.cro,
        d.sigla
      FROM amb_orcamento o
      LEFT JOIN sis_dentista d ON o.iddentista = d.iddentista
      LEFT JOIN sis_pessoa dp ON d.iddentista = dp.idpessoa
      WHERE o.idpaciente = $1
      ORDER BY o.data DESC
      LIMIT 5
    `, [patientId]);
    
    console.log(`  Total encontrado: ${clinical.length}`);
    for (const orc of clinical) {
      const idOrc = orc.IDORCAMENTO || orc.idorcamento;
      const tipo = (orc.TPREGISTRO || orc.tpregistro) === 1 ? 'Ortodôntico' : 'Clínico';
      
      console.log(`\n  Orçamento #${idOrc} - ${tipo}:`);
      console.log(`    Data: ${orc.DTORCAMENTO || orc.dtorcamento}`);
      console.log(`    Dentista: ${orc.NOME_DENTISTA || orc.nome_dentista || 'Sem dentista'}`);
      console.log(`    Valor: R$ ${orc.VALTOTAL || orc.valortotal || 0}`);
      
      // Buscar itens do orçamento
      const itens = await executeQuery(`
        SELECT 
          oi.idorcaitem,
          oi.linha,
          oi.iditem,
          oi.qtde,
          oi.valor,
          proc.procedimento AS nome_procedimento,
          proc.codigo AS codigo_procedimento
        FROM amb_orcaitem oi
        LEFT JOIN fat_procedimento proc ON oi.idprocedimento = proc.idprocedimento
        WHERE oi.idorcamento = $1
        ORDER BY COALESCE(oi.linha, oi.iditem::text)
      `, [idOrc]);
      
      console.log(`    Itens (${itens.length}):`);
      itens.forEach((item, idx) => {
        const cod = item.CODIGO_PROCEDIMENTO || item.codigo_procedimento || item.IDITEM || item.iditem;
        const desc = item.NOME_PROCEDIMENTO || item.nome_procedimento || 'Sem descrição';
        console.log(`      ${idx+1}. ${cod} - ${desc} (Qtd: ${item.QTDE || item.qtde}, Valor: R$ ${item.VALOR || item.valor})`);
      });
    }

    // 4. Verificar corpo clínico com JOIN de pessoa
    console.log('\n👨‍⚕️ 4. Corpo Clínico com JOIN de Pessoa:');
    console.log('-'.repeat(80));
    const team = await executeQuery(`
      SELECT DISTINCT
        d.iddentista,
        dp.pessoa AS nome_dentista,
        d.cro,
        d.sigla
      FROM sis_dentista d
      INNER JOIN sis_pessoa dp ON d.iddentista = dp.idpessoa
      WHERE d.iddentista IN (
        SELECT m.iddentista
        FROM amb_marcacao m
        WHERE m.idpaciente = $1 AND m.iddentista IS NOT NULL
        UNION
        SELECT o.iddentista
        FROM amb_orcamento o
        WHERE o.idpaciente = $1 AND o.iddentista IS NOT NULL
      )
      ORDER BY dp.pessoa
    `, [patientId]);
    
    console.log(`  Total encontrado: ${team.length}`);
    team.forEach((dent, i) => {
      console.log(`  ${i+1}. ${dent.NOME_DENTISTA || dent.nome_dentista || 'Sem nome'}`);
      console.log(`     CRO: ${dent.CRO || dent.cro || '-'}`);
      console.log(`     Sigla: ${dent.SIGLA || dent.sigla || '-'}`);
    });

    // 5. Verificar ortodontia
    console.log('\n🦷 5. Ortodontia:');
    console.log('-'.repeat(80));
    const ortho = await executeQuery(`
      SELECT 
        o.idorcamento,
        o.data AS dtorcamento,
        o.total AS valortotal,
        o.dtinicio,
        o.numparcelas,
        dp.pessoa AS nome_dentista
      FROM amb_orcamento o
      LEFT JOIN sis_dentista d ON o.iddentista = d.iddentista
      LEFT JOIN sis_pessoa dp ON d.iddentista = dp.idpessoa
      WHERE o.idpaciente = $1 AND o.tpregistro = 1
      ORDER BY o.data DESC
    `, [patientId]);
    
    console.log(`  Total encontrado: ${ortho.length}`);
    ortho.forEach((orc, i) => {
      console.log(`\n  ${i+1}. Orçamento #${orc.IDORCAMENTO || orc.idorcamento}:`);
      console.log(`     Data: ${orc.DTORCAMENTO || orc.dtorcamento}`);
      console.log(`     Dentista: ${orc.NOME_DENTISTA || orc.nome_dentista || 'Sem dentista'}`);
      console.log(`     Valor: R$ ${orc.VALTOTAL || orc.valortotal || 0}`);
      
      // Buscar itens
      const itens = await executeQuery(`
        SELECT 
          oi.idorcaitem,
          oi.linha,
          oi.iditem,
          oi.qtde,
          oi.valor,
          proc.procedimento AS nome_procedimento
        FROM amb_orcaitem oi
        LEFT JOIN fat_procedimento proc ON oi.idprocedimento = proc.idprocedimento
        WHERE oi.idorcamento = $1
        ORDER BY COALESCE(oi.linha, oi.iditem::text)
      `, [orc.IDORCAMENTO || orc.idorcamento]);
      
      itens.forEach((item, idx) => {
        const cod = item.LINHA || item.linha || item.IDITEM || item.iditem;
        const desc = item.NOME_PROCEDIMENTO || item.nome_procedimento || 'Sem descrição';
        console.log(`       ${cod} - ${desc} (Qtd: ${item.QTDE || item.qtde}, Valor: R$ ${item.VALOR || item.valor})`);
      });
    });

    // 6. Verificar imagens
    console.log('\n📷 6. Raios-X / Imagens:');
    console.log('-'.repeat(80));
    const images = await executeQuery(`
      SELECT 
        img.idpacienteimagem,
        img.data,
        img.historico,
        img.pathimagem,
        dp.pessoa AS nome_dentista
      FROM sis_pacienteimagem img
      LEFT JOIN sis_dentista d ON img.iddentista = d.iddentista
      LEFT JOIN sis_pessoa dp ON d.iddentista = dp.idpessoa
      WHERE img.idpaciente = $1
      ORDER BY img.data DESC
      LIMIT 5
    `, [patientId]);
    
    console.log(`  Total encontrado: ${images.length}`);
    images.forEach((img, i) => {
      console.log(`  ${i+1}. ${img.DATA || img.data} - ${img.HISTORICO || img.historico || '-'}`);
      console.log(`     Dentista: ${img.NOME_DENTISTA || img.nome_dentista || '-'}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ Teste concluído!\n');

  } catch (error) {
    console.error('❌ Erro:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testPatientData().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});

