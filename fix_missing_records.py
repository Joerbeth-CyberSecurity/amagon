#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para identificar e re-inserir registros faltantes
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

TABLES_WITH_ISSUES = [
    'sis_pessoa',
    'sis_paciente',
    'fin_movconta'
]

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
    
    # Remove comentários
    lines = content.split('\n')
    cleaned_lines = []
    for line in lines:
        if '--' in line:
            line = line[:line.find('--')]
        cleaned_lines.append(line)
    content = '\n'.join(cleaned_lines)
    
    # Encontra TODOS os padrões INSERT INTO ... VALUES
    insert_pattern = r'INSERT\s+INTO\s+\w+\s*\([^)]+\)\s*VALUES\s*'
    
    insert_matches = list(re.finditer(insert_pattern, content, re.IGNORECASE | re.DOTALL))
    
    if not insert_matches:
        return all_tuples
    
    # Processa cada INSERT separadamente
    for idx, insert_match in enumerate(insert_matches):
        start_pos = insert_match.end()
        
        if idx + 1 < len(insert_matches):
            end_pos = insert_matches[idx + 1].start()
        else:
            end_pos = len(content)
        
        values_section = content[start_pos:end_pos].strip().rstrip(';').strip()
        
        # Extrai tuplas
        tuples = extract_tuples_from_values_section(values_section)
        all_tuples.extend(tuples)
    
    return all_tuples

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

def get_existing_ids(conn, cursor, table_name, primary_key):
    """Obtém IDs dos registros já existentes"""
    if not primary_key:
        return set()
    
    try:
        cursor.execute(f'SELECT {primary_key} FROM {table_name}')
        existing = cursor.fetchall()
        return set(row[0] for row in existing)
    except:
        return set()

def extract_id_from_tuple(tuple_str, pk_position):
    """Extrai o ID da tupla baseado na posição da chave primária"""
    try:
        # Remove parênteses externos
        content = tuple_str.strip('()')
        # Divide por vírgulas, respeitando strings
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
            # Remove aspas se houver
            id_value = id_value.strip("'\"")
            # Tenta converter para int
            try:
                return int(id_value)
            except:
                return id_value
    except:
        pass
    return None

def get_pk_position(columns_str, primary_key):
    """Obtém a posição da chave primária na lista de colunas"""
    columns = [c.strip() for c in columns_str.split(',')]
    try:
        return columns.index(primary_key)
    except:
        return 0

