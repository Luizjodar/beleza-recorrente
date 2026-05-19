'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useTema } from '@/app/lib/tema'

type Notificacao = {
  id: string
  tipo: 'inadimplente' | 'aniversario' | 'estoque' | 'renovacao' | 'inativo'
  titulo: string
  descricao: string
  emoji: string
  cor: string
  path: string
  whatsapp?: string
  msgWhats?: string
}

export default function Notificacoes({ salaoId }: { salaoId: string | null }) {
  const { t } = useTema()
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [lidas, setLidas] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    const salvas = localStorage.getItem('notif_lidas')
    return salvas ? new Set(JSON.parse(salvas)) : new Set()
  })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!salaoId) return
    async function carregar() {
      const hoje = new Date()
      const hojStr = hoje.toISOString().split('T')[0]

      const [{ data: assinantes }, { data: produtos }] = await Promise.all([
        supabase.from('assinantes').select('id, nome, whatsapp, status, aniversario, ultimo_atendimento, pacotes(nome)').eq('salao_id', salaoId!),
        supabase.from('produtos').select('id, nome, estoque_atual, estoque_minimo').eq('salao_id', salaoId!).eq('ativo', true),
      ])

      const lista: Notificacao[] = []

      // Inadimplentes
      const inadimplentes = (assinantes || []).filter(a => a.status === 'inadimplente')
      inadimplentes.forEach(a => {
        lista.push({
          id: `inad-${a.id}`,
          tipo: 'inadimplente',
          titulo: `${a.nome} — Inadimplente`,
          descricao: `Mensalidade do plano ${(a.pacotes as unknown as { nome: string } | null)?.nome || 'atual'} em aberto`,
          emoji: '⚠️',
          cor: '#f59e0b',
          path: '/pagamentos',
          whatsapp: a.whatsapp,
          msgWhats: `Olá, ${a.nome?.split(' ')[0]}! 😊 Sua mensalidade está em aberto. Que tal renovar hoje?`,
        })
      })

      // Aniversariantes hoje
      const aniversariantes = (assinantes || []).filter(a => {
        if (!a.aniversario) return false
        const d = new Date(a.aniversario + 'T12:00:00')
        return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth()
      })
      aniversariantes.forEach(a => {
        lista.push({
          id: `aniv-${a.id}`,
          tipo: 'aniversario',
          titulo: `🎂 Aniversário de ${a.nome?.split(' ')[0]}`,
          descricao: `Hoje é o aniversário de ${a.nome}! Envie uma mensagem especial.`,
          emoji: '🎂',
          cor: '#ec4899',
          path: '/assinantes',
          whatsapp: a.whatsapp,
          msgWhats: `🎂 Feliz Aniversário, ${a.nome?.split(' ')[0]}! 🎉 O salão deseja tudo de melhor pra você! 💛`,
        })
      })

      // Estoque baixo
      const estoqueBaixo = (produtos || []).filter(p => p.estoque_atual <= p.estoque_minimo)
      estoqueBaixo.forEach(p => {
        lista.push({
          id: `est-${p.id}`,
          tipo: 'estoque',
          titulo: `${p.nome} — Estoque baixo`,
          descricao: `Apenas ${p.estoque_atual} unidade${p.estoque_atual !== 1 ? 's' : ''} restante${p.estoque_atual !== 1 ? 's' : ''} (mínimo: ${p.estoque_minimo})`,
          emoji: '📦',
          cor: '#6366f1',
          path: '/produtos',
        })
      })

      // Clientes inativos (sem visita há 30+ dias)
      const trintaDias = new Date(); trintaDias.setDate(hoje.getDate() - 30)
      const inativos = (assinantes || []).filter(a =>
        a.status === 'ativo' && a.ultimo_atendimento && new Date(a.ultimo_atendimento) < trintaDias
      )
      if (inativos.length > 0) {
        lista.push({
          id: `inat-geral`,
          tipo: 'inativo',
          titulo: `${inativos.length} cliente${inativos.length > 1 ? 's' : ''} inativo${inativos.length > 1 ? 's' : ''}`,
          descricao: `Sem visita há mais de 30 dias. Clique para ver quem são.`,
          emoji: '😴',
          cor: '#94a3b8',
          path: '/clientes',
        })
      }

      setNotificacoes(lista)
    }
    carregar()
  }, [salaoId])

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function marcarLida(id: string) {
    const novas = new Set(lidas)
    novas.add(id)
    setLidas(novas)
    localStorage.setItem('notif_lidas', JSON.stringify([...novas]))
  }

  function marcarTodasLidas() {
    const todas = new Set(notificacoes.map(n => n.id))
    setLidas(todas)
    localStorage.setItem('notif_lidas', JSON.stringify([...todas]))
  }

  const naoLidas = notificacoes.filter(n => !lidas.has(n.id))

  const grupos: Record<string, { label: string; emoji: string; cor: string }> = {
    inadimplente: { label: 'Inadimplentes', emoji: '⚠️', cor: '#f59e0b' },
    aniversario:  { label: 'Aniversários',  emoji: '🎂', cor: '#ec4899' },
    estoque:      { label: 'Estoque',        emoji: '📦', cor: '#6366f1' },
    inativo:      { label: 'Inativos',       emoji: '😴', cor: '#94a3b8' },
    renovacao:    { label: 'Renovações',     emoji: '🔄', cor: '#22c55e' },
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Botão sino */}
      <button onClick={() => setAberto(!aberto)}
        style={{ background: aberto ? t.bg : 'none', border: `0.5px solid ${aberto ? t.border : 'transparent'}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', lineHeight: 0, position: 'relative', transition: 'all 0.2s' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={naoLidas.length > 0 ? '#f59e0b' : t.textMuted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {naoLidas.length > 0 && (
          <span style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, background: '#ef4444', borderRadius: '50%', fontSize: 9, color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${t.navBg}` }}>
            {naoLidas.length > 9 ? '9+' : naoLidas.length}
          </span>
        )}
      </button>

      {/* Painel de notificações */}
      {aberto && (
        <div style={{
          position: 'absolute', top: 42, right: 0,
          width: 360, maxWidth: 'calc(100vw - 32px)',
          background: t.bgCard, border: `0.5px solid ${t.borderCard}`,
          borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
          zIndex: 500, overflow: 'hidden',
          maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: t.text, fontSize: 14, fontWeight: 600, margin: 0 }}>Alertas</p>
              <p style={{ color: t.textFaint, fontSize: 11, margin: '2px 0 0' }}>
                {naoLidas.length > 0 ? `${naoLidas.length} novo${naoLidas.length > 1 ? 's' : ''}` : 'Tudo em dia ✓'}
              </p>
            </div>
            {naoLidas.length > 0 && (
              <button onClick={marcarTodasLidas}
                style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Lista */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notificacoes.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <p style={{ color: t.text, fontSize: 14, fontWeight: 500, margin: '0 0 4px' }}>Tudo em ordem!</p>
                <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>Sem alertas no momento</p>
              </div>
            ) : (
              // Agrupar por tipo
              Object.entries(grupos).map(([tipo, cfg]) => {
                const grupo = notificacoes.filter(n => n.tipo === tipo)
                if (grupo.length === 0) return null
                return (
                  <div key={tipo}>
                    <div style={{ padding: '8px 16px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.cor }} />
                      <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>{cfg.label}</p>
                    </div>
                    {grupo.map((n, i) => {
                      const lida = lidas.has(n.id)
                      return (
                        <div key={n.id}
                          style={{ padding: '10px 16px', borderBottom: i < grupo.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', background: lida ? 'transparent' : n.cor + '08', transition: 'background 0.15s', cursor: 'pointer' }}
                          onClick={() => { marcarLida(n.id); router.push(n.path); setAberto(false) }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: n.cor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                              {n.emoji}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                <p style={{ color: t.text, fontSize: 12, fontWeight: lida ? 400 : 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.titulo}</p>
                                {!lida && <div style={{ width: 7, height: 7, borderRadius: '50%', background: n.cor, flexShrink: 0 }} />}
                              </div>
                              <p style={{ color: t.textFaint, fontSize: 11, margin: '2px 0 0', lineHeight: 1.4 }}>{n.descricao}</p>
                              {n.whatsapp && (
                                <a href={`https://wa.me/${n.whatsapp.replace(/\D/g,'').startsWith('55') ? n.whatsapp.replace(/\D/g,'') : '55'+n.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(n.msgWhats||'')}`}
                                  target="_blank" rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, background: '#25D36620', color: '#25D366', fontSize: 10, padding: '2px 8px', borderRadius: 20, textDecoration: 'none', fontWeight: 600 }}>
                                  💬 WhatsApp
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notificacoes.length > 0 && (
            <div style={{ padding: '10px 16px', borderTop: `0.5px solid ${t.rowBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{notificacoes.length} alerta{notificacoes.length > 1 ? 's' : ''} total</p>
              <button onClick={() => { marcarTodasLidas(); setAberto(false) }}
                style={{ background: 'none', border: 'none', color: t.textFaint, fontSize: 11, cursor: 'pointer' }}>
                Fechar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
