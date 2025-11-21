/**
 * Formata data para padrão brasileiro (dd/mm/aaaa)
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return '-'
  }
}

/**
 * Formata valor monetário para padrão brasileiro
 */
export function formatCurrency(value: number | null | undefined): string {
  if (!value && value !== 0) return 'R$ 0,00'
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

/**
 * Formata CPF com máscara (xxx.xxx.xxx-xx)
 */
export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return '-'
  
  const cleaned = cpf.replace(/\D/g, '')
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  
  return cpf
}

/**
 * Remove formatação do CPF, deixando apenas números
 */
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}
