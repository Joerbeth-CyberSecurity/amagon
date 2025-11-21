import { useState } from 'react'
import { searchPatients } from '@/services/patientService'
import type { Patient } from '@/types/patient'
import { Loading } from '@/components/ui/Loading'
import { formatDate, formatCPF } from '@/utils/formatters'
import { DashboardLayout } from './layout/DashboardLayout'
import './SearchScreen.css'

interface SearchScreenProps {
  onSelectPatient: (patient: Patient) => void
  onLogout?: () => void
  currentUserName?: string
  onToggleTheme: () => void
  theme: 'light' | 'dark'
}

export function SearchScreen({ onSelectPatient, onLogout, currentUserName, onToggleTheme, theme }: SearchScreenProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    const term = searchTerm.trim()
    
    if (term.length < 2) {
      setError('Digite pelo menos 2 caracteres para buscar')
      return
    }

    setLoading(true)
    setError(null)
    setHasSearched(false)

    try {
      const results = await searchPatients(term)
      setPatients(results)
      setHasSearched(true)
    } catch (err) {
      setError('Erro ao buscar pacientes. Tente novamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setPatients([])
    setHasSearched(false)
    setError(null)
  }

  return (
    <DashboardLayout
      title="Sistema de Consulta de Pacientes"
      subtitle="Dashboard Clínico • Acompanhe indicadores e localize pacientes rapidamente"
      theme={theme}
      currentUserName={currentUserName}
      onLogout={onLogout}
      onToggleTheme={onToggleTheme}
    >
      <section className="panel search-panel single-panel">
        <header className="panel-header">
          <div>
            <h2>Central de Pacientes</h2>
            <p>Pesquise por nome ou CPF para abrir o prontuário completo.</p>
          </div>
          <button
            className="ghost-btn"
            type="button"
            onClick={handleClearSearch}
          >
            Limpar Campo
          </button>
        </header>

        <div className="search-bar">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite o nome ou CPF do paciente..."
            autoComplete="off"
          />
          <button onClick={handleSearch} disabled={loading}>
            🔍 Buscar
          </button>
        </div>

        {error && <div className="inline-error">{error}</div>}
      </section>

      {loading && (
        <div className="panel single-panel">
          <Loading message="Buscando..." />
        </div>
      )}

      {!loading && hasSearched && (
        <section className="panel results-panel single-panel">
          <header>
            <div>
              <h2>Resultados da Busca</h2>
              <p>
                {patients.length
                  ? `${patients.length} paciente(s) encontrados`
                  : 'Nenhum paciente encontrado'}
              </p>
            </div>
          </header>

          {patients.length === 0 ? (
            <p className="no-results">Nenhum paciente encontrado</p>
          ) : (
            <div className="results-list">
              {patients.map((patient) => (
                <div key={patient.idpessoa} className="patient-card">
                  <div className="patient-info">
                    <h3>{patient.nomepessoa || 'Sem nome'}</h3>
                    <p><strong>CPF:</strong> {formatCPF(patient.cpf)}</p>
                    <p><strong>Data Nasc:</strong> {formatDate(patient.dtnasc)}</p>
                    <p><strong>Email:</strong> {patient.email || '-'}</p>
                  </div>
                  <button
                    className="view-btn"
                    onClick={() => onSelectPatient(patient)}
                  >
                    Ver Detalhes →
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </DashboardLayout>
  )
}
