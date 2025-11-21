/**
 * Função helper para retry automático em queries do Supabase
 * Útil para lidar com timeouts temporários
 */

export async function withRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<{ data: T | null; error: any }> {
  let lastError: any = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await queryFn()
      
      // Se não houver erro ou erro não for timeout, retorna
      if (!result.error || result.error.code !== '57014') {
        return result
      }
      
      // Se for timeout e ainda tiver tentativas, aguarda e tenta novamente
      if (attempt < maxRetries) {
        lastError = result.error
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)))
        continue
      }
      
      return result
    } catch (error: any) {
      lastError = error
      
      // Se for timeout e ainda tiver tentativas, aguarda e tenta novamente
      if (error.code === '57014' && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)))
        continue
      }
      
      return { data: null, error }
    }
  }
  
  return { data: null, error: lastError }
}

