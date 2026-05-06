'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  BarChart3, CalendarDays, ClipboardList, CreditCard, Gift,
  LogOut, Menu, Moon, Package, Settings, Sparkles, Sun,
  Tags, TrendingDown, UserRound, UsersRound, type LucideIcon,
} from 'lucide-react'
import { supabase } from '@/app/lib/supabase'
import { useTema } from '@/app/lib/tema'

type ThemeTokens = Record<string, string>
type NavItem = { label: string; path: string; icon: LucideIcon }
type NavGroup = { label: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  { label: 'Principal', items: [
    { label: 'Faturamento', path: '/dashboard', icon: BarChart3 },
    { label: 'Agenda', path: '/agenda', icon: CalendarDays },
  ]},
  { label: 'Clientes', items: [
    { label: 'Assinantes', path: '/assinantes', icon: UsersRound },
    { label: 'Clientes', path: '/clientes', icon: ClipboardList },
    { label: 'Pacotes', path: '/pacotes', icon: Gift },
    { label: 'Promocoes', path: '/promocoes', icon: Tags },
  ]},
  { label: 'Financeiro', items: [
    { label: 'Pagamentos', path: '/pagamentos', icon: CreditCard },
    { label: 'Despesas', path: '/despesas', icon: TrendingDown },
  ]},
  { label: 'Gestao', items: [
    { label: 'Funcionarios', path: '/funcionarios', icon: UserRound },
    { label: 'Produtos', path: '/produtos', icon: Package },
  ]},
]

const bottomNavItems: NavItem[] = [
  { label: 'Inicio', path: '/dashboard', icon: BarChart3 },
  { label: 'Agenda', path: '/agenda', icon: CalendarDays },
  { label: 'Assinantes', path: '/assinantes', icon: UsersRound },
  { label: 'Pacotes', path: '/pacotes', icon: Gift },
  { label: 'Menu', path: '__menu__', icon: Menu },
]

function SidebarContent({ nomeSalao, pathname, t, navegar }: {
  nomeSalao: string; pathname: string; t: ThemeTokens; navegar: (path: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px 16px 16px', borderBottom: `0.5px solid ${t.navBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, background: t.text, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles size={15} strokeWidth={2.2} color={t.navBg} />
          </div>
          <div>
            <p style={{ color: t.text, fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1 }}>Beleza</p>
            <p style={{ color: t.textFaint, fontSize: 10, margin: 0, lineHeight: 1.4 }}>Recorrente</p>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navGroups.map(group => (
          <div key={group.label}>
            <p style={{ color: t.textFaint, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', margin: '8px 0 4px 8px' }}>{group.label}</p>
            {group.items.map(item => {
              const ativo = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path))
              const Icon = item.icon
              return (
                <button key={item.path} onClick={() => navegar(item.path)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, background: ativo ? t.bg : 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                  <Icon size={16} strokeWidth={1.8} color={ativo ? t.text : t.textFaint} style={{ flexShrink: 0 }} />
                  <span style={{ color: ativo ? t.text : t.textMuted, fontSize: 13, fontWeight: ativo ? 500 : 400 }}>{item.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 16px', borderTop: `0.5px solid ${t.navBorder}` }}>
        <p style={{ color: t.textFaint, fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeSalao}</p>
      </div>
    </div>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { tema, toggleTema, t } = useTema()
  const [nomeSalao, setNomeSalao] = useState('Meu Salao')
  const [menuAberto, setMenuAberto] = useState(false)

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
    if (path === '__menu__') { setMenuAberto(true); return }
    router.push(path)
    setMenuAberto(false)
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .l-sidebar { display: flex !important; }
        .l-topbar { padding-left: 236px !important; }
        .l-main { margin-left: 220px !important; padding-bottom: 0 !important; }
        .l-bottom-nav { display: none !important; }
        .l-logo-mobile { display: none !important; }
        @media (max-width: 768px) {
          .l-sidebar { display: none !important; }
          .l-topbar { padding-left: 16px !important; }
          .l-main { margin-left: 0 !important; padding-bottom: 72px !important; }
          .l-bottom-nav { display: flex !important; }
          .l-logo-mobile { display: flex !important; }
        }
      `}</style>

      {/* Sidebar desktop */}
      <div className="l-sidebar"
        style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 220, background: t.navBg, borderRight: `0.5px solid ${t.navBorder}`, zIndex: 50, flexDirection: 'column' }}>
        <SidebarContent nomeSalao={nomeSalao} pathname={pathname} t={t} navegar={navegar} />
      </div>

      {/* Drawer mobile */}
      {menuAberto && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div onClick={() => setMenuAberto(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: t.navBg, borderRadius: '20px 20px 0 0', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ width: 40, height: 4, background: t.border, borderRadius: 2, margin: '12px auto 0' }} />
            <SidebarContent nomeSalao={nomeSalao} pathname={pathname} t={t} navegar={navegar} />
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="l-topbar"
        style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 52, background: t.navBg, borderBottom: `0.5px solid ${t.navBorder}`, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 16 }}>
        <div className="l-logo-mobile" style={{ alignItems: 'center', gap: 8, paddingLeft: 16 }}>
          <div style={{ width: 28, height: 28, background: t.text, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={13} strokeWidth={2.2} color={t.navBg} />
          </div>
          <span style={{ color: t.text, fontSize: 13, fontWeight: 600 }}>Beleza Recorrente</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={toggleTema}
            style={{ background: t.bg, border: `0.5px solid ${t.border}`, borderRadius: 20, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            {tema === 'claro' ? <Moon size={14} strokeWidth={1.8} color={t.textMuted} /> : <Sun size={14} strokeWidth={1.8} color={t.textMuted} />}
            <span style={{ fontSize: 11, color: t.textMuted }}>{tema === 'claro' ? 'Escuro' : 'Claro'}</span>
          </button>
          <button onClick={() => router.push('/configuracoes')}
            style={{ background: pathname === '/configuracoes' ? t.bg : 'none', border: `0.5px solid ${pathname === '/configuracoes' ? t.border : 'transparent'}`, color: t.textMuted, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', lineHeight: 0 }}>
            <Settings size={16} strokeWidth={1.8} />
          </button>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', lineHeight: 0 }}>
            <LogOut size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="l-main" style={{ paddingTop: 52, minHeight: '100vh', background: t.bg }}>
        {children}
      </div>

      {/* Bottom nav mobile */}
      <div className="l-bottom-nav"
        style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 64, background: t.navBg, borderTop: `0.5px solid ${t.navBorder}`, zIndex: 40, alignItems: 'center', justifyContent: 'space-around', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {bottomNavItems.map(item => {
          const ativo = item.path !== '__menu__' && (pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path)))
          const Icon = item.icon
          return (
            <button key={item.path} onClick={() => navegar(item.path)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', flex: 1 }}>
              <Icon size={22} strokeWidth={1.8} color={ativo ? t.text : t.textFaint} />
              <span style={{ fontSize: 9, color: ativo ? t.text : t.textFaint, fontWeight: ativo ? 600 : 400, letterSpacing: 0.3 }}>
                {item.label.toUpperCase()}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
