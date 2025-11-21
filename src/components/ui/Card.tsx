import { ReactNode } from 'react'
import './Card.css'

interface CardProps {
  title?: string
  icon?: string
  children: ReactNode
  className?: string
}

export function Card({ title, icon, children, className = '' }: CardProps) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <h3 className="card-title">
          {icon && <span className="card-icon">{icon}</span>}
          {title}
        </h3>
      )}
      <div className="card-content">
        {children}
      </div>
    </section>
  )
}
