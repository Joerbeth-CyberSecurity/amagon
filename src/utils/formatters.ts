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

let latinDecoder: TextDecoder | null = null
let utf8Decoder: TextDecoder | null = null
if (typeof TextDecoder !== 'undefined') {
  try {
    latinDecoder = new TextDecoder('iso-8859-1')
  } catch {
    latinDecoder = null
  }
  try {
    utf8Decoder = new TextDecoder('utf-8')
  } catch {
    utf8Decoder = null
  }
}

/**
 * Normaliza textos que chegam com caracteres corrompidos (ex: "Ã¡" em vez de "á")
 */
export function normalizeText(text: string | null | undefined): string {
  if (text === null || text === undefined) return ''
  if (!latinDecoder || !utf8Decoder) return text
  
  const suspicious =
    text.includes('�') ||
    /Ã|Â|Ê|Ô|Õ|ã|õ/.test(text)
  
  if (!suspicious) return text
  
  const utf8Attempt = tryDecode(text, utf8Decoder)
  if (utf8Attempt) return utf8Attempt
  
  const latinAttempt = tryDecode(text, latinDecoder)
  if (latinAttempt) return latinAttempt
  
  return text
}

function tryDecode(text: string, decoder: TextDecoder): string | null {
  const bytes = new Uint8Array(text.length)
  let hasHigh = false
  
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code > 127 || code === 65533) hasHigh = true
    bytes[i] = code & 0xff
  }
  
  if (!hasHigh) return null
  
  try {
    const decoded = decoder.decode(bytes)
    if (decoded.includes('�')) return null
    if (!isValidDecoded(text, decoded)) return null
    return decoded
  } catch {
    return null
  }
}

function isValidDecoded(original: string, decoded: string): boolean {
  const originalA = (original.match(/A/g) || []).length
  const decodedA = (decoded.match(/A/g) || []).length
  const originalEnye = (original.match(/Ñ|ñ/g) || []).length
  const decodedEnye = (decoded.match(/Ñ|ñ/g) || []).length

  if (decodedA < originalA / 2) return false
  if (decodedEnye !== originalEnye && originalEnye === 0 && decodedEnye > 0) return false
  return true
}