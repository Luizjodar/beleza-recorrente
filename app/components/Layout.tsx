'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useTema } from '../lib/tema'

const navGroups = [
  {
    label: 'Principal',
    items: [
      { label: 'Faturamento', path: '/dashboard', icon: '📊' },
      { label: 'Agenda', path: '/agenda', icon: '📅' },
    ]
  },
  {
    label: 'Clientes',
    items: [
      { label: 'Assinantes', path: '/assinantes', icon: '👥' },
      { label: 'Clientes', path: '/clientes', icon: '📋' },
      { label: 'Pacotes', path: '/pacotes', icon: '🎁' },
      { label: 'Promocoes', path: '/promocoes', icon: '🏷️' },
    ]
  },
  {
    label: 'Financeiro',
    items: [
      { label: 'Pagamentos', path: '/pagamentos', icon: '💳' },
      { label: 'Despesas', path: '/despesas', icon: '📉' },
    ]
  },
  {
    label: 'Gestao',
    items: [
      { label: 'Funcionarios', path: '/funcionarios', icon: '👤' },
      { label: 'Produtos', path: '/produtos', icon: '📦' },
    ]
  },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { tema, toggleTema, t } = useTema()
  const [nomeSalao, setNomeSalao] = useState('Meu Salao')
  const [sidebarAberta, setSidebarAberta] = useState(false)

  useEffect(() => {
    async function carregarNome() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: salao } = await supabase.from('saloes').select('nome').eq('user_id', user.id).single()
      if (salao?.nome) setNomeSalao(salao.nome)
    }
    carregarNome()
  }, [])

  function navegar(path: string) {
    router.push(path)
    setSidebarAberta(false)
  }

  const SidebarContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: `0.5px solid ${t.navBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: t.text, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ width: 11, height: 11, background: t.navBg, borderRadius: 2 }} />
          </div>
          <div>
            <p style={{ color: t.text, fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1 }}>Beleza</p>
            <p style={{ color: t.textFaint, fontSize: 10, margin: 0, lineHeight: 1.4 }}>Recorrente</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navGroups.map(group => (
          <div key={group.label}>
            <p style={{ color: t.textFaint, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', margin: '8px 0 4px 8px' }}>{group.label}</p>
            {group.items.map(item => {
              const ativo = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path))
              return (
                <button key={item.path} onClick={() => navegar(item.path)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, background: ativo ? t.bg : 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background 0.1s' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ color: ativo ? t.text : t.textMuted, fontSize: 13, fontWeight: ativo ? 500 : 400 }}>{item.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Nome do salao */}
      <div style={{ padding: '12px 16px', borderTop: `0.5px solid ${t.navBorder}` }}>
        <p style={{ color: t.textFaint, fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeSalao}</p>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        .layout-sidebar { display: flex !important; }
        .layout-topbar-menu { display: none !important; }
        .layout-main { margin-left: 220px !important; }
        @media (max-width: 768px) {
          .layout-sidebar { display: none !important; }
          .layout-topbar-menu { display: flex !important; }
          .layout-main { margin-left: 0 !important; }
        }
      `}</style>

      {/* Sidebar fixa — desktop */}
      <div className="layout-sidebar" style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 220, background: t.navBg, borderRight: `0.5px solid ${t.navBorder}`, zIndex: 50, flexDirection: 'column' }}>
        <SidebarContent />
      </div>

      {/* Sidebar mobile overlay */}
      {sidebarAberta && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
          <div onClick={() => setSidebarAberta(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 240, background: t.navBg, borderRight: `0.5px solid ${t.navBorder}` }}>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Topbar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 52, background: t.navBg, borderBottom: `0.5px solid ${t.navBorder}`, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 0 240px' }}>
        {/* Botao hamburger mobile */}
        <button className="layout-topbar-menu" onClick={() => setSidebarAberta(true)}
          style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.text, borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>
          ☰
        </button>

        <div style={{ flex: 1 }} />

        {/* Acoes da topbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Toggle tema */}
          <button onClick={toggleTema}
            style={{ background: t.bg, border: `0.5px solid ${t.border}`, borderRadius: 20, padding: '5px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13 }}>{tema === 'claro' ? '🌙' : '☀️'}</span>
            <span style={{ fontSize: 11, color: t.textMuted }}>{tema === 'claro' ? 'Escuro' : 'Claro'}</span>
          </button>

          {/* Configuracoes */}
          <button onClick={() => router.push('/configuracoes')}
            title="Configuracoes"
            style={{ background: pathname === '/configuracoes' ? t.bg : 'none', border: `0.5px solid ${pathname === '/configuracoes' ? t.border : 'transparent'}`, color: t.textMuted, borderRadius: 8, padding: '6px 10px', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>
            ⚙️
          </button>

          {/* Sair */}
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
            Sair
          </button>
        </div>
      </div>

      {/* Conteudo principal */}
      <div className="layout-main" style={{ paddingTop: 52, minHeight: '100vh', background: t.bg }}>
        {children}
      </div>
    </>
  )
}
