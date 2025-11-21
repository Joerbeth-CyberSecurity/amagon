#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para criar tabelas no Supabase a partir do SQL gerado
"""

import psycopg2
import sys
from pathlib import Path

SUPABASE_CONFIG = {
    'host': 'db.fjuujaciffjlzkiitppa.supabase.co',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'CyberjkJKinfonet@#2025'
}

def create_tables():
    sql_file = Path('backend/migration/output/supabase/01-create-tables.sql')
    
    if not sql_file.exists():
        print(f'❌ Arquivo não encontrado: {sql_file}')
        print('💡 Execute primeiro: node backend/migration/create-supabase-tables.js')
        sys.exit(1)
    
    print('📖 Lendo arquivo SQL...')
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    print('🔌 Conectando ao Supabase...')
    try:
        conn = psycopg2.connect(**SUPABASE_CONFIG)
        conn.autocommit = True  # Para executar CREATE TABLE
        cursor = conn.cursor()
        print('✅ Conectado!\n')
    except Exception as e:
        print(f'❌ Erro ao conectar: {e}')
        sys.exit(1)
    
    print('🚀 Criando tabelas...')
    print('=' * 80)
    
    try:
        # Divide o SQL em comandos individuais
        commands = sql_content.split(';')
        
        for i, command in enumerate(commands, 1):
            command = command.strip()
            if not command or command.startswith('--'):
                continue
            
            # Extrai nome da tabela do comando
            if 'CREATE TABLE' in command.upper():
                table_match = None
                import re
                match = re.search(r'CREATE TABLE.*?(\w+)', command, re.IGNORECASE)
                if match:
                    table_match = match.group(1)
                
                if table_match:
                    print(f'\n📋 Criando tabela: {table_match}')
                else:
                    print(f'\n📋 Executando comando {i}...')
                
                try:
                    cursor.execute(command + ';')
                    if table_match:
                        print(f'  ✅ Tabela {table_match} criada com sucesso!')
                except Exception as e:
                    if 'already exists' in str(e).lower():
                        print(f'  ℹ️ Tabela {table_match} já existe (ignorando)')
                    else:
                        print(f'  ⚠️ Erro: {e}')
        
        print('\n' + '=' * 80)
        print('✅ Processo concluído!')
        print('=' * 80)
        
    except Exception as e:
        print(f'\n❌ Erro: {e}')
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    create_tables()

