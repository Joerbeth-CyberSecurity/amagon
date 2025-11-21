const { executeQuery } = require('./backend/db');

async function testConnection() {
  try {
    console.log('🔌 Testando conexão com Supabase...\n');
    
    // Teste 1: Contagem de tabelas
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'sis_pessoa', 'sis_paciente', 'sis_dentista', 
        'amb_marcacao', 'amb_orcamento', 'amb_orcaitem'
      )
    `;
    
    const tables = await executeQuery(countQuery);
    console.log(`✅ Tabelas encontradas: ${tables[0].TOTAL || tables[0].total}\n`);
    
    // Teste 2: Contagem de pacientes
    const patientsQuery = 'SELECT COUNT(*) as total FROM sis_paciente';
    const patients = await executeQuery(patientsQuery);
    console.log(`✅ Total de pacientes: ${patients[0].TOTAL || patients[0].total}\n`);
    
    // Teste 3: Busca simples
    const searchQuery = `
      SELECT FIRST 5
        p.idpessoa,
        p.pessoa AS nomepessoa,
        p.cnpj_cpf AS cpf
      FROM sis_pessoa p
      INNER JOIN sis_paciente pac ON p.idpessoa = pac.idpaciente
      WHERE UPPER(p.pessoa) CONTAINING UPPER(?)
      ORDER BY p.pessoa
    `;
    
    const results = await executeQuery(searchQuery, ['a']);
    console.log(`✅ Busca retornou ${results.length} resultados\n`);
    
    if (results.length > 0) {
      console.log('📋 Primeiro resultado:');
      console.log(`   ID: ${results[0].IDPESSOA || results[0].idpessoa}`);
      console.log(`   Nome: ${results[0].NOMEPESSOA || results[0].nomepessoa}`);
      console.log(`   CPF: ${results[0].CPF || results[0].cpf}`);
    }
    
    console.log('\n✅ Todos os testes passaram!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testConnection();

