'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '../lib/tema'
import Navbar from '../components/Navbar'

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function Dashboard() {
  const router = useRouter()
  const { t } = useTema()
  const [loading, setLoading] = useState(true)
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [mrr, setMrr] = useState(0)
  const [totalAtivos, setTotalAtivos] = useState(0)
  const [totalPacotes, setTotalPacotes] = useState(0)
  const [renovacoesHoje, setRenovacoesHoje] = useState(0)
  const [pagamentosMes, setPagamentosMes] = useState(0)
  const [assinantesRecentes, setAssinantesRecentes] = useState<any[]>([])
  const [agendamentosHoje, setAgendamentosHoje] = useState<any[]>([])
  const [clientesInativos, setClientesInativos] = useState<any[]>([])
  const [grafico, setGrafico] = useState<{ mes: string; valor: number }[]>([])
  const [setupCompleto, setSetupCompleto] = useState(false)
  const [setup, setSetup] = useState({ salao: false, pacote: false, assinante: false, agenda: false })

  const mesAtual = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  const hoje = new Date().toISOString().split('T')[0]

  const statusStyle: any = {
    ativo: { bg: t.badgeAtivo, text: t.badgeAtivoText },
    cancelado: { bg: t.badgeCancelado, text: t.badgeCanceladoText },
    inadimplente: { bg: t.badgeInadimplente, text: t.badgeInadimplenteText },
    pausado: { bg: t.badgePausado, text: t.badgePausadoText },
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('id, nome, whatsapp').eq('user_id', user.id).single()
      if (!salao) { setLoading(false); return }
      const sid = salao.id
      setSalaoId(sid)

      const [{ data: assinantes }, { data: pacotes }, { data: pagamentos }, { data: ags }] = await Promise.all([
        supabase.from('assinantes').select('*, pacotes(preco_mensal, nome)').eq('salao_id', sid),
        supabase.from('pacotes').select('id').eq('salao_id', sid).eq('ativo', true),
        supabase.from('pagamentos').select('valor, pago_em, mes_referencia').eq('salao_id', sid).eq('status', 'pago'),
        supabase.from('agendamentos').select('*').eq('salao_id', sid).eq('data', hoje).order('horario'),
      ])

      const temPacotes = (pacotes || []).length > 0
      const temAssinantes = (assinantes || []).length > 0
      const temAgenda = (ags || []).length > 0
      const temSalao = !!(salao.nome && salao.whatsapp)

      setSetup({ salao: temSalao, pacote: temPacotes, assinante: temAssinantes, agenda: temAgenda })
      setSetupCompleto(temSalao && temPacotes && temAssinantes)

      const ativos = (assinantes || []).filter(a => a.status === 'ativo')
      const mrrTotal = ativos.reduce((acc, a) => acc + parseFloat(a.pacotes?.preco_mensal || 0), 0)
      const mesRef = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
      const pagoMes = (pagamentos || []).filter(p => p.mes_referencia === mesRef).reduce((acc, p) => acc + parseFloat(p.valor), 0)
      const renovHoje = (assinantes || []).filter(a => a.proxima_cobranca === hoje).length

      const trintaDiasAtras = new Date()
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
      const inativos = (assinantes || []).filter(a =>
        a.status === 'ativo' && a.ultimo_atendimento && new Date(a.ultimo_atendimento) < trintaDiasAtras
      ).slice(0, 4)

      const dadosGrafico = Array.from({ length: 6 }, (_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() - (5 - i))
        const mesStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
        const valor = (pagamentos || []).filter(p => p.mes_referencia === mesStr).reduce((acc, p) => acc + parseFloat(p.valor), 0)
        return { mes: MESES_CURTOS[d.getMonth()], valor }
      })

      setMrr(mrrTotal)
      setTotalAtivos(ativos.length)
      setTotalPacotes((pacotes || []).length)
      setRenovacoesHoje(renovHoje)
      setPagamentosMes(pagoMes)
      setAssinantesRecentes((assinantes || []).slice(0, 4))
      setAgendamentosHoje(ags || [])
      setClientesInativos(inativos)
      setGrafico(dadosGrafico)
      setLoading(false)
    }
    init()
  }, [])

  const maxGrafico = Math.max(...grafico.map(g => g.valor), 1)

  const passos = [
    { key: 'salao', label: 'Configure seu salao', desc: 'Nome, WhatsApp e link publico', path: '/configuracoes', done: setup.salao },
    { key: 'pacote', label: 'Crie um pacote', desc: 'Defina servicos e precos', path: '/pacotes', done: setup.pacote },
    { key: 'assinante', label: 'Adicione seu primeiro assinante', desc: 'Cadastre um cliente no plano', path: '/assinantes', done: setup.assinante },
    { key: 'agenda', label: 'Configure a agenda', desc: 'Defina seus horarios de atendimento', path: '/agenda/horarios', done: setup.agenda },
  ]
  const passosFeitos = passos.filter(p => p.done).length

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textFaint, fontSize: 12, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '36px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: t.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 6px' }}>Bem-vindo de volta</p>
            <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Faturamento</h1>
          </div>
          <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>{mesAtual}</p>
        </div>

        {/* ESTADO VAZIO — guia de setup */}
        {!setupCompleto && (
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '32px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ color: t.text, fontSize: 18, fontWeight: 400, margin: '0 0 6px', fontFamily: 'Georgia, serif' }}>
                  Configure seu salao em 4 passos
                </h2>
                <p style={{ color: t.textMuted, fontSize: 13, margin: 0 }}>
                  Complete o setup para comecar a receber assinantes
                </p>
              </div>
              <div style={{ textAlign: 'center', flexShrink: 0, marginLeft: 24 }}>
                <p style={{ color: t.text, fontSize: 28, fontWeight: 300, margin: 0, lineHeight: 1 }}>{passosFeitos}/4</p>
                <p style={{ color: t.textFaint, fontSize: 11, margin: '4px 0 0' }}>concluidos</p>
              </div>
            </div>

            {/* Barra de progresso */}
            <div style={{ background: t.bg, borderRadius: 4, height: 4, marginBottom: 24, overflow: 'hidden' }}>
              <div style={{ background: t.text, height: '100%', width: `${(passosFeitos / 4) * 100}%`, borderRadius: 4, transition: 'width 0.3s' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {passos.map((passo, i) => (
                <div key={passo.key} onClick={() => !passo.done && router.push(passo.path)}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: passo.done ? t.bg : t.bgCard, border: `0.5px solid ${passo.done ? t.border : t.borderCard}`, borderRadius: 12, cursor: passo.done ? 'default' : 'pointer', opacity: passo.done ? 0.6 : 1, transition: 'all 0.15s' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: passo.done ? t.text : t.bg, border: `0.5px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {passo.done
                      ? <span style={{ color: t.bg, fontSize: 13 }}>✓</span>
                      : <span style={{ color: t.textFaint, fontSize: 12, fontWeight: 500 }}>{i + 1}</span>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: t.text, fontSize: 13, fontWeight: 500, margin: '0 0 2px', textDecoration: passo.done ? 'line-through' : 'none' }}>{passo.label}</p>
                    <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>{passo.desc}</p>
                  </div>
                  {!passo.done && (
                    <span style={{ color: t.textFaint, fontSize: 16 }}>→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPIs — sempre visíveis */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {[
            { label: 'Receita mensal recorrente', value: mrr.toLocaleString('pt-BR', { maximumFractionDigits: 0 }), unit: 'reais / mes', accent: true },
            { label: 'Recebido este mes', value: pagamentosMes.toLocaleString('pt-BR', { maximumFractionDigits: 0 }), unit: 'reais confirmados', accent: false },
          ].map(card => (
            <div key={card.label} style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: card.accent ? t.accentBar : t.border, borderRadius: 0 }} />
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 12px' }}>{card.label}</p>
              <p style={{ color: t.text, fontSize: 44, fontWeight: 200, letterSpacing: -2, margin: '0 0 4px', lineHeight: 1 }}>{card.value}</p>
              <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>{card.unit}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Assinantes ativos', value: totalAtivos, unit: 'clientes', click: '/assinantes' },
            { label: 'Pacotes criados', value: totalPacotes, unit: 'planos', click: '/pacotes' },
            { label: 'Renovacoes hoje', value: renovacoesHoje, unit: 'cobracas', click: '/pagamentos' },
          ].map(card => (
            <div key={card.label} onClick={() => router.push(card.click)}
              style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '20px 24px', cursor: 'pointer' }}>
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 10px' }}>{card.label}</p>
              <p style={{ color: t.text, fontSize: 36, fontWeight: 200, letterSpacing: -1, margin: '0 0 4px', lineHeight: 1 }}>{card.value}</p>
              <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>{card.unit}</p>
            </div>
          ))}
        </div>

        {/* Grafico + Agendamentos — só com dados */}
        {setupCompleto && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 16 }}>
            <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Historico</p>
                  <p style={{ color: t.text, fontSize: 14, fontWeight: 500, margin: 0 }}>Ultimos 6 meses</p>
                </div>
                <p style={{ color: t.textMuted, fontSize: 12, margin: 0 }}>
                  Total: R$ {grafico.reduce((a, g) => a + g.valor, 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
                {grafico.map((g, i) => {
                  const altura = maxGrafico > 0 ? (g.valor / maxGrafico) * 100 : 0
                  const isAtual = i === grafico.length - 1
                  return (
                    <div key={g.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                      {g.valor > 0 && <p style={{ color: t.textFaint, fontSize: 10, margin: 0 }}>{g.valor >= 1000 ? `${(g.valor / 1000).toFixed(1)}k` : g.valor}</p>}
                      <div style={{ width: '100%', height: `${Math.max(altura, g.valor > 0 ? 4 : 0)}%`, background: isAtual ? t.text : t.border, borderRadius: '4px 4px 0 0', minHeight: g.valor > 0 ? 4 : 0 }} />
                      <p style={{ color: isAtual ? t.text : t.textFaint, fontSize: 11, margin: 0, fontWeight: isAtual ? 500 : 400 }}>{g.mes}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 2px' }}>Hoje</p>
                  <p style={{ color: t.text, fontSize: 13, fontWeight: 500, margin: 0 }}>Agendamentos</p>
                </div>
                <button onClick={() => router.push('/agenda')} style={{ background: 'none', border: 'none', color: t.textFaint, fontSize: 12, cursor: 'pointer' }}>Ver agenda</button>
              </div>
              {agendamentosHoje.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  <p style={{ color: t.textFaint, fontSize: 12, marginBottom: 12 }}>Nenhum agendamento hoje</p>
                  <button onClick={() => router.push('/agenda')} style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 11, cursor: 'pointer' }}>Abrir agenda</button>
                </div>
              ) : agendamentosHoje.map((a, i) => (
                <div key={a.id} style={{ padding: '12px 20px', borderBottom: i < agendamentosHoje.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: a.status === 'confirmado' ? '#22c55e' : a.status === 'pendente' ? '#f59e0b' : '#aaa', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: t.text, fontSize: 12, fontWeight: 500, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.cliente_nome}</p>
                    <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{a.servico || 'Servico nao informado'}</p>
                  </div>
                  <span style={{ color: t.textFaint, fontSize: 11, flexShrink: 0 }}>{a.horario.slice(0, 5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assinantes + Inativos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ color: t.text, fontSize: 13, fontWeight: 500, margin: 0 }}>Assinantes recentes</p>
              <button onClick={() => router.push('/assinantes')} style={{ background: 'none', border: 'none', color: t.textFaint, fontSize: 12, cursor: 'pointer' }}>Ver todos</button>
            </div>
            {assinantesRecentes.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <p style={{ color: t.textFaint, fontSize: 13, marginBottom: 12 }}>Nenhum assinante ainda</p>
                <button onClick={() => router.push('/assinantes')} style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 11, cursor: 'pointer' }}>Adicionar assinante</button>
              </div>
            ) : assinantesRecentes.map((a, i) => (
              <div key={a.id} style={{ padding: '13px 24px', borderBottom: i < assinantesRecentes.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text, fontSize: 12, fontWeight: 500 }}>
                    {a.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: t.text, fontSize: 13, margin: '0 0 1px' }}>{a.nome}</p>
                    <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{a.pacotes?.nome}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <p style={{ color: t.textMuted, fontSize: 12, margin: 0 }}>R$ {parseFloat(a.pacotes?.preco_mensal || 0).toFixed(0)}/mes</p>
                  <span style={{ background: statusStyle[a.status]?.bg, color: statusStyle[a.status]?.text, fontSize: 10, padding: '3px 10px', borderRadius: 20 }}>{a.status}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: t.text, fontSize: 13, fontWeight: 500, margin: '0 0 2px' }}>Clientes inativos</p>
                <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>Sem visita ha 30+ dias</p>
              </div>
              {clientesInativos.length > 0 && (
                <span style={{ background: t.badgeInadimplente, color: t.badgeInadimplenteText, fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 500 }}>
                  {clientesInativos.length}
                </span>
              )}
            </div>
            {clientesInativos.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <p style={{ color: t.textFaint, fontSize: 13 }}>Nenhum cliente inativo</p>
                <p style={{ color: t.textFaint, fontSize: 11, marginTop: 4 }}>Todos visitaram recentemente</p>
              </div>
            ) : clientesInativos.map((a, i) => {
              const dias = a.ultimo_atendimento
                ? Math.floor((new Date().getTime() - new Date(a.ultimo_atendimento).getTime()) / (1000 * 60 * 60 * 24))
                : null
              return (
                <div key={a.id} style={{ padding: '13px 24px', borderBottom: i < clientesInativos.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text, fontSize: 12, fontWeight: 500 }}>
                      {a.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ color: t.text, fontSize: 13, margin: '0 0 1px' }}>{a.nome}</p>
                      <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{a.pacotes?.nome}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {dias && <span style={{ background: t.badgeInadimplente, color: t.badgeInadimplenteText, fontSize: 10, padding: '3px 10px', borderRadius: 20 }}>{dias}d sem visita</span>}
                    {a.whatsapp && (
                      <a href={`https://wa.me/${a.whatsapp}?text=Oi ${a.nome.split(' ')[0]}! Sentimos sua falta. Que tal agendar?`}
                        target="_blank" rel="noreferrer"
                        style={{ display: 'block', marginTop: 4, color: '#25D366', fontSize: 10, textDecoration: 'none' }}>
                        Chamar no WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
