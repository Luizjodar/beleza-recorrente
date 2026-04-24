'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useTema } from '../lib/tema'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { tema, toggleTema, t } = useTema()
  const [nomeSalao, setNomeSalao] = useState('Meu Salao')

  useEffect(() => {
    async function carregarNome() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: salao } = await supabase
        .from('saloes').select('nome').eq('user_id', user.id).single()
      if (salao?.nome) setNomeSalao(salao.nome)
    }
    carregarNome()
  }, [])

  const nav = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Pacotes', path: '/pacotes' },
    { label: 'Assinantes', path: '/assinantes' },
    { label: 'Pagamentos', path: '/pagamentos' },
    { label: 'Promocoes', path: '/promocoes' },
    { label: 'Configuracoes', path: '/configuracoes' },
  ]

  return (
    <div style={{
      background: t.navBg, borderBottom: `0.5px solid ${t.navBorder}`,
      padding: '0 32px', height: 56, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, background: t.text, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 10, height: 10, background: t.navBg, borderRadius: 2 }} />
        </div>
        <span style={{ color: t.text, fontSize: 13, fontWeight: 500, letterSpacing: 0.5 }}>
          {nomeSalao}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {nav.map(item => (
          <button key={item.path} onClick={() => router.push(item.path)}
            style={{
              background: pathname === item.path ? t.bg : 'none',
              color: pathname === item.path ? t.text : t.textMuted,
              border: 'none', padding: '6px 14px', borderRadius: 7,
              fontSize: 12, cursor: 'pointer',
              fontWeight: pathname === item.path ? 500 : 400,
            }}>
            {item.label}
          </button>
        ))}

        <button onClick={toggleTema}
          style={{ background: t.bg, border: `0.5px solid ${t.border}`, borderRadius: 20, padding: '5px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          <span style={{ fontSize: 14 }}>{tema === 'claro' ? '🌙' : '☀️'}</span>
          <span style={{ fontSize: 11, color: t.textMuted }}>{tema === 'claro' ? 'Escuro' : 'Claro'}</span>
        </button>

        <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
          style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, padding: '6px 14px', borderRadius: 7, fontSize: 12, cursor: 'pointer', marginLeft: 4 }}>
          Sair
        </button>
      </div>
    </div>
  )
}
