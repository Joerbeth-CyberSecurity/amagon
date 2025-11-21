import { useState, useEffect, ReactNode } from 'react'
import type { Patient } from '@/types/patient'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  getPatientById,
  getPatientAppointments,
  getPatientClinicalData,
  getPatientFinancialData,
  getPatientClinicalTeam,
  getPatientAnamnese,
  getPatientImages,
  getPatientOrcamentoImages,
  getPatientOrthodontics
} from '@/services/patientService'
import { formatDate, formatCurrency, formatCPF } from '@/utils/formatters'
import './PatientScreen.css'

interface PatientScreenProps {
  patient: Patient
  onBack: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  currentUserName?: string
  onLogout?: () => void
}

interface DataItemProps {
  label: string
  value: ReactNode
  fullWidth?: boolean
}

const DataItem = ({ label, value, fullWidth = false }: DataItemProps) => (
  <div className={`data-item${fullWidth ? ' full-width' : ''}`}>
    <label>{label}</label>
    <span>{value}</span>
  </div>
)

export function PatientScreen({ patient, onBack, theme, onToggleTheme, currentUserName, onLogout }: PatientScreenProps) {
  const [loading, setLoading] = useState(false)
  const [patientData,setPatientData] = useState<any>(null)

  useEffect(() => {
    loadPatientData()
  }, [patient.idpessoa])

  const loadPatientData = async () => {
    setLoading(true)
    
    try {
      const [
        fullPatient,
        appointments,
        clinical,
        financial,
        clinicalTeam,
        anamnese,
        images,
        orcamentoImages,
        orthodontics
      ] = await Promise.all([
        getPatientById(patient.idpessoa),
        getPatientAppointments(patient.idpessoa),
        getPatientClinicalData(patient.idpessoa),
        getPatientFinancialData(patient.idpessoa),
        getPatientClinicalTeam(patient.idpessoa),
        getPatientAnamnese(patient.idpessoa).catch(() => null),
        getPatientImages(patient.idpessoa).catch(() => []),
        getPatientOrcamentoImages(patient.idpessoa).catch(() => []),
        getPatientOrthodontics(patient.idpessoa).catch(() => [])
      ])

      setPatientData({
        patient: fullPatient,
        appointments,
        clinical,
        financial,
        clinicalTeam,
        anamnese,
        images,
        orcamentoImages,
        orthodontics
      })
    } catch (error) {
      console.error('Erro ao carregar dados do paciente:', error)
      alert('Erro ao carregar dados do paciente')
    } finally {
      setLoading(false)
    }
  }

  const getSectionsHtml = () => {
    if (typeof document === 'undefined') return ''
    const container = document.querySelector('.patient-main')
    return container ? container.innerHTML : ''
  }

  const buildReportHtml = () => {
    if (!patientData) return ''
    const { patient: p } = patientData
    const logoUrl = new URL('/logo.png', window.location.origin).toString()
    const sectionsHtml = getSectionsHtml() || '<p>Dados indisponíveis</p>'

    const styles = `
      body {
        font-family: 'Segoe UI', Arial, sans-serif;
        padding: 32px;
        color: #111;
        background: linear-gradient(180deg, #f7f8ff 0%, #f1f5ff 100%);
      }
      .report-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .report-header img {
        width: 120px;
        height: 120px;
        object-fit: contain;
        border-radius: 50%;
        box-shadow: 0 15px 35px rgba(15, 23, 42, 0.15);
      }
      .report-header h1 {
        margin: 0;
        font-size: 28px;
        color: #0f172a;
      }
      .report-wrapper {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .card {
        background: #ffffff;
        border-radius: 18px;
        padding: 22px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 15px 25px rgba(15, 23, 42, 0.08);
      }
      .card-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 16px;
        border-bottom: 2px solid #a78bfa;
        padding-bottom: 8px;
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      .data-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
      }
      .data-item {
        background: #f8fafc;
        border-radius: 12px;
        padding: 12px;
      }
      .data-item label {
        font-size: 11px;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .data-item span {
        font-size: 15px;
        font-weight: 600;
        color: #0f172a;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
        font-size: 14px;
      }
      th, td {
        border: 1px solid #e2e8f0;
        padding: 8px;
        text-align: left;
      }
      th {
        background: #eef2ff;
        color: #312e81;
      }
      .clinical-item {
        border: 1px solid #e2e8f0;
        border-left: 4px solid #6366f1;
        padding: 12px;
        border-radius: 12px;
        margin-bottom: 10px;
      }
    `

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatório do Paciente</title>
          <style>${styles}</style>
        </head>
        <body>
          <header class="report-header">
            <div>
              <h1>Sistema de Consulta de Pacientes</h1>
              <p>${p.nomepessoa || 'Paciente'} • CPF ${formatCPF(p.cpf)}</p>
            </div>
            <img src="${logoUrl}" alt="Logo do Sistema" />
          </header>
          <main class="report-wrapper">
            ${sectionsHtml}
          </main>
        </body>
      </html>
    `
  }

  const waitForImages = (frame: HTMLIFrameElement) => {
    return new Promise<void>((resolve) => {
      const doc = frame.contentDocument
      if (!doc) {
        resolve()
        return
      }

      const images = Array.from(doc.images)
      if (images.length === 0) {
        resolve()
        return
      }

      let loaded = 0
      const markLoaded = () => {
        loaded += 1
        if (loaded >= images.length) {
          resolve()
        }
      }

      images.forEach((img) => {
        if (img.complete) {
          markLoaded()
        } else {
          img.addEventListener('load', markLoaded, { once: true })
          img.addEventListener('error', markLoaded, { once: true })
        }
      })

      window.setTimeout(resolve, 3000)
    })
  }

  const renderReportInFrame = () => {
    const html = buildReportHtml()

    return new Promise<HTMLIFrameElement>((resolve) => {
      const frame = document.createElement('iframe')
      frame.style.position = 'fixed'
      frame.style.opacity = '0'
      frame.style.pointerEvents = 'none'
      frame.style.width = '0'
      frame.style.height = '0'
      frame.style.border = '0'
      document.body.appendChild(frame)

      const doc = frame.contentWindow?.document
      if (doc) {
        doc.open()
        doc.write(html)
        doc.close()
        requestAnimationFrame(() => {
          waitForImages(frame).then(() => resolve(frame))
        })
      } else {
        resolve(frame)
      }
    })
  }

  const printFrame = async () => {
    const frame = await renderReportInFrame()
    const frameWindow = frame.contentWindow

    if (frameWindow) {
      frameWindow.focus()
      frameWindow.print()
    }

    setTimeout(() => {
      frame.remove()
    }, 1000)
  }

  const handleExportPdf = () => {
    void printFrame()
  }

  const handlePrint = () => {
    void printFrame()
  }

  const headerActions = (
    <div className="patient-layout-actions">
      <button onClick={onBack} className="patient-back-btn" type="button">
        ← Voltar para busca
      </button>
      <div className="patient-action-buttons">
        <button type="button" onClick={handleExportPdf}>Exportar (PDF)</button>
        <button type="button" onClick={handlePrint}>Imprimir</button>
      </div>
    </div>
  )

  if (loading) {
    return (
      <DashboardLayout
        title="Carregando dados..."
        subtitle="Buscando informações completas do paciente"
        headerActions={headerActions}
      >
        <div className="panel">
          <Loading message="Carregando informações do paciente..." />
        </div>
      </DashboardLayout>
    )
  }

  if (!patientData) {
    return (
      <DashboardLayout
        title="Erro ao carregar dados"
        subtitle="Tente novamente mais tarde"
        headerActions={headerActions}
      >
        <div className="panel">
          <p className="no-data">Não foi possível recuperar as informações.</p>
        </div>
      </DashboardLayout>
    )
  }

  const { patient: p, appointments, clinical, financial, clinicalTeam, anamnese, images, orcamentoImages, orthodontics } = patientData

  return (
    <DashboardLayout
      title={p.nomepessoa || 'Paciente'}
      subtitle={`CPF ${formatCPF(p.cpf)} • Nasc. ${formatDate(p.dtnasc)}`}
      headerActions={headerActions}
      theme={theme}
      currentUserName={currentUserName}
      onLogout={onLogout}
      onToggleTheme={onToggleTheme}
    >
      <div className="patient-main">
        <div className="sections-grid">
          {/* Cadastro */}
          <Card title="Cadastro" icon="📋">
            <div className="data-grid">
              <DataItem label="Nome" value={p.nomepessoa || '-'} />
              <DataItem label="CPF" value={formatCPF(p.cpf)} />
              <DataItem label="Data de Nascimento" value={formatDate(p.dtnasc)} />
              <DataItem label="Email" value={p.email || '-'} />
              <DataItem label="Endereço" value={p.endereco || '-'} />
            </div>
          </Card>

          {/* Agendamentos */}
          <Card title="Agendamentos" icon="📅">
            {appointments.length === 0 ? (
              <p className="no-data">Nenhum agendamento encontrado</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Hora</th>
                      <th>Dentista</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.slice(0, 10).map((apt: any) => (
                      <tr key={apt.idmarcacao}>
                        <td>{formatDate(apt.dtmarcacao)}</td>
                        <td>{apt.hrmarcacao || '-'}</td>
                        <td>{apt.nome_dentista || '-'}</td>
                        <td>{apt.status || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Corpo Clínico */}
          <Card title="Corpo Clínico" icon="🧑‍⚕️">
            {clinicalTeam.length === 0 ? (
              <p className="no-data">Nenhum profissional associado</p>
            ) : (
              <div className="clinical-team-grid">
                {clinicalTeam.map((member: any) => (
                  <div key={member.iddentista} className="clinical-team-card">
                    <h3>{member.nome_dentista || 'Profissional'}</h3>
                    <p><strong>CRO:</strong> {member.cro || '-'}</p>
                    <p><strong>Sigla:</strong> {member.sigla || '-'}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Dados Clínicos */}
          <Card title="Dados Clínicos" icon="🦷">
            {clinical.length === 0 ? (
              <p className="no-data">Nenhum dado clínico encontrado</p>
            ) : (
              <div className="section-card-list">
                {clinical.slice(0, 5).map((orc: any) => {
                  const tipoContrato =
                    orc.tpregistro === 0 ? 'Clínico' :
                    orc.tpregistro === 1 ? 'Ortodôntico' : 'Mensal'

                  return (
                    <div key={orc.idorcamento} className="section-card">
                      <div className="section-card-header">
                        <h4>Orçamento #{orc.idorcamento}</h4>
                        <span className="section-card-tag">{tipoContrato}</span>
                      </div>
                      <div className="data-grid">
                        <DataItem label="Data" value={formatDate(orc.dtorcamento)} />
                        <DataItem label="Dentista" value={orc.nome_dentista || '-'} />
                        <DataItem label="Valor Total" value={formatCurrency(orc.valortotal)} />
                        <DataItem label="Status" value={orc.status || '-'} />
                      </div>

                      {orc.itens && orc.itens.length > 0 && (
                        <div className="procedure-list">
                          <p className="section-card-subtitle">Procedimentos</p>
                          {orc.itens.map((item: any) => (
                            <div key={item.idorcaitem} className="procedure-card">
                              <div>
                                <strong>{item.item || '-'}</strong>
                                <span>{item.nome_procedimento || '-'}</span>
                              </div>
                              <div className="procedure-meta">
                                <span>{item.quantidade || 1}x</span>
                                <span>{formatCurrency(item.valor)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Financeiro */}
          <Card title="Financeiro" icon="💰">
            <div className="data-section">
              <h3>Contas a Receber</h3>
              {financial.lancamentos.length === 0 ? (
                <p className="no-data">Nenhum lançamento encontrado</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Vencimento</th>
                      <th>Valor</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financial.lancamentos.slice(0, 10).map((lanc: any) => (
                      <tr key={lanc.idlancamento}>
                        <td>{formatDate(lanc.dtvencimento)}</td>
                        <td>{formatCurrency(lanc.valorlancamento)}</td>
                        <td>{lanc.status || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="data-section" style={{ marginTop: '20px' }}>
              <h3>Recebimentos</h3>
              {financial.movimentacoes.length === 0 ? (
                <p className="no-data">Nenhum recebimento encontrado</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Valor</th>
                      <th>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financial.movimentacoes.slice(0, 10).map((mov: any) => (
                      <tr key={mov.idmovconta}>
                        <td>{formatDate(mov.dtmovimento)}</td>
                        <td>{formatCurrency(mov.valormovimento)}</td>
                        <td>{mov.iscredito === 1 || mov.iscredito === true ? 'Crédito' : 'Débito'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {/* Anamnese */}
          <Card title="Anamnese" icon="📝">
            {!anamnese ? (
              <p className="no-data">Nenhum dado de anamnese encontrado</p>
            ) : (
              (() => {
                const hasData =
                  anamnese.queixa ||
                  (anamnese.sofredoenca !== null && anamnese.sofredoenca !== undefined) ||
                  anamnese.qualdoenca ||
                  (anamnese.alergia !== null && anamnese.alergia !== undefined) ||
                  anamnese.qualalergia ||
                  anamnese.observacoes

                if (!hasData) {
                  return <p className="no-data">Nenhum dado de anamnese preenchido</p>
                }

                return (
                  <div className="data-grid">
                    {anamnese.queixa && (
                      <DataItem label="Queixa Principal" value={anamnese.queixa} fullWidth />
                    )}
                    {anamnese.sofredoenca !== null && anamnese.sofredoenca !== undefined && (
                      <DataItem
                        label="Sofre de Doença"
                        value={anamnese.sofredoenca === 1 ? 'Sim' : 'Não'}
                      />
                    )}
                    {anamnese.qualdoenca && (
                      <DataItem label="Qual Doença" value={anamnese.qualdoenca} />
                    )}
                    {anamnese.alergia !== null && anamnese.alergia !== undefined && (
                      <DataItem
                        label="Tem Alergia"
                        value={anamnese.alergia === 1 ? 'Sim' : 'Não'}
                      />
                    )}
                    {anamnese.qualalergia && (
                      <DataItem label="Qual Alergia" value={anamnese.qualalergia} />
                    )}
                    {anamnese.observacoes && (
                      <DataItem label="Observações" value={anamnese.observacoes} fullWidth />
                    )}
                  </div>
                )
              })()
            )}
          </Card>

          {/* Ortodontia */}
          <Card title="Ortodontia" icon="🦷">
            {orthodontics.length === 0 ? (
              <p className="no-data">Nenhum orçamento ortodôntico encontrado</p>
            ) : (
              <div className="section-card-list">
                {orthodontics.map((orc: any) => (
                  <div key={orc.idorcamento} className="section-card">
                    <div className="section-card-header">
                      <h4>Orçamento Ortodôntico #{orc.idorcamento}</h4>
                    </div>
                    <div className="data-grid">
                      <DataItem label="Data" value={formatDate(orc.dtorcamento)} />
                      <DataItem label="Dentista" value={orc.nome_dentista || '-'} />
                      <DataItem label="Data Início" value={formatDate(orc.dtinicio)} />
                      <DataItem label="Parcelas" value={orc.numparcelas || '-'} />
                      <DataItem label="Valor Total" value={formatCurrency(orc.valortotal)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Raios-X / Imagens */}
          <Card title="Raios-X / Imagens" icon="📷">
            {images.length === 0 && orcamentoImages.length === 0 ? (
              <p className="no-data">Nenhuma imagem encontrada</p>
            ) : (
              <div>
                {images.length > 0 && (
                  <div className="data-section">
                    <h3>Imagens do Paciente</h3>
                    <div className="section-card-list">
                      {images.slice(0, 5).map((img: any) => (
                        <div key={img.idpacienteimagem} className="section-card">
                          <div className="data-grid">
                            <DataItem label="Data" value={formatDate(img.data)} />
                            <DataItem label="Dentista" value={img.nome_dentista || '-'} />
                            <DataItem label="Histórico" value={img.historico || '-'} fullWidth />
                            <DataItem label="Dente" value={img.iddente || '-'} />
                            <DataItem label="Face" value={img.idface || '-'} />
                            <DataItem
                              label="Arquivo"
                              value={
                                img.pathimagem ? (
                                  <a
                                    href={img.pathimagem}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="data-link"
                                  >
                                    Ver imagem
                                  </a>
                                ) : '-'
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {orcamentoImages.length > 0 && (
                  <div className="data-section" style={{ marginTop: '20px' }}>
                    <h3>Imagens de Orçamentos</h3>
                    <div className="section-card-list">
                      {orcamentoImages.slice(0, 5).map((img: any) => (
                        <div key={img.idorcamentoimagem} className="section-card">
                          <div className="data-grid">
                            <DataItem label="Data" value={formatDate(img.data)} />
                            <DataItem
                              label="Orçamento"
                              value={`#${img.idorcamento} (${formatDate(img.dtorcamento)})`}
                            />
                            <DataItem label="Dentista" value={img.nome_dentista || '-'} />
                            <DataItem label="Histórico" value={img.historico || '-'} fullWidth />
                            <DataItem label="Dente" value={img.iddente || '-'} />
                            <DataItem label="Face" value={img.idface || '-'} />
                            <DataItem
                              label="Arquivo"
                              value={
                                img.pathimagem ? (
                                  <a
                                    href={img.pathimagem}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="data-link"
                                  >
                                    Ver imagem
                                  </a>
                                ) : '-'
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
