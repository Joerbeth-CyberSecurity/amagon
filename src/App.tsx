import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { LoginScreen } from './components/LoginScreen'
import { SearchScreen } from './components/SearchScreen'
import { PatientScreen } from './components/PatientScreen'
import type { Patient } from './types/patient'
import './App.css'

type Screen = 'login' | 'search' | 'patient'

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState<string>('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Verifica se usuário está autenticado
    checkAuth()

    // Listener para mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
      if (session) {
        setUserName(session.user.user_metadata?.full_name || session.user.email || '')
      } else {
        setUserName('')
      }
      setCurrentScreen(session ? 'search' : 'login')
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme
    }
  }, [theme])

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setIsAuthenticated(!!session)
    if (session) {
      setUserName(session.user.user_metadata?.full_name || session.user.email || '')
    } else {
      setUserName('')
    }
    setCurrentScreen(session ? 'search' : 'login')
  }

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
    setCurrentScreen('search')
    checkAuth()
  }

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsAuthenticated(false)
    setCurrentScreen('login')
    setSelectedPatient(null)
  }

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setCurrentScreen('patient')
  }

  const handleBack = () => {
    setCurrentScreen('search')
    setSelectedPatient(null)
  }

  return (
    <div className="app">
      {currentScreen === 'login' && (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
      
      {currentScreen === 'search' && isAuthenticated && (
        <SearchScreen 
          onSelectPatient={handleSelectPatient}
          onLogout={handleLogout}
          currentUserName={userName}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      )}
      
      {currentScreen === 'patient' && selectedPatient && isAuthenticated && (
        <PatientScreen 
          patient={selectedPatient} 
          onBack={handleBack} 
          theme={theme}
          onToggleTheme={handleToggleTheme}
          currentUserName={userName}
          onLogout={handleLogout}
        />
      )}
    </div>
  )
}

export default App
