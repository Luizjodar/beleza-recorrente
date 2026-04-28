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
  const [menuAberto, setMenuAberto] = useState(false)

  const nav = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Agenda', path: '/agenda' },
    { label: 'Pacotes', path: '/pacotes' },
    { label: 'Assinantes', path: '/assinantes' },
    { label: 'Pagamentos', path: '/pagamentos' },
    { label: 'Clientes', path: '/clientes' },
    { label: 'Funcionarios', path: '/funcionarios' },
    { label: 'Produtos', path: '/produtos' },
    { label: 'Despesas', path: '/despesas' },
    { label: 'Promocoes', path: '/promocoes' },
    { label: 'Configuracoes', path: '/configuracoes' },
  ]

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

  function navegar(path: string) {
    router.push(path)
    setMenuAberto(false)
  }

  return (
    <>
      <style>{`
        .nav-desktop { display: flex; }
        .nav-hamburger { display: none; }
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>

      <div style={{ background: t.navBg, borderBottom: `0.5px solid ${t.navBorder}`, padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: t.text, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 10, height: 10, background: t.navBg, borderRadius: 2 }} />
          </div>
          <span style={{ color: t.text, fontSize: 13, fontWeight: 500, letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
            {nomeSalao}
          </span>
        </div>

        <div className="nav-desktop" style={{ alignItems: 'center', gap: 2 }}>
          {nav.map(item => (
            <button key={item.path} onClick={() => navegar(item.path)}
              style={{ background: pathname === item.path ? t.bg : 'none', color: pathname === item.path ? t.text : t.textMuted, border: 'none', padding: '6px 10px', borderRadius: 7, fontSize: 11, cursor: 'pointer', fontWeight: pathname === item.path ? 500 : 400 }}>
              {item.label}
            </button>
          ))}
          <button onClick={toggleTema}
            style={{ background: t.bg, border: `0.5px solid ${t.border}`, borderRadius: 20, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, marginLeft: 6 }}>
            <span style={{ fontSize: 13 }}>{tema === 'claro' ? '🌙' : '☀️'}</span>
            <span style={{ fontSize: 11, color: t.textMuted }}>{tema === 'claro' ? 'Escuro' : 'Claro'}</span>
          </button>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, padding: '6px 10px', borderRadius: 7, fontSize: 11, cursor: 'pointer', marginLeft: 4 }}>
            Sair
          </button>
        </div>

        <div className="nav-hamburger" style={{ alignItems: 'center', gap: 8 }}>
          <button onClick={toggleTema}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: 4 }}>
            {tema === 'claro' ? '🌙' : '☀️'}
          </button>
          <button onClick={() => setMenuAberto(!menuAberto)}
            style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.text, borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
            {menuAberto ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {menuAberto && (
        <div style={{ position: 'fixed', top: 56, left: 0, right: 0, bottom: 0, background: t.navBg, zIndex: 99, padding: 24, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          {nav.map(item => (
            <button key={item.path} onClick={() => navegar(item.path)}
              style={{ background: pathname === item.path ? t.bg : 'none', color: pathname === item.path ? t.text : t.textMuted, border: `0.5px solid ${pathname === item.path ? t.border : 'transparent'}`, padding: '14px 16px', borderRadius: 12, fontSize: 14, cursor: 'pointer', textAlign: 'left', fontWeight: pathname === item.path ? 500 : 400 }}>
              {item.label}
            </button>
          ))}
          <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: `0.5px solid ${t.border}` }}>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
              style={{ background: 'none', border: `0.5px solid ${t.border}`, color: '#ef4444', padding: '12px 16px', borderRadius: 12, fontSize: 14, cursor: 'pointer', width: '100%', textAlign: 'left' }}>
              Sair
            </button>
          </div>
        </div>
      )}
    </>
  )
}