def fix_missing_records(table_name):
    """Tenta inserir registros faltantes de uma tabela"""
    logger.info(f'\n{"="*80}')
    logger.info(f'🔧 Corrigindo: {table_name}')
    logger.info(f'{"="*80}')
    
    sql_file = Path(f'backend/migration/output/supabase/inserts/insert-{table_name}.sql')
    
    if not sql_file.exists():
        logger.error(f'❌ Arquivo não encontrado: {sql_file}')
        return False
    
    try:
        conn = psycopg2.connect(**SUPABASE_CONFIG)
        conn.autocommit = False
        cursor = conn.cursor()
        
        logger.info(f'📖 Lendo arquivo: {sql_file.name}')
        with open(sql_file, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Extrai tabela e colunas
        match = re.search(r'INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES', content, re.IGNORECASE)
        if not match:
            logger.error('❌ Não foi possível extrair informações do INSERT')
            return False
        
        table_name_lower = match.group(1).strip()
        columns_str = match.group(2).strip()
        
        # Obtém chave primária
        primary_key = get_primary_key(conn, cursor, table_name_lower)
        if primary_key:
            logger.info(f'🔑 Chave primária: {primary_key}')
            pk_position = get_pk_position(columns_str, primary_key)
        else:
            logger.warning('⚠️ Chave primária não encontrada')
            pk_position = 0
        
        # Obtém IDs existentes
        if primary_key:
            logger.info('🔍 Verificando registros existentes...')
            existing_ids = get_existing_ids(conn, cursor, table_name_lower, primary_key)
            logger.info(f'📊 {len(existing_ids)} registros já existem')
        else:
            existing_ids = set()
        
        # Extrai tuplas
        logger.info('🔍 Extraindo tuplas do arquivo...')
        tuples = extract_tuples_from_content(content)
        logger.info(f'📊 {len(tuples)} tuplas encontradas')
        
        # Filtra tuplas que não estão no banco
        if primary_key and existing_ids:
            missing_tuples = []
            for tuple_str in tuples:
                tuple_id = extract_id_from_tuple(tuple_str, pk_position)
                if tuple_id is None or tuple_id not in existing_ids:
                    missing_tuples.append(tuple_str)
            
            logger.info(f'📊 {len(missing_tuples)} registros faltantes identificados')
            tuples = missing_tuples
        
        if not tuples:
            logger.info('✅ Todos os registros já estão no banco!')
            cursor.close()
            conn.close()
            return True
        
        # Insere registro por registro
        logger.info(f'🚀 Inserindo {len(tuples)} registros...')
        success_count = 0
        error_count = 0
        
        batch_size = 100
        for i in range(0, len(tuples), batch_size):
            batch = tuples[i:i+batch_size]
            batch_values = ', '.join(batch)
            
            try:
                conn.rollback()
                
                if primary_key:
                    insert_cmd = f"INSERT INTO {table_name_lower} ({columns_str}) VALUES {batch_values} ON CONFLICT ({primary_key}) DO NOTHING;"
                else:
                    insert_cmd = f"INSERT INTO {table_name_lower} ({columns_str}) VALUES {batch_values} ON CONFLICT DO NOTHING;"
                
                cursor.execute(insert_cmd)
                conn.commit()
                success_count += len(batch)
                
                if (i + batch_size) % 500 == 0 or i + batch_size >= len(tuples):
                    logger.info(f'  Progresso: {min(i + batch_size, len(tuples))}/{len(tuples)} registros processados...')
                    
            except psycopg2.Error as e:
                error_str = str(e).lower()
                
                # Se houver erro no lote, tenta registro por registro
                if 'invalid input' in error_str or 'syntax error' in error_str:
                    logger.info(f'  ⚠️ Erro no lote, inserindo registro por registro...')
                    
                    for tuple_str in batch:
                        try:
                            conn.rollback()
                            
                            if primary_key:
                                insert_cmd = f"INSERT INTO {table_name_lower} ({columns_str}) VALUES {tuple_str} ON CONFLICT ({primary_key}) DO NOTHING;"
                            else:
                                insert_cmd = f"INSERT INTO {table_name_lower} ({columns_str}) VALUES {tuple_str} ON CONFLICT DO NOTHING;"
                            
                            cursor.execute(insert_cmd)
                            conn.commit()
                            success_count += 1
                            
                        except psycopg2.Error as e2:
                            error_count += 1
                            if error_count <= 5:  # Mostra apenas os primeiros 5 erros
                                logger.warning(f'  ⚠️ Erro ao inserir registro: {str(e2)[:100]}')
                            conn.rollback()
                else:
                    error_count += len(batch)
                    logger.warning(f'  ⚠️ Erro no lote: {str(e)[:100]}')
                    conn.rollback()
        
        logger.info(f'\n📊 Resumo:')
        logger.info(f'  ✅ Inseridos: {success_count}')
        logger.info(f'  ❌ Erros: {error_count}')
        
        cursor.close()
        conn.close()
        
        return error_count == 0
        
    except Exception as e:
        logger.error(f'❌ Erro: {e}')
        import traceback
        traceback.print_exc()
        return False

def main():
    logger.info('🚀 CORRIGINDO REGISTROS FALTANTES')
    logger.info('='*80)
    
    for table_name in TABLES_WITH_ISSUES:
        fix_missing_records(table_name)
    
    logger.info('\n' + '='*80)
    logger.info('✅ Processo concluído!')
    logger.info('💡 Execute: python check_migration_status.py para verificar o status')
    logger.info('='*80)

if __name__ == '__main__':
    main()

