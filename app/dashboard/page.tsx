'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '@/app/lib/tema'
import Layout from '../components/Layout'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

type AssinanteItem = {
  id: string; nome: string; status: string; criado_em: string
  proxima_cobranca?: string; ultimo_atendimento?: string
  pacotes?: { nome: string; preco_mensal: number }
}
type AgendamentoItem = { id: string; cliente_nome: string; servico?: string; horario: string; status: string }
type ClienteInativo = { id: string; nome: string; whatsapp?: string; ultimo_atendimento?: string; pacotes?: { nome: string } }
type MesGrafico = { mes: string; valor: number; anterior: number }

// Componente mini sparkline
function Sparkline({ data, cor, height = 40 }: { data: number[]; cor: string; height?: number }) {
  const max = Math.max(...data, 1)
  const step = 100 / Math.max(data.length - 1, 1)
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(100 - (v / max) * 90).toFixed(1)}`).join(' ')
  const area = `${pts} ${((data.length-1)*step).toFixed(1)},100 0,100`
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={`sp${cor.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={cor} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sp${cor.replace('#','')})`}/>
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// Gráfico de barras do dashboard
function BarraDash({ data, height = 90 }: { data: MesGrafico[]; height?: number }) {
  const { t } = useTema()
  const max = Math.max(...data.flatMap(d => [d.valor, d.anterior]), 1)
  const [hover, setHover] = useState<number | null>(null)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
      {data.map((d, i) => {
        const pct = max > 0 ? (d.valor / max) * 100 : 0
        const pctAnt = max > 0 ? (d.anterior / max) * 100 : 0
        const isAtual = i === data.length - 1
        return (
          <div key={d.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end', position: 'relative', cursor: 'default' }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            {hover === i && (
              <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: t.text, color: t.bg, fontSize: 10, padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap', marginBottom: 4, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                R$ {d.valor >= 1000 ? `${(d.valor/1000).toFixed(1)}k` : d.valor}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%', height: '85%' }}>
              {d.anterior > 0 && (
                <div style={{ flex: 1, height: `${Math.max(pctAnt, 2)}%`, background: t.border, borderRadius: '3px 3px 0 0', transition: 'height 0.5s ease' }} />
              )}
              <div style={{ flex: d.anterior > 0 ? 1 : '0 0 100%', height: `${Math.max(pct, d.valor > 0 ? 3 : 0)}%`, background: isAtual ? '#6366f1' : t.text, borderRadius: '3px 3px 0 0', opacity: isAtual ? 1 : 0.8, transition: 'height 0.5s ease', minHeight: d.valor > 0 ? 3 : 0 }} />
            </div>
            <p style={{ color: isAtual ? t.text : t.textFaint, fontSize: 9, margin: 0, fontWeight: isAtual ? 700 : 400 }}>{d.mes}</p>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const { t } = useTema()
  const [loading, setLoading] = useState(true)
  const [mrr, setMrr] = useState(0)
  const [mrrAnterior, setMrrAnterior] = useState(0)
  const [totalAtivos, setTotalAtivos] = useState(0)
  const [totalPacotes, setTotalPacotes] = useState(0)
  const [renovacoesHoje, setRenovacoesHoje] = useState(0)
  const [pagamentosMes, setPagamentosMes] = useState(0)
  const [pagamentosOntem, setPagamentosOntem] = useState(0)
  const [ticketMedio, setTicketMedio] = useState(0)
  const [novosEsteMes, setNovosEsteMes] = useState(0)
  const [totalAgendamentosHoje, setTotalAgendamentosHoje] = useState(0)
  const [assinantesRecentes, setAssinantesRecentes] = useState<AssinanteItem[]>([])
  const [agendamentosHoje, setAgendamentosHoje] = useState<AgendamentoItem[]>([])
  const [clientesInativos, setClientesInativos] = useState<ClienteInativo[]>([])
  const [grafico, setGrafico] = useState<MesGrafico[]>([])
  const [sparkMrr, setSparkMrr] = useState<number[]>([])
  const [setupCompleto, setSetupCompleto] = useState(false)
  const [setup, setSetup] = useState({ salao: false, pacote: false, assinante: false, agenda: false })
  const [animado, setAnimado] = useState(false)

  const agora = new Date()
  const mesAtual = agora.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  const hoje = agora.toISOString().split('T')[0]
  const ontem = new Date(agora.getTime() - 86400000).toISOString().split('T')[0]
  const mesRef = `${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}-01`
  const mesAntRef = (() => { const d = new Date(agora); d.setMonth(d.getMonth()-1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` })()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('id, nome, whatsapp').eq('user_id', user.id).single()
      if (!salao) { setLoading(false); return }
      const sid = salao.id

      const [{ data: assinantes }, { data: pacotes }, { data: pagamentos }, { data: ags }] = await Promise.all([
        supabase.from('assinantes').select('*, pacotes(preco_mensal, nome)').eq('salao_id', sid),
        supabase.from('pacotes').select('id').eq('salao_id', sid).eq('ativo', true),
        supabase.from('pagamentos').select('valor, pago_em, mes_referencia').eq('salao_id', sid).eq('status', 'pago'),
        supabase.from('agendamentos').select('*').eq('salao_id', sid).eq('data', hoje).order('horario'),
      ])

      const temSalao = !!(salao.nome && salao.whatsapp)
      const temPacotes = (pacotes||[]).length > 0
      const temAssinantes = (assinantes||[]).length > 0
      const temAgenda = (ags||[]).length > 0
      setSetup({ salao: temSalao, pacote: temPacotes, assinante: temAssinantes, agenda: temAgenda })
      setSetupCompleto(temSalao && temPacotes && temAssinantes)

      const ativos = (assinantes||[]).filter(a => a.status === 'ativo')
      const mrrTotal = ativos.reduce((acc, a) => acc + Number(a.pacotes?.preco_mensal||0), 0)

      // Mês anterior
      const ativosAnterior = (assinantes||[]).filter(a => a.status === 'ativo' && a.criado_em < mesAntRef)
      const mrrAnt = ativosAnterior.reduce((acc, a) => acc + Number(a.pacotes?.preco_mensal||0), 0)

      const pagoMes = (pagamentos||[]).filter(p => p.mes_referencia === mesRef).reduce((acc, p) => acc + Number(p.valor), 0)
      const pagHoje = (pagamentos||[]).filter(p => p.pago_em?.startsWith(hoje)).reduce((acc, p) => acc + Number(p.valor), 0)
      const pagOntem = (pagamentos||[]).filter(p => p.pago_em?.startsWith(ontem)).reduce((acc, p) => acc + Number(p.valor), 0)
      const renovHoje = (assinantes||[]).filter(a => a.proxima_cobranca === hoje).length
      const ticket = ativos.length > 0 ? mrrTotal / ativos.length : 0
      const novos = (assinantes||[]).filter(a => a.criado_em?.startsWith(mesRef.slice(0,7))).length

      const trintaDias = new Date(); trintaDias.setDate(trintaDias.getDate()-30)
      const inativos = ativos.filter(a => a.ultimo_atendimento && new Date(a.ultimo_atendimento) < trintaDias).slice(0,4)

      // Gráfico 6 meses com comparativo
      const dadosGrafico: MesGrafico[] = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth()-(5-i))
        const mesStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`
        const dAnt = new Date(d); dAnt.setMonth(dAnt.getMonth()-1)
        const mesAntStr = `${dAnt.getFullYear()}-${String(dAnt.getMonth()+1).padStart(2,'0')}-01`
        const valor = (pagamentos||[]).filter(p => p.mes_referencia === mesStr).reduce((acc, p) => acc + Number(p.valor), 0)
        const anterior = (pagamentos||[]).filter(p => p.mes_referencia === mesAntStr).reduce((acc, p) => acc + Number(p.valor), 0)
        return { mes: MESES[d.getMonth()], valor, anterior }
      })

      // Sparkline MRR últimos 6 meses
      const spark = dadosGrafico.map(d => d.valor)

      setMrr(mrrTotal)
      setMrrAnterior(mrrAnt)
      setTotalAtivos(ativos.length)
      setTotalPacotes((pacotes||[]).length)
      setRenovacoesHoje(renovHoje)
      setPagamentosMes(pagoMes)
      setPagamentosOntem(pagOntem)
      setTicketMedio(ticket)
      setNovosEsteMes(novos)
      setTotalAgendamentosHoje((ags||[]).length)
      setAssinantesRecentes((assinantes||[]).slice(0,5) as AssinanteItem[])
      setAgendamentosHoje((ags||[]) as AgendamentoItem[])
      setClientesInativos(inativos as ClienteInativo[])
      setGrafico(dadosGrafico)
      setSparkMrr(spark)
      setLoading(false)
      setTimeout(() => setAnimado(true), 100)
    }
    init()
  }, [router, hoje, mesRef, mesAntRef, ontem])

  const crescMrr = mrrAnterior > 0 ? ((mrr - mrrAnterior) / mrrAnterior * 100) : 0
  const crescPag = pagamentosOntem > 0 ? ((pagamentosMes - pagamentosOntem) / pagamentosOntem * 100) : 0

  const statusDot: Record<string, string> = { confirmado: '#22c55e', pendente: '#f59e0b', cancelado: '#ef4444', concluido: '#6366f1' }
  const statusBg: Record<string, string> = { ativo: t.badgeAtivo, cancelado: t.badgeCancelado, inadimplente: t.badgeInadimplente, pausado: t.badgePausado }
  const statusTx: Record<string, string> = { ativo: t.badgeAtivoText, cancelado: t.badgeCanceladoText, inadimplente: t.badgeInadimplenteText, pausado: t.badgePausadoText }

  const passos = [
    { key: 'salao', label: 'Configure seu salao', desc: 'Nome, WhatsApp e link publico', path: '/configuracoes', done: setup.salao },
    { key: 'pacote', label: 'Crie um pacote', desc: 'Defina servicos e precos', path: '/pacotes', done: setup.pacote },
    { key: 'assinante', label: 'Adicione seu primeiro assinante', desc: 'Cadastre um cliente no plano', path: '/assinantes', done: setup.assinante },
    { key: 'agenda', label: 'Configure a agenda', desc: 'Defina seus horarios de atendimento', path: '/agenda/horarios', done: setup.agenda },
  ]
  const passosFeitos = passos.filter(p => p.done).length

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.text}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const fmt = (v: number) => v >= 1000 ? `R$ ${(v/1000).toFixed(1)}k` : `R$ ${v.toLocaleString('pt-BR',{maximumFractionDigits:0})}`

  return (
    <Layout>
      <style>{`
        .dp { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
        .dp-k4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 14px; }
        .dp-k2 { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; margin-bottom: 14px; }
        .dp-mid { display: grid; grid-template-columns: 1fr 300px; gap: 14px; margin-bottom: 14px; }
        .dp-bot { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .kv { opacity: 0; transform: translateY(12px); transition: opacity 0.4s ease, transform 0.4s ease; }
        .kv.in { opacity: 1; transform: translateY(0); }
        .kcard { background: var(--bg-card); border: 0.5px solid var(--border-card); border-radius: 20px; padding: 22px; position: relative; overflow: hidden; transition: box-shadow 0.2s, transform 0.2s; }
        .kcard:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.06); transform: translateY(-1px); }
        .badge-up { background: #dcfce7; color: #15803d; font-size: 10px; padding: 2px 7px; border-radius: 20px; font-weight: 600; }
        .badge-dn { background: #fef2f2; color: #dc2626; font-size: 10px; padding: 2px 7px; border-radius: 20px; font-weight: 600; }
        .badge-nt { background: #f1f5f9; color: #64748b; font-size: 10px; padding: 2px 7px; border-radius: 20px; font-weight: 600; }
        @media (max-width: 768px) {
          .dp { padding: 16px 14px; }
          .dp-k4 { grid-template-columns: 1fr 1fr; gap: 10px; }
          .dp-k2 { grid-template-columns: 1fr 1fr; gap: 10px; }
          .dp-mid { grid-template-columns: 1fr; }
          .dp-bot { grid-template-columns: 1fr; }
        }
      `}</style>
      <style>{`
        :root { --bg-card: ${t.bgCard}; --border-card: ${t.borderCard}; }
      `}</style>

      <div className="dp">

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: t.textFaint, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Bem-vindo de volta</p>
            <h1 style={{ color: t.text, fontSize: 32, fontWeight: 300, margin: 0, letterSpacing: -1, fontFamily: 'Georgia, serif' }}>Dashboard</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ color: t.textMuted, fontSize: 12 }}>{mesAtual}</span>
            </div>
          </div>
        </div>

        {/* Setup guide */}
        {!setupCompleto && (
          <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: 20, padding: '24px', marginBottom: 20, color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 4px', opacity: 0.7 }}>Primeiros passos</p>
                <h2 style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>Configure seu salao</h2>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '8px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 300, margin: 0, lineHeight: 1 }}>{passosFeitos}/4</p>
                <p style={{ fontSize: 10, margin: '2px 0 0', opacity: 0.7 }}>completos</p>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, height: 4, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ background: 'white', height: '100%', width: `${(passosFeitos/4)*100}%`, borderRadius: 4, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {passos.map((p, i) => (
                <div key={p.key} onClick={() => !p.done && router.push(p.path)}
                  style={{ background: p.done ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', cursor: p.done ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: p.done ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {p.done ? <span style={{ color: '#6366f1', fontSize: 12, fontWeight: 700 }}>✓</span> : <span style={{ color: 'white', fontSize: 10, fontWeight: 600 }}>{i+1}</span>}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, margin: 0, opacity: p.done ? 0.6 : 1, textDecoration: p.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPIs linha 1 — 4 cards */}
        <div className="dp-k4">
          {[
            { label: 'MRR', value: fmt(mrr), sub: 'receita recorrente', spark: sparkMrr, cor: '#6366f1', crescimento: crescMrr },
            { label: 'Recebido este mes', value: fmt(pagamentosMes), sub: 'pagamentos confirmados', spark: grafico.map(g=>g.valor), cor: '#22c55e', crescimento: crescPag },
            { label: 'Ticket medio', value: fmt(ticketMedio), sub: 'por assinante ativo', spark: [], cor: '#f59e0b', crescimento: 0 },
            { label: 'Novos este mes', value: String(novosEsteMes), sub: 'assinantes captados', spark: [], cor: '#ec4899', crescimento: 0 },
          ].map((k, idx) => (
            <div key={k.label} className={`kcard kv ${animado ? 'in' : ''}`} style={{ transitionDelay: `${idx*80}ms` } as React.CSSProperties}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>{k.label}</p>
                {k.crescimento !== 0 && (
                  <span className={k.crescimento > 0 ? 'badge-up' : 'badge-dn'}>
                    {k.crescimento > 0 ? '↑' : '↓'} {Math.abs(k.crescimento).toFixed(0)}%
                  </span>
                )}
              </div>
              <p style={{ color: t.text, fontSize: 26, fontWeight: 300, letterSpacing: -1, margin: '0 0 2px', lineHeight: 1 }}>{k.value}</p>
              <p style={{ color: t.textFaint, fontSize: 11, margin: '0 0 12px' }}>{k.sub}</p>
              {k.spark.length > 1 && <Sparkline data={k.spark} cor={k.cor} height={36} />}
            </div>
          ))}
        </div>

        {/* KPIs linha 2 */}
        <div className="dp-k2">
          {[
            { label: 'Assinantes ativos', value: totalAtivos, unit: 'clientes pagantes', cor: '#22c55e', path: '/assinantes', icon: '👥' },
            { label: 'Agendamentos hoje', value: totalAgendamentosHoje, unit: 'no calendario', cor: '#6366f1', path: '/agenda', icon: '📅' },
          ].map((k, idx) => (
            <div key={k.label} className={`kcard kv ${animado ? 'in' : ''}`}
              style={{ cursor: 'pointer', transitionDelay: `${(idx+4)*80}ms` } as React.CSSProperties}
              onClick={() => router.push(k.path)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 10px', fontWeight: 600 }}>{k.label}</p>
                  <p style={{ color: k.cor, fontSize: 40, fontWeight: 200, letterSpacing: -2, margin: '0 0 4px', lineHeight: 1 }}>{k.value}</p>
                  <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{k.unit}</p>
                </div>
                <div style={{ fontSize: 32, opacity: 0.6 }}>{k.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Gráfico + Agendamentos hoje */}
        <div className="dp-mid">
          <div className="kcard">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Historico financeiro</p>
                <p style={{ color: t.text, fontSize: 15, fontWeight: 500, margin: 0 }}>Receita dos ultimos 6 meses</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: t.textFaint, fontSize: 10, margin: '0 0 2px' }}>Total</p>
                <p style={{ color: t.text, fontSize: 14, fontWeight: 600, margin: 0 }}>
                  {fmt(grafico.reduce((a,g)=>a+g.valor,0))}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: t.text }} />
                <span style={{ color: t.textFaint, fontSize: 10 }}>Mes atual</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: t.border }} />
                <span style={{ color: t.textFaint, fontSize: 10 }}>Mes anterior</span>
              </div>
            </div>
            <BarraDash data={grafico} height={110} />
          </div>

          <div className="kcard" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 2px', fontWeight: 600 }}>Hoje</p>
                <p style={{ color: t.text, fontSize: 14, fontWeight: 500, margin: 0 }}>Agendamentos</p>
              </div>
              <button onClick={() => router.push('/agenda')}
                style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                Abrir agenda
              </button>
            </div>
            {agendamentosHoje.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                <p style={{ color: t.textFaint, fontSize: 13, margin: 0 }}>Nenhum agendamento hoje</p>
              </div>
            ) : agendamentosHoje.map((a, i) => (
              <div key={a.id} style={{ padding: '12px 20px', borderBottom: i < agendamentosHoje.length-1 ? `0.5px solid ${t.rowBorder}` : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusDot[a.status] || '#aaa', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: t.text, fontSize: 12, fontWeight: 500, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.cliente_nome}</p>
                  <p style={{ color: t.textFaint, fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.servico || 'Servico'}</p>
                </div>
                <span style={{ color: t.textFaint, fontSize: 11, fontWeight: 500, flexShrink: 0 }}>{a.horario.slice(0,5)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Assinantes + Inativos */}
        <div className="dp-bot">
          <div className="kcard" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ color: t.text, fontSize: 14, fontWeight: 500, margin: 0 }}>Assinantes recentes</p>
              <button onClick={() => router.push('/assinantes')} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>Ver todos →</button>
            </div>
            {assinantesRecentes.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                <p style={{ color: t.textFaint, fontSize: 13, margin: '0 0 12px' }}>Nenhum assinante ainda</p>
                <button onClick={() => router.push('/assinantes')} style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>Adicionar</button>
              </div>
            ) : assinantesRecentes.map((a, i) => (
              <div key={a.id} style={{ padding: '12px 20px', borderBottom: i < assinantesRecentes.length-1 ? `0.5px solid ${t.rowBorder}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: `hsl(${a.nome.charCodeAt(0)*7},60%,${t.bg === '#fff' || t.bg === '#ffffff' ? '90%' : '20%'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                    {a.nome.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: t.text, fontSize: 13, fontWeight: 500, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nome}</p>
                    <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{a.pacotes?.nome} · R$ {(a.pacotes?.preco_mensal??0).toFixed(0)}/mes</p>
                  </div>
                </div>
                <span style={{ background: statusBg[a.status], color: statusTx[a.status], fontSize: 10, padding: '3px 8px', borderRadius: 20, flexShrink: 0, fontWeight: 500 }}>{a.status}</span>
              </div>
            ))}
          </div>

          <div className="kcard" style={{ padding: 0 }}>
            <div style={{ padding: '16px 20px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: t.text, fontSize: 14, fontWeight: 500, margin: '0 0 2px' }}>Clientes inativos</p>
                <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>Sem visita ha 30+ dias</p>
              </div>
              {clientesInativos.length > 0 && (
                <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>{clientesInativos.length}</span>
              )}
            </div>
            {clientesInativos.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                <p style={{ color: t.textFaint, fontSize: 13, margin: '0 0 4px', fontWeight: 500 }}>Todos ativos!</p>
                <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>Nenhum cliente inativo</p>
              </div>
            ) : clientesInativos.map((a, i) => {
              const dias = a.ultimo_atendimento ? Math.floor((agora.getTime()-new Date(a.ultimo_atendimento).getTime())/(1000*60*60*24)) : null
              return (
                <div key={a.id} style={{ padding: '12px 20px', borderBottom: i < clientesInativos.length-1 ? `0.5px solid ${t.rowBorder}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                      {a.nome.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: t.text, fontSize: 13, fontWeight: 500, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nome}</p>
                      <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{a.pacotes?.nome}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {dias && <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>{dias}d</span>}
                    {a.whatsapp && (
                      <a href={`https://wa.me/${a.whatsapp}?text=Oi ${a.nome.split(' ')[0]}! Sentimos sua falta 💛`}
                        target="_blank" rel="noreferrer"
                        style={{ display: 'block', marginTop: 4, color: '#25D366', fontSize: 10, textDecoration: 'none', fontWeight: 500 }}>
                        WhatsApp ↗
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </Layout>
  )
}
