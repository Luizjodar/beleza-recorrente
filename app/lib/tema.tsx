'use client'

import { createContext, useContext, useState } from 'react'

type Tema = 'claro' | 'escuro'

interface TemaContextType {
  tema: Tema
  toggleTema: () => void
  t: {
    bg: string
    bgCard: string
    bgInput: string
    border: string
    borderCard: string
    text: string
    textMuted: string
    textFaint: string
    navBg: string
    navBorder: string
    accentBar: string
    rowHover: string
    rowBorder: string
    badgeAtivo: string
    badgeAtivoText: string
    badgeCancelado: string
    badgeCanceladoText: string
    badgeInadimplente: string
    badgeInadimplenteText: string
    badgePausado: string
    badgePausadoText: string
  }
}

const TemaContext = createContext<TemaContextType | null>(null)

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    if (typeof window !== 'undefined') {
      const salvo = localStorage.getItem('tema') as Tema
      if (salvo === 'claro' || salvo === 'escuro') return salvo
    }
    return 'claro'
  })

  function toggleTema() {
    const novo = tema === 'claro' ? 'escuro' : 'claro'
    setTema(novo)
    localStorage.setItem('tema', novo)
  }

  const claro = {
    bg: '#f5f4f0',
    bgCard: '#ffffff',
    bgInput: '#fafaf9',
    border: '#ece9e3',
    borderCard: '#ece9e3',
    text: '#111111',
    textMuted: '#888888',
    textFaint: '#bbbbbb',
    navBg: '#ffffff',
    navBorder: '#ece9e3',
    accentBar: '#111111',
    rowHover: '#faf9f7',
    rowBorder: '#f5f3ef',
    badgeAtivo: '#f0fdf4',
    badgeAtivoText: '#16a34a',
    badgeCancelado: '#fef2f2',
    badgeCanceladoText: '#dc2626',
    badgeInadimplente: '#fffbeb',
    badgeInadimplenteText: '#d97706',
    badgePausado: '#f5f4f0',
    badgePausadoText: '#888888',
  }

  const escuro = {
    bg: '#1c1c1e',
    bgCard: '#2c2c2e',
    bgInput: '#3a3a3c',
    border: '#3a3a3c',
    borderCard: '#3a3a3c',
    text: '#f5f5f7',
    textMuted: '#aeaeb2',
    textFaint: '#6e6e73',
    navBg: '#1c1c1e',
    navBorder: '#3a3a3c',
    accentBar: '#f5f5f7',
    rowHover: '#2c2c2e',
    rowBorder: '#3a3a3c',
    badgeAtivo: '#1a3a2a',
    badgeAtivoText: '#4ade80',
    badgeCancelado: '#3a1a1a',
    badgeCanceladoText: '#f87171',
    badgeInadimplente: '#3a2e1a',
    badgeInadimplenteText: '#fbbf24',
    badgePausado: '#2c2c2e',
    badgePausadoText: '#aeaeb2',
  }

  return (
    <TemaContext.Provider value={{ tema, toggleTema, t: tema === 'claro' ? claro : escuro }}>
      {children}
    </TemaContext.Provider>
  )
}

export function useTema() {
  const ctx = useContext(TemaContext)
  if (!ctx) throw new Error('useTema deve ser usado dentro de TemaProvider')
  return ctx
}
