'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '@/app/lib/tema'
import Layout from '../components/Layout'

type Assinante = {
  id: string
  nome: string
  whatsapp?: string
  status: 'ativo' | 'inadimplente' | 'cancelado' | 'pausado'
  data_inicio?: string
  ultimo_atendimento?: string
  pacotes?: { nome: string; preco_mensal: number }
}

export default function ClientesAnalise() {
  const router = useRouter()
  const { t } = useTema()
  const [loading, setLoading] = useState(true)
  const [assinantes, setAssinantes] = useState<Assinante[]>([])
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'inativos' | 'inadimplentes'>('todos')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) return
      const { data } = await supabase.from('assinantes')
        .select('*, pacotes(nome, preco_mensal)')
        .eq('salao_id', salao.id)
        .order('criado_em', { ascending: false })
      setAssinantes((data as Assinante[]) || [])
      setLoading(false)
    }
    init()
  }, [router])

  const hoje = new Date()
  const trintaDiasAtras = new Date(hoje); trintaDiasAtras.setDate(hoje.getDate() - 30)

  const ativos = assinantes.filter(a => a.status === 'ativo')
  const inativos = ativos.filter(a => a.ultimo_atendimento && new Date(a.ultimo_atendimento) < trintaDiasAtras)
  const mrr = ativos.reduce((acc, a) => acc + parseFloat(String(a.pacotes?.preco_mensal || 0)), 0)
  const ticketMedio = ativos.length > 0 ? mrr / ativos.length : 0

  const diasComoCliente = (a: Assinante) => {
    if (!a.data_inicio) return 0
    return Math.floor((hoje.getTime() - new Date(a.data_inicio).getTime()) / (1000 * 60 * 60 * 24))
  }

  const diasSemVisita = (a: Assinante) => {
    if (!a.ultimo_atendimento) return null
    return Math.floor((hoje.getTime() - new Date(a.ultimo_atendimento).getTime()) / (1000 * 60 * 60 * 24))
  }

  const filtrados = assinantes.filter(a => {
    const matchBusca = a.nome.toLowerCase().includes(busca.toLowerCase())
    if (filtro === 'ativos') return a.status === 'ativo' && matchBusca
    if (filtro === 'inativos') return a.status === 'ativo' && a.ultimo_atendimento && new Date(a.ultimo_atendimento) < trintaDiasAtras && matchBusca
    if (filtro === 'inadimplentes') return a.status === 'inadimplente' && matchBusca
    return matchBusca
  })

  const inputStyle = { border: `0.5px solid ${t.border}`, borderRadius: 10, padding: '9px 14px', background: t.bgInput, fontSize: 13, color: t.text, outline: 'none' }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textFaint, fontSize: 12, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )

  return (
    <Layout>
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
<div style={{ maxWidth: 960, margin: '0 auto', padding: '36px 24px' }}>

        <div style={{ marginBottom: 28 }}>
          <p style={{ color: t.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 6px' }}>Analise</p>
          <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Clientes</h1>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total de clientes', value: assinantes.length, unit: 'cadastrados' },
            { label: 'Ativos', value: ativos.length, unit: 'assinantes' },
            { label: 'Ticket medio', value: `R$ ${ticketMedio.toFixed(0)}`, unit: 'por cliente' },
            { label: 'Inativos', value: inativos.length, unit: '30+ dias sem visita' },
          ].map(card => (
            <div key={card.label} style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 16, padding: '18px 20px' }}>
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px' }}>{card.label}</p>
              <p style={{ color: t.text, fontSize: 28, fontWeight: 200, margin: '0 0 2px', lineHeight: 1 }}>{card.value}</p>
              <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{card.unit}</p>
            </div>
          ))}
        </div>

        {/* Filtros + busca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..." style={{ ...inputStyle, width: 200 }} />
          <div style={{ display: 'flex', background: t.bgCard, border: `0.5px solid ${t.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
            {(['todos', 'ativos', 'inativos', 'inadimplentes'] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)}
                style={{ background: filtro === f ? t.text : 'none', color: filtro === f ? t.bg : t.textMuted, border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: filtro === f ? 500 : 400 }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <span style={{ color: t.textFaint, fontSize: 12, marginLeft: 'auto' }}>{filtrados.length} cliente(s)</span>
        </div>

        {/* Lista de clientes */}
        <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 80px', padding: '10px 20px', borderBottom: `0.5px solid ${t.rowBorder}` }}>
            {['Cliente', 'Plano', 'Desde', 'Ultima visita', 'Status'].map(h => (
              <p key={h} style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>{h}</p>
            ))}
          </div>
          {filtrados.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: t.textFaint, fontSize: 13 }}>Nenhum cliente encontrado</p>
            </div>
          ) : filtrados.map((a, i) => {
            const dias = diasSemVisita(a)
            const semanas = diasComoCliente(a)
            const statusBg: Record<string, string> = { ativo: t.badgeAtivo, inadimplente: t.badgeInadimplente, cancelado: t.badgeCancelado, pausado: t.badgePausado }
            const statusTx: Record<string, string> = { ativo: t.badgeAtivoText, inadimplente: t.badgeInadimplenteText, cancelado: t.badgeCanceladoText, pausado: t.badgePausadoText }
            return (
              <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 100px 80px', padding: '13px 20px', borderBottom: i < filtrados.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text, fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                    {a.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: t.text, fontSize: 13, margin: '0 0 1px' }}>{a.nome}</p>
                    <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{a.whatsapp || 'Sem WhatsApp'}</p>
                  </div>
                </div>
                <p style={{ color: t.textMuted, fontSize: 12, margin: 0 }}>{a.pacotes?.nome || '—'}</p>
                <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>{semanas}d</p>
                <div>
                  {dias !== null ? (
                    <span style={{ background: dias > 30 ? t.badgeInadimplente : t.badgeAtivo, color: dias > 30 ? t.badgeInadimplenteText : t.badgeAtivoText, fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>
                      {dias}d atras
                    </span>
                  ) : <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>Nunca</p>}
                </div>
                <span style={{ background: statusBg[a.status] || t.bg, color: statusTx[a.status] || t.textFaint, fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>
                  {a.status}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  </Layout>
  )
}
