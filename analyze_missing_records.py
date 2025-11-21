#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para analisar detalhadamente quais registros estão faltando e por quê
"""

import psycopg2
import re
from pathlib import Path
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

SUPABASE_CONFIG = {
    'host': 'db.fjuujaciffjlzkiitppa.supabase.co',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'CyberjkJKinfonet@#2025'
}

TABLES_TO_ANALYZE = ['sis_pessoa', 'sis_paciente']

def get_primary_key(conn, cursor, table_name):
    """Obtém a chave primária da tabela"""
    try:
        cursor.execute("""
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = %s::regclass
            AND i.indisprimary;
        """, (table_name,))
        result = cursor.fetchone()
        if result:
            return result[0]
    except:
        pass
    return None

def extract_tuples_from_content(content):
    """Extrai todas as tuplas de um conteúdo SQL"""
    all_tuples = []
    
    lines = content.split('\n')
    cleaned_lines = []
    for line in lines:
        if '--' in line:
            line = line[:line.find('--')]
        cleaned_lines.append(line)
    content = '\n'.join(cleaned_lines)
    
    insert_pattern = r'INSERT\s+INTO\s+\w+\s*\([^)]+\)\s*VALUES\s*'
    insert_matches = list(re.finditer(insert_pattern, content, re.IGNORECASE | re.DOTALL))
    
    if not insert_matches:
        return all_tuples, None
    
    # Pega o primeiro match para extrair colunas
    first_match = insert_matches[0]
    table_match = re.search(r'INSERT\s+INTO\s+(\w+)', first_match.group(0), re.IGNORECASE)
    columns_match = re.search(r'\(([^)]+)\)', first_match.group(0), re.IGNORECASE)
    
    table_name = table_match.group(1) if table_match else None
    columns_str = columns_match.group(1) if columns_match else None
    
    for idx, insert_match in enumerate(insert_matches):
        start_pos = insert_match.end()
        
        if idx + 1 < len(insert_matches):
            end_pos = insert_matches[idx + 1].start()
        else:
            end_pos = len(content)
        
        values_section = content[start_pos:end_pos].strip().rstrip(';').strip()
        
        tuples = extract_tuples_from_values_section(values_section)
        all_tuples.extend(tuples)
    
    return all_tuples, columns_str

def extract_tuples_from_values_section(values_section):
    """Extrai tuplas de uma seção VALUES"""
    tuples = []
    i = 0
    current_tuple = []
    paren_depth = 0
    in_string = False
    string_char = None
    escape_next = False
    
    while i < len(values_section):
        char = values_section[i]
        
        if escape_next:
            escape_next = False
            current_tuple.append(char)
            i += 1
            continue
        
        if char == '\\':
            escape_next = True
            current_tuple.append(char)
            i += 1
            continue
        
        if char in ("'", '"') and not escape_next:
            if not in_string:
                in_string = True
                string_char = char
            elif char == string_char:
                in_string = False
                string_char = None
            current_tuple.append(char)
            i += 1
            continue
        
        if not in_string:
            if char == '(':
                if paren_depth == 0:
                    current_tuple = [char]
                else:
                    current_tuple.append(char)
                paren_depth += 1
            elif char == ')':
                current_tuple.append(char)
                paren_depth -= 1
                if paren_depth == 0:
                    tuple_str = ''.join(current_tuple).strip()
                    if tuple_str:
                        tuple_str = tuple_str.rstrip(',').strip()
                        if tuple_str.startswith('(') and tuple_str.endswith(')'):
                            tuples.append(tuple_str)
                    current_tuple = []
            elif char == ',' and paren_depth == 0:
                pass
            else:
                if paren_depth > 0:
                    current_tuple.append(char)
        else:
            current_tuple.append(char)
        
        i += 1
    
    if current_tuple and paren_depth == 0:
        tuple_str = ''.join(current_tuple).strip().rstrip(',').strip()
        if tuple_str.startswith('(') and tuple_str.endswith(')'):
            tuples.append(tuple_str)
    
    return tuples

def extract_id_from_tuple(tuple_str, pk_position):
    """Extrai o ID da tupla"""
    try:
        content = tuple_str.strip('()')
        values = []
        current = []
        in_string = False
        string_char = None
        escape = False
        
        for char in content:
            if escape:
                escape = False
                current.append(char)
                continue
            
            if char == '\\':
                escape = True
                current.append(char)
                continue
            
            if char in ("'", '"') and not escape:
                if not in_string:
                    in_string = True
                    string_char = char
                elif char == string_char:
                    in_string = False
                    string_char = None
                current.append(char)
            elif char == ',' and not in_string:
                values.append(''.join(current).strip())
                current = []
            else:
                current.append(char)
        
        if current:
            values.append(''.join(current).strip())
        
        if pk_position < len(values):
            id_value = values[pk_position]
            id_value = id_value.strip("'\"")
            try:
                return int(id_value)
            except:
                return id_value
    except:
        pass
    return None

def get_pk_position(columns_str, primary_key):
    """Obtém a posição da chave primária"""
    columns = [c.strip() for c in columns_str.split(',')]
    try:
        return columns.index(primary_key)
    except:
        return 0

def analyze_table(table_name):
    """Analisa uma tabela para identificar registros faltantes"""
    logger.info(f'\n{"="*80}')
    logger.info(f'📊 Analisando: {table_name}')
    logger.info(f'{"="*80}')
    
    sql_file = Path(f'backend/migration/output/supabase/inserts/insert-{table_name}.sql')
    
    if not sql_file.exists():
        logger.error(f'❌ Arquivo não encontrado: {sql_file}')
        return
    
    try:
        conn = psycopg2.connect(**SUPABASE_CONFIG)
        cursor = conn.cursor()
        
        # Obtém chave primária
        primary_key = get_primary_key(conn, cursor, table_name)
        if not primary_key:
            logger.error('❌ Chave primária não encontrada')
            return
        
        logger.info(f'🔑 Chave primária: {primary_key}')
        
        # Lê arquivo
        logger.info(f'📖 Lendo arquivo...')
        with open(sql_file, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Extrai tuplas e colunas
        tuples, columns_str = extract_tuples_from_content(content)
        logger.info(f'📊 {len(tuples)} tuplas encontradas no arquivo')
        
        if not columns_str:
            logger.error('❌ Não foi possível extrair colunas')
            return
        
        pk_position = get_pk_position(columns_str, primary_key)
        
        # Obtém IDs existentes
        logger.info('🔍 Verificando registros no banco...')
        cursor.execute(f'SELECT {primary_key} FROM {table_name}')
        existing_ids = set(row[0] for row in cursor.fetchall())
        logger.info(f'📊 {len(existing_ids)} registros no banco')
        
        # Identifica faltantes
        missing_ids = []
        for tuple_str in tuples:
            tuple_id = extract_id_from_tuple(tuple_str, pk_position)
            if tuple_id is not None and tuple_id not in existing_ids:
                missing_ids.append((tuple_id, tuple_str))
        
        logger.info(f'\n📊 RESULTADO:')
        logger.info(f'  Total no arquivo: {len(tuples)}')
        logger.info(f'  Total no banco: {len(existing_ids)}')
        logger.info(f'  Faltantes: {len(missing_ids)}')
        
        if missing_ids:
            logger.info(f'\n🔍 Primeiros 10 IDs faltantes:')
            for i, (missing_id, tuple_str) in enumerate(missing_ids[:10], 1):
                logger.info(f'  {i}. ID: {missing_id}')
                # Tenta identificar o problema
                if 'NULL' in tuple_str.upper() or '1970' in tuple_str or '1899' in tuple_str:
                    logger.info(f'     ⚠️ Possível dado inválido detectado')
        
        if len(missing_ids) > 10:
            logger.info(f'  ... e mais {len(missing_ids) - 10} registros')
        
        # Tenta inserir alguns para ver o erro
        if missing_ids:
            logger.info(f'\n🧪 Testando inserção de 3 registros faltantes...')
            test_count = 0
            for missing_id, tuple_str in missing_ids[:3]:
                try:
                    conn.rollback()
                    insert_cmd = f"INSERT INTO {table_name} ({columns_str}) VALUES {tuple_str} ON CONFLICT ({primary_key}) DO NOTHING;"
                    cursor.execute(insert_cmd)
                    conn.commit()
                    logger.info(f'  ✅ ID {missing_id}: Inserido com sucesso!')
                    test_count += 1
                except psycopg2.Error as e:
                    logger.warning(f'  ❌ ID {missing_id}: {str(e)[:150]}')
                    conn.rollback()
            
            if test_count > 0:
                logger.info(f'\n💡 {test_count} registros foram inseridos no teste. Execute fix_missing_records.py para inserir todos.')
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        logger.error(f'❌ Erro: {e}')
        import traceback
        traceback.print_exc()

def main():
    logger.info('🔍 ANÁLISE DETALHADA DE REGISTROS FALTANTES')
    logger.info('='*80)
    
    for table_name in TABLES_TO_ANALYZE:
        analyze_table(table_name)
    
    logger.info('\n' + '='*80)
    logger.info('✅ Análise concluída!')
    logger.info('='*80)

if __name__ == '__main__':
    main()

