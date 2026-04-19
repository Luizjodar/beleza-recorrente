'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '../lib/tema'
import Navbar from '../components/Navbar'

export default function Dashboard() {
  const router = useRouter()
  const { t } = useTema()
  const [loading, setLoading] = useState(true)
  const [mrr, setMrr] = useState(0)
  const [totalAtivos, setTotalAtivos] = useState(0)
  const [totalPacotes, setTotalPacotes] = useState(0)
  const [renovacoesHoje, setRenovacoesHoje] = useState(0)
  const [assinantesRecentes, setAssinantesRecentes] = useState<any[]>([])
  const [pagamentosMes, setPagamentosMes] = useState(0)

  const mesAtual = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  const statusBg: any = {
    ativo: t.badgeAtivo, cancelado: t.badgeCancelado,
    inadimplente: t.badgeInadimplente, pausado: t.badgePausado,
  }
  const statusText: any = {
    ativo: t.badgeAtivoText, cancelado: t.badgeCanceladoText,
    inadimplente: t.badgeInadimplenteText, pausado: t.badgePausadoText,
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) { setLoading(false); return }
      const [{ data: assinantes }, { data: pacotes }, { data: pagamentos }] = await Promise.all([
        supabase.from('assinantes').select('*, pacotes(preco_mensal, nome)').eq('salao_id', salao.id),
        supabase.from('pacotes').select('id').eq('salao_id', salao.id).eq('ativo', true),
        supabase.from('pagamentos').select('valor').eq('status', 'pago')
          .gte('pago_em', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ])
      const ativos = (assinantes || []).filter(a => a.status === 'ativo')
      const mrrTotal = ativos.reduce((acc, a) => acc + parseFloat(a.pacotes?.preco_mensal || 0), 0)
      const hoje = new Date().toISOString().split('T')[0]
      const renovHoje = (assinantes || []).filter(a => a.proxima_cobranca === hoje).length
      const totalPago = (pagamentos || []).reduce((acc, p) => acc + parseFloat(p.valor), 0)
      setMrr(mrrTotal)
      setTotalAtivos(ativos.length)
      setTotalPacotes((pacotes || []).length)
      setRenovacoesHoje(renovHoje)
      setPagamentosMes(totalPago)
      setAssinantesRecentes((assinantes || []).slice(0, 5))
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textFaint, fontSize: 12, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: 36, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: t.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 6px' }}>Bem-vindo de volta</p>
            <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Dashboard</h1>
          </div>
          <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>{mesAtual}</p>
        </div>

        {/* KPIs grandes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          {[
            { label: 'Receita mensal recorrente', value: mrr.toLocaleString('pt-BR', { maximumFractionDigits: 0 }), unit: 'reais / mes', accent: true },
            { label: 'Recebido este mes', value: pagamentosMes.toLocaleString('pt-BR', { maximumFractionDigits: 0 }), unit: 'reais confirmados', accent: false },
          ].map(card => (
            <div key={card.label} style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '28px 32px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: card.accent ? t.accentBar : t.border, borderRadius: '0 2px 2px 0' }} />
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 16px' }}>{card.label}</p>
              <p style={{ color: t.text, fontSize: 48, fontWeight: 200, letterSpacing: -2, margin: '0 0 4px', lineHeight: 1 }}>{card.value}</p>
              <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>{card.unit}</p>
            </div>
          ))}
        </div>

        {/* KPIs menores */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Assinantes ativos', value: totalAtivos, unit: 'clientes' },
            { label: 'Pacotes criados', value: totalPacotes, unit: 'planos' },
            { label: 'Renovacoes hoje', value: renovacoesHoje, unit: 'cobracas' },
          ].map(card => (
            <div key={card.label} style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '22px 26px' }}>
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 10px' }}>{card.label}</p>
              <p style={{ color: t.text, fontSize: 38, fontWeight: 200, letterSpacing: -1, margin: '0 0 4px', lineHeight: 1 }}>{card.value}</p>
              <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>{card.unit}</p>
            </div>
          ))}
        </div>

        {/* Lista assinantes */}
        <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '18px 28px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: t.text, fontSize: 13, fontWeight: 500, margin: 0 }}>Assinantes recentes</p>
            <button onClick={() => router.push('/assinantes')} style={{ background: 'none', border: 'none', color: t.textFaint, fontSize: 12, cursor: 'pointer' }}>
              Ver todos
            </button>
          </div>
          {assinantesRecentes.length === 0 ? (
            <div style={{ padding: '48px 28px', textAlign: 'center' }}>
              <p style={{ color: t.textFaint, fontSize: 13, marginBottom: 16 }}>Nenhum assinante ainda</p>
              <button onClick={() => router.push('/assinantes')}
                style={{ background: t.text, color: t.navBg, border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 12, cursor: 'pointer' }}>
                Adicionar assinante
              </button>
            </div>
          ) : (
            assinantesRecentes.map((a, i) => (
              <div key={a.id} style={{ padding: '14px 28px', borderBottom: i < assinantesRecentes.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text, fontSize: 12, fontWeight: 500 }}>
                    {a.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: t.text, fontSize: 13, margin: '0 0 2px' }}>{a.nome}</p>
                    <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{a.pacotes?.nome}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <p style={{ color: t.textMuted, fontSize: 13, margin: 0 }}>
                    R$ {parseFloat(a.pacotes?.preco_mensal || 0).toFixed(0)}/mes
                  </p>
                  <span style={{ background: statusBg[a.status], color: statusText[a.status], fontSize: 10, padding: '3px 10px', borderRadius: 20 }}>
                    {a.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
