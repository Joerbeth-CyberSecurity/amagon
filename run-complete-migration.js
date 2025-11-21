#!/usr/bin/env node
/**
 * Script principal para executar migração completa
 * 
 * Passos:
 * 1. Verifica estrutura do Supabase
 * 2. Verifica estrutura do Firebird  
 * 3. Exporta dados do Firebird com tratamento de tipos
 * 4. Insere dados no Supabase
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 MIGRAÇÃO COMPLETA - FIREBIRD PARA SUPABASE');
console.log('='.repeat(80));
console.log('');

// Passo 1: Verificar estrutura do Supabase
console.log('📋 PASSO 1: Verificando estrutura do Supabase...');
console.log('-'.repeat(80));
try {
  execSync('python check_supabase_structure.py', { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.log('⚠️ Erro ao verificar Supabase (pode continuar)');
}
console.log('');

// Passo 2: Verificar estrutura do Firebird
console.log('📋 PASSO 2: Verificando estrutura do Firebird...');
console.log('-'.repeat(80));
try {
  execSync('node backend/migration/check-firebird-structure.js', { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.log('❌ Erro ao verificar Firebird. Verifique a conexão.');
  process.exit(1);
}
console.log('');

// Passo 3: Criar tabelas no Supabase
console.log('📋 PASSO 3: Criando tabelas no Supabase...');
console.log('-'.repeat(80));
try {
  execSync('node backend/migration/create-supabase-tables.js', { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.log('❌ Erro ao criar tabelas no Supabase.');
  process.exit(1);
}
console.log('');

// Passo 4: Exportar dados do Firebird
console.log('📋 PASSO 3: Exportando dados do Firebird...');
console.log('-'.repeat(80));
try {
  execSync('node backend/migration/complete-migration.js', { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.log('❌ Erro ao exportar dados do Firebird.');
  process.exit(1);
}
console.log('');

// Passo 5: Inserir no Supabase
console.log('📋 PASSO 5: Inserindo dados no Supabase...');
console.log('-'.repeat(80));
console.log('💡 Execute manualmente: python insert_supabase.py');
console.log('');

console.log('='.repeat(80));
console.log('✅ Processo de exportação concluído!');
console.log('='.repeat(80));

