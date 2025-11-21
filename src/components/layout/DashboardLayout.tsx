import { ReactNode } from 'react'
import './DashboardLayout.css'

interface DashboardLayoutProps {
  title: string
  subtitle?: string
  headerActions?: ReactNode
  children: ReactNode
  theme?: 'light' | 'dark'
  currentUserName?: string
  onLogout?: () => void
  onToggleTheme?: () => void
}

const SIDE_NAV_ITEMS = [
  { label: 'Dashboard', icon: '📊' },
]

export function DashboardLayout({
  title,
  subtitle,
  headerActions,
  children,
  theme = 'light',
  currentUserName,
  onLogout,
  onToggleTheme,
}: DashboardLayoutProps) {
  return (
    <div className={`dashboard-layout ${theme === 'dark' ? 'is-dark' : ''}`}>
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <img src="/logo2.png" alt="Logo Sistema" />
          </div>
        </div>

        <nav className="sidebar-nav">
          {SIDE_NAV_ITEMS.map((item) => (
            <button key={item.label} className="nav-item" type="button">
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {onToggleTheme && (
            <button
              type="button"
              className="sidebar-theme-toggle"
              onClick={onToggleTheme}
            >
              <span className="theme-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
              <span>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
            </button>
          )}

          <div className="sidebar-user">
            <div className="user-info">
              <strong>{currentUserName || 'Usuário'}</strong>
              {onLogout && (
                <button type="button" onClick={onLogout}>
                  Sair
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="header-actions">{headerActions}</div>
        </header>

        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  )
}


