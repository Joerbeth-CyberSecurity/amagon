#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para verificar o status da migração e identificar problemas
"""

import psycopg2
from pathlib import Path

SUPABASE_CONFIG = {
    'host': 'db.fjuujaciffjlzkiitppa.supabase.co',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'CyberjkJKinfonet@#2025'
}

TABLES = [
    'sis_pessoa',
    'sis_paciente',
    'sis_dentista',
    'fat_procedimento',
    'amb_marcacao',
    'amb_orcamento',
    'amb_orcaitem',
    'fin_lancamentopr',
    'fin_movconta',
    'sis_pacienteimagem',
    'amb_orcamentoimagem'
]

def count_expected_records(table_name):
    """Conta quantos registros deveriam ser inseridos baseado nos arquivos SQL"""
    sql_file = Path(f'backend/migration/output/supabase/inserts/insert-{table_name}.sql')
    
    if not sql_file.exists():
        return 0
    
    try:
        with open(sql_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Conta tuplas reais no arquivo (método mais preciso)
        import re
        
        # Remove comentários
        lines = content.split('\n')
        cleaned_lines = []
        for line in lines:
            if '--' in line:
                line = line[:line.find('--')]
            cleaned_lines.append(line)
        content = '\n'.join(cleaned_lines)
        
        # Encontra todos os INSERT INTO
        insert_pattern = r'INSERT\s+INTO\s+\w+\s*\([^)]+\)\s*VALUES\s*'
        insert_matches = list(re.finditer(insert_pattern, content, re.IGNORECASE | re.DOTALL))
        
        if not insert_matches:
            return 0
        
        total_tuples = 0
        
        # Processa cada INSERT
        for idx, insert_match in enumerate(insert_matches):
            start_pos = insert_match.end()
            
            if idx + 1 < len(insert_matches):
                end_pos = insert_matches[idx + 1].start()
            else:
                end_pos = len(content)
            
            values_section = content[start_pos:end_pos].strip().rstrip(';').strip()
            
            # Conta tuplas completas (entre parênteses balanceados)
            paren_count = 0
            in_string = False
            string_char = None
            escape = False
            tuple_count = 0
            
            for char in values_section:
                if escape:
                    escape = False
                    continue
                
                if char == '\\':
                    escape = True
                    continue
                
                if char in ("'", '"') and not escape:
                    if not in_string:
                        in_string = True
                        string_char = char
                    elif char == string_char:
                        in_string = False
                        string_char = None
                    continue
                
                if not in_string:
                    if char == '(':
                        paren_count += 1
                        if paren_count == 1:
                            tuple_count += 1
                    elif char == ')':
                        paren_count -= 1
            
            total_tuples += tuple_count
        
        return total_tuples
        
    except Exception as e:
        # Fallback: tenta contar de forma simples
        try:
            tuples = re.findall(r'\([^)]+\)', content)
            return len(tuples)
        except:
            return 0

def check_migration_status():
    try:
        conn = psycopg2.connect(**SUPABASE_CONFIG)
        cursor = conn.cursor()
        
        print('🔍 VERIFICANDO STATUS DA MIGRAÇÃO')
        print('=' * 80)
        print()
        
        issues = []
        success_count = 0
        
        for table_name in TABLES:
            print(f'📋 {table_name.upper()}')
            print('-' * 80)
            
            # Verifica se tabela existe
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                );
            """, (table_name,))
            
            if not cursor.fetchone()[0]:
                print('  ❌ Tabela não existe no Supabase')
                issues.append(f'{table_name}: Tabela não existe')
                print()
                continue
            
            # Conta registros no Supabase
            cursor.execute(f'SELECT COUNT(*) FROM {table_name}')
            count_supabase = cursor.fetchone()[0]
            
            # Conta registros esperados
            count_expected = count_expected_records(table_name)
            
            print(f'  📊 Registros no Supabase: {count_supabase:,}')
            print(f'  📊 Registros esperados: {count_expected:,}')
            
            if count_expected == 0:
                print('  ⚠️ Arquivo SQL não encontrado ou vazio')
                issues.append(f'{table_name}: Arquivo SQL não encontrado')
            elif count_supabase == 0:
                print('  ❌ Nenhum registro inserido')
                issues.append(f'{table_name}: Nenhum registro inserido (esperado: {count_expected:,})')
            elif count_supabase < count_expected:
                diff = count_expected - count_supabase
                percentage = (count_supabase / count_expected) * 100
                print(f'  ⚠️ Faltam {diff:,} registros ({percentage:.1f}% inserido)')
                issues.append(f'{table_name}: Faltam {diff:,} registros ({percentage:.1f}% inserido)')
            else:
                print('  ✅ Todos os registros foram inseridos!')
                success_count += 1
            
            print()
        
        print('=' * 80)
        print('📊 RESUMO')
        print('=' * 80)
        print(f'✅ Tabelas OK: {success_count}/{len(TABLES)}')
        print(f'⚠️ Tabelas com problemas: {len(issues)}')
        print()
        
        if issues:
            print('🔍 PROBLEMAS IDENTIFICADOS:')
            print('-' * 80)
            for issue in issues:
                print(f'  - {issue}')
            print()
            print('💡 Para corrigir:')
            print('  1. Verifique os logs do insert_supabase.py')
            print('  2. Re-execute o arquivo que falhou manualmente')
            print('  3. Ou execute novamente: python insert_supabase.py')
        else:
            print('🎉 Todas as tabelas foram migradas com sucesso!')
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f'❌ Erro: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    check_migration_status()

