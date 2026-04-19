'use client'

import { createContext, useContext, useEffect, useState } from 'react'

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
  const [tema, setTema] = useState<Tema>('claro')

  useEffect(() => {
    const salvo = localStorage.getItem('tema') as Tema
    if (salvo) setTema(salvo)
  }, [])

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
    bg: '#0f0f0f',
    bgCard: '#141414',
    bgInput: '#1a1a1a',
    border: '#222222',
    borderCard: '#222222',
    text: '#eeeeee',
    textMuted: '#666666',
    textFaint: '#333333',
    navBg: '#0f0f0f',
    navBorder: '#1e1e1e',
    accentBar: '#ffffff',
    rowHover: '#1a1a1a',
    rowBorder: '#1a1a1a',
    badgeAtivo: '#0d1f0d',
    badgeAtivoText: '#4ade80',
    badgeCancelado: '#1f0d0d',
    badgeCanceladoText: '#f87171',
    badgeInadimplente: '#1f1a0d',
    badgeInadimplenteText: '#fbbf24',
    badgePausado: '#1a1a1a',
    badgePausadoText: '#666666',
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
