#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para verificar estrutura das tabelas no Supabase
"""

import psycopg2
import sys

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
    'amb_marcacao',
    'amb_orcamento',
    'amb_orcaitem',
    'fin_lancamentopr',
    'fin_movconta',
    'fat_procedimento',
    'sis_pacienteimagem',
    'amb_orcamentoimagem'
]

def check_supabase_structure():
    try:
        conn = psycopg2.connect(**SUPABASE_CONFIG)
        cursor = conn.cursor()
        
        print('✅ Conectado ao Supabase\n')
        print('=' * 80)
        print('ESTRUTURA DAS TABELAS NO SUPABASE')
        print('=' * 80)
        
        for table_name in TABLES:
            print(f'\n📋 Tabela: {table_name.upper()}')
            print('-' * 80)
            
            # Verifica se a tabela existe
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                );
            """, (table_name,))
            
            if not cursor.fetchone()[0]:
                print('  ⚠️ Tabela não existe no Supabase')
                continue
            
            # Obtém colunas e tipos
            cursor.execute("""
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    numeric_precision,
                    numeric_scale,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                AND table_name = %s
                ORDER BY ordinal_position;
            """, (table_name,))
            
            columns = cursor.fetchall()
            print(f'  Colunas ({len(columns)}):')
            
            for col in columns:
                col_name, data_type, char_max_len, num_precision, num_scale, is_nullable, col_default = col
                
                type_info = data_type
                if char_max_len:
                    type_info += f'({char_max_len})'
                elif num_precision:
                    type_info += f'({num_precision}'
                    if num_scale:
                        type_info += f',{num_scale}'
                    type_info += ')'
                
                nullable = 'NULL' if is_nullable == 'YES' else 'NOT NULL'
                default = f' DEFAULT {col_default}' if col_default else ''
                
                print(f'    - {col_name}: {type_info} {nullable}{default}')
            
            # Obtém chave primária
            cursor.execute("""
                SELECT a.attname
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                WHERE i.indrelid = %s::regclass
                AND i.indisprimary;
            """, (table_name,))
            
            pk = cursor.fetchall()
            if pk:
                pk_fields = ', '.join([row[0] for row in pk])
                print(f'  🔑 Chave Primária: {pk_fields}')
            
            # Conta registros
            cursor.execute(f'SELECT COUNT(*) FROM {table_name}')
            count = cursor.fetchone()[0]
            print(f'  📊 Registros: {count}')
        
        print('\n' + '=' * 80)
        print('VERIFICAÇÃO CONCLUÍDA')
        print('=' * 80)
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f'❌ Erro: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    check_supabase_structure()

