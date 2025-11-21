#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para inserir registros do Firebird no Supabase
Processa arquivo por arquivo automaticamente, em lotes para evitar travamentos
"""

import os
import re
import sys
import time
import psycopg2
from psycopg2 import sql, pool
from psycopg2.extras import execute_batch
import logging
from pathlib import Path

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Configurações do Supabase
SUPABASE_CONFIG = {
    'host': 'db.fjuujaciffjlzkiitppa.supabase.co',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'CyberjkJKinfonet@#2025'
}

# Caminho dos arquivos SQL
SQL_DIR = Path('backend/migration/output/supabase/inserts')

# Ordem de execução dos arquivos (baseado no índice)
FILE_ORDER = [
    'insert-sis_pessoa.sql',
    'insert-sis_paciente.sql',
    'insert-sis_dentista.sql',
    'insert-fat_procedimento.sql',
    'insert-amb_marcacao.sql',
    'insert-amb_orcamento.sql',
    'insert-amb_orcaitem.sql',
    'insert-fin_lancamentopr.sql',
    'insert-fin_movconta.sql',
    'insert-sis_pacienteimagem.sql',
    'insert-amb_orcamentoimagem.sql'
]

# Tamanho do lote para processamento
BATCH_SIZE = 500  # Processa 500 registros por vez
MAX_RETRIES = 3
RETRY_DELAY = 5  # segundos


def create_connection():
    """Cria uma conexão com o Supabase"""
    try:
        conn = psycopg2.connect(**SUPABASE_CONFIG)
        conn.autocommit = False
        logger.info("✅ Conexão estabelecida com o Supabase")
        return conn
    except Exception as e:
        logger.error(f"❌ Erro ao conectar ao Supabase: {e}")
        raise


def extract_tuples_from_values_section(values_section):
    """
    Extrai tuplas de uma seção VALUES
    """
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
                    # Tupla completa
                    tuple_str = ''.join(current_tuple).strip()
                    if tuple_str:
                        # Remove vírgula final se houver
                        tuple_str = tuple_str.rstrip(',').strip()
                        if tuple_str.startswith('(') and tuple_str.endswith(')'):
                            tuples.append(tuple_str)
                    current_tuple = []
            elif char == ',' and paren_depth == 0:
                # Vírgula entre tuplas, ignora
                pass
            else:
                if paren_depth > 0:
                    current_tuple.append(char)
        else:
            current_tuple.append(char)
        
        i += 1
    
    # Se sobrou algo, tenta adicionar
    if current_tuple and paren_depth == 0:
        tuple_str = ''.join(current_tuple).strip().rstrip(',').strip()
        if tuple_str.startswith('(') and tuple_str.endswith(')'):
            tuples.append(tuple_str)
    
    return tuples


def extract_tuples_from_content(content):
    """
    Extrai todas as tuplas de valores de um conteúdo SQL usando regex robusta
    Processa TODOS os comandos INSERT no arquivo
    """
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
    # Usa finditer para encontrar todas as ocorrências
    insert_pattern = r'INSERT\s+INTO\s+\w+\s*\([^)]+\)\s*VALUES\s*'
    
    # Encontra todas as posições de INSERT
    insert_matches = list(re.finditer(insert_pattern, content, re.IGNORECASE | re.DOTALL))
    
    if not insert_matches:
        return all_tuples
    
    # Processa cada INSERT separadamente
    for idx, insert_match in enumerate(insert_matches):
        start_pos = insert_match.end()
        
        # Encontra o final deste INSERT (próximo INSERT ou fim do arquivo)
        if idx + 1 < len(insert_matches):
            end_pos = insert_matches[idx + 1].start()
        else:
            end_pos = len(content)
        
        # Extrai a seção VALUES deste INSERT
        values_section = content[start_pos:end_pos].strip()
        
        # Remove o ponto e vírgula final se houver
        values_section = values_section.rstrip(';').strip()
        
        # Extrai tuplas desta seção
        tuples = extract_tuples_from_values_section(values_section)
        all_tuples.extend(tuples)
    
    return all_tuples


def process_sql_file_streaming(file_path, conn):
    """
    Processa um arquivo SQL de forma streaming, executando INSERTs em lotes
    """
    cursor = conn.cursor()
    
    # Variáveis para rastreamento
    table_name = None
    columns = None
    values_batch = []
    batch_count = 0
    total_inserted = 0
    error_count = 0
    primary_key_cache = {}  # Cache de chaves primárias por tabela
    
    logger.info(f"📖 Processando arquivo: {file_path.name}")
    
    try:
        # Lê o arquivo inteiro (para arquivos grandes, pode ser necessário ler em chunks)
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Encontra o primeiro comando INSERT para obter tabela e colunas
        insert_match = re.search(r'INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES', content, re.IGNORECASE)
        if not insert_match:
            logger.warning(f"  ⚠️ Nenhum comando INSERT encontrado")
            cursor.close()
            return 0, 0
        
        table_name = insert_match.group(1).strip()
        columns = insert_match.group(2).strip()
        
        # Extrai todas as tuplas de TODOS os comandos INSERT
        logger.info(f"  🔍 Extraindo tuplas de valores...")
        tuples = extract_tuples_from_content(content)
        logger.info(f"  📊 {len(tuples)} tuplas extraídas")
        
        # Processa em lotes
        for i, tuple_str in enumerate(tuples, 1):
            values_batch.append(tuple_str)
            batch_count += 1
            
            # Quando atingir o tamanho do lote, executa
            if len(values_batch) >= BATCH_SIZE:
                success = execute_values_batch(conn, cursor, table_name, columns, values_batch, primary_key_cache)
                if success:
                    total_inserted += len(values_batch)
                else:
                    error_count += len(values_batch)
                values_batch = []
                
                if batch_count % (BATCH_SIZE * 10) == 0:
                    logger.info(f"  Progresso: {batch_count}/{len(tuples)} registros processados...")
        
        # Executa lote final
        if values_batch:
            success = execute_values_batch(conn, cursor, table_name, columns, values_batch, primary_key_cache)
            if success:
                total_inserted += len(values_batch)
            else:
                error_count += len(values_batch)
        
        # Commit final
        try:
            conn.commit()
        except Exception as e:
            logger.error(f"  ❌ Erro no commit final: {e}")
            conn.rollback()
        
        cursor.close()
        return total_inserted, error_count
        
    except Exception as e:
        logger.error(f"  ❌ Erro ao processar arquivo: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        cursor.close()
        return total_inserted, error_count


def insert_record_by_record(conn, cursor, table_name, columns, values_batch, primary_key):
    """
    Insere registros um por um, ignorando os que têm erro
    """
    if not values_batch:
        return True
    
    success_count = 0
    error_count = 0
    
    for tuple_str in values_batch:
        try:
            conn.rollback()  # Limpa estado anterior
            
            if primary_key:
                insert_cmd = f"INSERT INTO {table_name} ({columns}) VALUES {tuple_str} ON CONFLICT ({primary_key}) DO NOTHING;"
            else:
                insert_cmd = f"INSERT INTO {table_name} ({columns}) VALUES {tuple_str} ON CONFLICT DO NOTHING;"
            
            cursor.execute(insert_cmd)
            conn.commit()
            success_count += 1
            
        except psycopg2.Error as e:
            error_str = str(e).lower()
            # Se for erro de tipo de dados, apenas ignora o registro
            if 'invalid input syntax' in error_str or 'invalid input' in error_str:
                error_count += 1
                # Log apenas a cada 10 erros para não poluir
                if error_count % 10 == 0:
                    logger.info(f"  ℹ️ {error_count} registros com dados inválidos ignorados...")
            else:
                # Outros erros também são ignorados
                error_count += 1
            try:
                conn.rollback()
            except:
                pass
    
    if error_count > 0:
        logger.info(f"  ℹ️ {success_count} registros inseridos, {error_count} registros ignorados (dados inválidos)")
    
    return success_count > 0


def get_primary_key(conn, cursor, table_name):
    """
    Descobre a chave primária de uma tabela
    """
    try:
        query = """
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = %s::regclass
            AND i.indisprimary;
        """
        cursor.execute(query, (table_name,))
        result = cursor.fetchone()
        if result:
            return result[0]
    except:
        pass
    return None


def execute_values_batch(conn, cursor, table_name, columns, values_batch, primary_key_cache=None):
    """
    Executa um lote de valores INSERT com tratamento de duplicatas
    """
    if not values_batch:
        return True
    
    # Descobre a chave primária se ainda não foi descoberta
    if primary_key_cache is None:
        primary_key_cache = {}
    
    if table_name not in primary_key_cache:
        pk = get_primary_key(conn, cursor, table_name)
        primary_key_cache[table_name] = pk
        if pk:
            logger.info(f"  🔑 Chave primária detectada: {pk}")
    
    primary_key = primary_key_cache.get(table_name)
    
    retry_count = 0
    success = False
    
    while retry_count < MAX_RETRIES and not success:
        try:
            # Sempre faz rollback antes de tentar (para limpar estado de erro anterior)
            try:
                conn.rollback()
            except:
                pass
            
            # Constrói o comando INSERT com ON CONFLICT DO NOTHING para ignorar duplicatas
            values_str = ', '.join(values_batch)
            
            # Se temos a chave primária, usa ela no ON CONFLICT
            if primary_key:
                insert_cmd = f"INSERT INTO {table_name} ({columns}) VALUES {values_str} ON CONFLICT ({primary_key}) DO NOTHING;"
            else:
                # Tenta sem especificar a coluna (funciona se houver apenas uma constraint única)
                insert_cmd = f"INSERT INTO {table_name} ({columns}) VALUES {values_str} ON CONFLICT DO NOTHING;"
            
            cursor.execute(insert_cmd)
            success = True
            
        except psycopg2.Error as e:
            error_str = str(e).lower()
            retry_count += 1
            
            # Sempre faz rollback quando há erro
            try:
                conn.rollback()
            except:
                pass
            
            # Se for erro de duplicata, não é crítico
            if 'duplicate key' in error_str or 'unique constraint' in error_str:
                logger.info(f"  ℹ️ Registros duplicados detectados (normal se dados já existem)")
                # Considera sucesso mesmo com duplicatas
                success = True
                break
            
            # Se for erro de transação abortada, apenas tenta novamente
            if 'current transaction is aborted' in error_str:
                if retry_count < MAX_RETRIES:
                    time.sleep(1)  # Pausa menor para erro de transação
                    continue
                else:
                    logger.warning(f"  ⚠️ Erro de transação após {MAX_RETRIES} tentativas")
                    return False
            
            # Erros de tipo de dados - tenta inserir registro por registro
            if 'invalid input syntax' in error_str or 'invalid input' in error_str:
                logger.warning(f"  ⚠️ Erro de tipo de dados detectado, tentando inserir registro por registro...")
                return insert_record_by_record(conn, cursor, table_name, columns, values_batch, primary_key)
            
            # Outros erros
            if retry_count >= MAX_RETRIES:
                logger.warning(f"  ⚠️ Erro após {MAX_RETRIES} tentativas: {e}")
                logger.warning(f"     Tabela: {table_name}, Lote: {len(values_batch)} registros")
                # Tenta inserir registro por registro como último recurso
                return insert_record_by_record(conn, cursor, table_name, columns, values_batch, primary_key)
            else:
                logger.warning(f"  ⚠️ Erro no lote, tentativa {retry_count}/{MAX_RETRIES}: {e}")
                time.sleep(RETRY_DELAY)
    
    # Commit a cada lote se houve sucesso
    if success:
        try:
            conn.commit()
        except Exception as e:
            logger.error(f"  ❌ Erro ao fazer commit: {e}")
            try:
                conn.rollback()
            except:
                pass
            return False
        return True
    else:
        try:
            conn.rollback()
        except:
            pass
        return False


def process_sql_file(file_path):
    """
    Processa um arquivo SQL completo
    """
    file_name = file_path.name
    logger.info(f"\n{'='*80}")
    logger.info(f"📁 Processando arquivo: {file_name}")
    logger.info(f"{'='*80}")
    
    start_time = time.time()
    
    # Cria conexão para este arquivo
    conn = None
    try:
        conn = create_connection()
        
        # Processa o arquivo de forma streaming
        total_inserted, error_count = process_sql_file_streaming(file_path, conn)
        
        elapsed_time = time.time() - start_time
        
        logger.info(f"\n📊 Resumo do arquivo {file_name}:")
        logger.info(f"   ✅ Registros inseridos: {total_inserted}")
        logger.info(f"   ❌ Erros: {error_count}")
        logger.info(f"   ⏱️ Tempo: {elapsed_time:.2f} segundos ({elapsed_time/60:.2f} minutos)")
        
        return error_count == 0
        
    except Exception as e:
        logger.error(f"❌ Erro ao processar arquivo {file_name}: {e}")
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
        return False
    
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass


def main():
    """
    Função principal - processa todos os arquivos na ordem correta
    """
    logger.info("="*80)
    logger.info("🚀 INICIANDO INSERÇÃO DE DADOS NO SUPABASE")
    logger.info("="*80)
    
    # Verifica se o diretório existe
    if not SQL_DIR.exists():
        logger.error(f"❌ Diretório não encontrado: {SQL_DIR}")
        logger.error("   Certifique-se de que os arquivos SQL foram gerados.")
        sys.exit(1)
    
    # Verifica conexão
    try:
        test_conn = create_connection()
        test_conn.close()
        logger.info("✅ Teste de conexão bem-sucedido\n")
    except Exception as e:
        logger.error(f"❌ Não foi possível conectar ao Supabase: {e}")
        sys.exit(1)
    
    # Processa cada arquivo na ordem
    total_files = len(FILE_ORDER)
    successful_files = 0
    failed_files = 0
    
    overall_start = time.time()
    
    for i, file_name in enumerate(FILE_ORDER, 1):
        file_path = SQL_DIR / file_name
        
        if not file_path.exists():
            logger.warning(f"⚠️ Arquivo não encontrado: {file_name} - Pulando...")
            failed_files += 1
            continue
        
        logger.info(f"\n[{i}/{total_files}] Processando: {file_name}")
        
        success = process_sql_file(file_path)
        
        if success:
            successful_files += 1
            logger.info(f"✅ Arquivo {file_name} processado com sucesso!")
        else:
            failed_files += 1
            logger.error(f"❌ Arquivo {file_name} teve erros, mas continuando...")
        
        # Pequena pausa entre arquivos
        if i < total_files:
            time.sleep(2)
    
    overall_elapsed = time.time() - overall_start
    
    # Resumo final
    logger.info("\n" + "="*80)
    logger.info("📊 RESUMO FINAL")
    logger.info("="*80)
    logger.info(f"   Total de arquivos: {total_files}")
    logger.info(f"   ✅ Sucessos: {successful_files}")
    logger.info(f"   ❌ Falhas: {failed_files}")
    logger.info(f"   ⏱️ Tempo total: {overall_elapsed/60:.2f} minutos")
    logger.info("="*80)
    
    if failed_files == 0:
        logger.info("🎉 Todos os arquivos foram processados com sucesso!")
        sys.exit(0)
    else:
        logger.warning(f"⚠️ {failed_files} arquivo(s) tiveram problemas. Verifique os logs acima.")
        sys.exit(1)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        logger.info("\n⚠️ Processo interrompido pelo usuário")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n❌ Erro fatal: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

