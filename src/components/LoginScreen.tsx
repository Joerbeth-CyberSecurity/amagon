import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loading } from './ui/Loading'
import './LoginScreen.css'

interface LoginScreenProps {
  onLoginSuccess: () => void
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    // Verifica se já existe uma sessão ativa
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        onLoginSuccess()
      }
    } catch (error) {
      console.error('Erro ao verificar sessão:', error)
    } finally {
      setCheckingSession(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (authError) {
        setError('Email ou senha incorretos')
        return
      }

      if (data.session) {
        onLoginSuccess()
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom Dia'
    if (hour < 18) return 'Boa Tarde'
    return 'Boa Noite'
  }

  if (checkingSession) {
    return (
      <div className="login-screen">
        <Loading message="Verificando sessão..." />
      </div>
    )
  }

  return (
    <div className="login-screen">
      <div className="login-container">
        {/* Ilustração Lateral */}
        <div className="login-illustration">
          <img
            src="/logo.png"
            alt="Logo Sistema de Consulta Odontológica"
            className="login-logo"
          />
        </div>

        {/* Formulário de Login */}
        <div className="login-form-container">
          <div className="login-form">
            <div className="login-header">
              <h1>Olá!</h1>
              <p className="greeting">{getGreeting()}</p>
            </div>

            <h2 className="login-title">Login na sua conta</h2>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Senha</label>
                <input
                  type="password"
                  id="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

