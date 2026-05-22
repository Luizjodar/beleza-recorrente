'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '@/app/lib/tema'
import Layout from '../components/Layout'

type Funcionario = { id: string; nome: string; cargo?: string; comissao_pct?: number; ativo: boolean }
type Agendamento = { id: string; data: string; horario: string; servico?: string; status?: string; funcionario_nome?: string; cliente_nome: string }
type Comissao = { id: string; funcionario_id: string; funcionario_nome: string; agendamento_id?: string; valor_servico: number; percentual: number; valor_comissao: number; mes_referencia: string; status: string; pago_em?: string }

const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function corFunc(nome: string) {
  const cores = ['#6366f1','#ec4899','#10b981','#f59e0b','#06b6d4','#8b5cf6','#f43f5e','#84cc16']
  return cores[nome.charCodeAt(0) % cores.length]
}

export default function ComissoesPage() {
  const router = useRouter()
  const { t } = useTema()
  const [loading, setLoading] = useState(true)
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [mesOffset, setMesOffset] = useState(0)
  const [processando, setProcessando] = useState(false)
  const [funcSelecionado, setFuncSelecionado] = useState<string | null>(null)

  const hoje = new Date()
  const mesRef = new Date(hoje.getFullYear(), hoje.getMonth() + mesOffset, 1)
  const mesStr = `${mesRef.getFullYear()}-${String(mesRef.getMonth()+1).padStart(2,'0')}-01`
  const mesLabel = `${MESES_CURTOS[mesRef.getMonth()]} ${mesRef.getFullYear()}`

  const carregar = useCallback(async (id: string, offset: number) => {
    const ref = new Date()
    ref.setMonth(ref.getMonth() + offset)
    const ms = `${ref.getFullYear()}-${String(ref.getMonth()+1).padStart(2,'0')}-01`
    const fimMes = new Date(ref.getFullYear(), ref.getMonth()+1, 0).toISOString().split('T')[0]
    const [{ data: funcs }, { data: ags }, { data: coms }] = await Promise.all([
      supabase.from('funcionarios').select('*').eq('salao_id', id).eq('ativo', true),
      supabase.from('agendamentos').select('*').eq('salao_id', id).eq('status', 'concluido').gte('data', ms).lte('data', fimMes),
      supabase.from('comissoes').select('*').eq('salao_id', id).eq('mes_referencia', ms),
    ])
    setFuncionarios((funcs || []) as Funcionario[])
    setAgendamentos((ags || []) as Agendamento[])
    setComissoes((coms || []) as Comissao[])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) return
      setSalaoId(salao.id)
      await carregar(salao.id, 0)
      setLoading(false)
    }
    init()
  }, [carregar, router])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (salaoId) void carregar(salaoId, mesOffset)
  }, [mesOffset, salaoId, carregar])

  async function calcularComissoes() {
    if (!salaoId) return
    setProcessando(true)
    // Remove comissões do mês atual e recalcula
    await supabase.from('comissoes').delete().eq('salao_id', salaoId).eq('mes_referencia', mesStr)
    const novas: Omit<Comissao, 'id'>[] = []
    for (const ag of agendamentos) {
      const func = funcionarios.find(f => f.nome === ag.funcionario_nome)
      if (!func || !func.comissao_pct) continue
      const valorServico = 100 // valor padrão por atendimento
      const valorComissao = valorServico * (func.comissao_pct / 100)
      novas.push({
        funcionario_id: func.id,
        funcionario_nome: func.nome,
        agendamento_id: ag.id,
        valor_servico: valorServico,
        percentual: func.comissao_pct,
        valor_comissao: valorComissao,
        mes_referencia: mesStr,
        status: 'pendente',
      })
    }
    if (novas.length > 0) {
      await supabase.from('comissoes').insert(novas.map(c => ({ ...c, salao_id: salaoId })))
    }
    await carregar(salaoId, mesOffset)
    setProcessando(false)
  }

  async function pagarComissao(funcId: string) {
    if (!salaoId) return
    await supabase.from('comissoes')
      .update({ status: 'pago', pago_em: new Date().toISOString() })
      .eq('salao_id', salaoId).eq('funcionario_id', funcId).eq('mes_referencia', mesStr).eq('status', 'pendente')
    await carregar(salaoId, mesOffset)
  }

  async function pagarTodas() {
    if (!salaoId) return
    await supabase.from('comissoes')
      .update({ status: 'pago', pago_em: new Date().toISOString() })
      .eq('salao_id', salaoId).eq('mes_referencia', mesStr).eq('status', 'pendente')
    await carregar(salaoId, mesOffset)
  }

  // Agrupar por funcionário
  type ResumoFunc = {
    func: Funcionario
    atendimentos: Agendamento[]
    comissoes: Comissao[]
    totalComissao: number
    totalPago: number
    totalPendente: number
  }

  const resumoPorFunc: ResumoFunc[] = funcionarios.map(func => {
    const ags = agendamentos.filter(a => a.funcionario_nome === func.nome)
    const coms = comissoes.filter(c => c.funcionario_id === func.id)
    const totalComissao = coms.reduce((acc, c) => acc + c.valor_comissao, 0)
    const totalPago = coms.filter(c => c.status === 'pago').reduce((acc, c) => acc + c.valor_comissao, 0)
    const totalPendente = coms.filter(c => c.status === 'pendente').reduce((acc, c) => acc + c.valor_comissao, 0)
    return { func, atendimentos: ags, comissoes: coms, totalComissao, totalPago, totalPendente }
  }).filter(r => r.atendimentos.length > 0 || r.comissoes.length > 0)

  const totalGeralComissao = resumoPorFunc.reduce((acc, r) => acc + r.totalComissao, 0)
  const totalGeralPago = resumoPorFunc.reduce((acc, r) => acc + r.totalPago, 0)
  const totalGeralPendente = resumoPorFunc.reduce((acc, r) => acc + r.totalPendente, 0)
  const totalAtendimentos = agendamentos.length

  const card = { background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18 }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.text}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <Layout>
      <style>{`
        .com { max-width: 1000px; margin: 0 auto; padding: 28px 20px; }
        .com-kpi { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
        .com-card { background: ${t.bgCard}; border: 0.5px solid ${t.borderCard}; border-radius: 18px; overflow: hidden; }
        .com-row { padding: 12px 18px; border-bottom: 0.5px solid ${t.rowBorder}; display: flex; align-items: center; gap: 10px; }
        .com-row:last-child { border-bottom: none; }
        @media (max-width: 768px) {
          .com { padding: 14px 12px; }
          .com-kpi { grid-template-columns: 1fr 1fr; gap: 10px; }
        }
      `}</style>

      <div className="com">
        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: t.textFaint, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Financeiro</p>
            <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Comissões</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={calcularComissoes} disabled={processando || agendamentos.length === 0}
              style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 600, opacity: processando || agendamentos.length === 0 ? 0.5 : 1 }}>
              {processando ? '⏳ Calculando...' : '⚡ Calcular comissões'}
            </button>
            {totalGeralPendente > 0 && (
              <button onClick={pagarTodas}
                style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                ✓ Pagar todas (R$ {totalGeralPendente.toFixed(2)})
              </button>
            )}
          </div>
        </div>

        {/* Navegação de mês */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setMesOffset(mesOffset - 1)}
            style={{ background: t.bgCard, border: `0.5px solid ${t.border}`, color: t.text, borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }}>‹</button>
          <p style={{ flex: 1, color: t.text, fontSize: 14, fontWeight: 500, margin: 0, textAlign: 'center' }}>{mesLabel}</p>
          {mesOffset < 0 && (
            <button onClick={() => setMesOffset(0)}
              style={{ background: 'none', border: `0.5px solid ${t.border}`, color: '#6366f1', borderRadius: 8, padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
              Mês atual
            </button>
          )}
          <button onClick={() => setMesOffset(mesOffset + 1)} disabled={mesOffset >= 0}
            style={{ background: t.bgCard, border: `0.5px solid ${t.border}`, color: t.text, borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', opacity: mesOffset >= 0 ? 0.4 : 1 }}>›</button>
        </div>

        {/* KPIs */}
        <div className="com-kpi">
          {[
            { label: 'Total atendimentos', value: totalAtendimentos, sub: 'concluídos no mês', cor: '#6366f1' },
            { label: 'Total comissões', value: `R$ ${totalGeralComissao.toFixed(2)}`, sub: 'calculadas', cor: t.text },
            { label: 'Já pago', value: `R$ ${totalGeralPago.toFixed(2)}`, sub: 'funcionários', cor: '#22c55e' },
            { label: 'A pagar', value: `R$ ${totalGeralPendente.toFixed(2)}`, sub: 'pendente', cor: '#f59e0b' },
          ].map(k => (
            <div key={k.label} style={{ ...card, padding: '18px 20px' }}>
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 600 }}>{k.label}</p>
              <p style={{ color: k.cor, fontSize: 24, fontWeight: 200, letterSpacing: -1, margin: '0 0 2px', lineHeight: 1 }}>{k.value}</p>
              <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Aviso se não calculou */}
        {comissoes.length === 0 && agendamentos.length > 0 && (
          <div style={{ background: '#fef9ec', border: '1px solid #fde68a', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 24 }}>💡</span>
            <div>
              <p style={{ color: '#92400e', fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>Clique em &quot;Calcular comissões&quot;</p>
              <p style={{ color: '#b45309', fontSize: 12, margin: 0 }}>
                Há {agendamentos.length} atendimento{agendamentos.length > 1 ? 's' : ''} concluído{agendamentos.length > 1 ? 's' : ''} no mês. Calcule as comissões para cada profissional.
              </p>
            </div>
          </div>
        )}

        {/* Lista por funcionário */}
        {resumoPorFunc.length === 0 ? (
          <div className="com-card" style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
            <p style={{ color: t.text, fontSize: 14, fontWeight: 500, margin: '0 0 6px' }}>
              {agendamentos.length === 0 ? 'Nenhum atendimento concluído' : 'Nenhuma comissão calculada'}
            </p>
            <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>
              {agendamentos.length === 0
                ? 'Conclua atendimentos na agenda para calcular comissões'
                : 'Clique em &quot;Calcular comissões&quot; para gerar os valores'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {resumoPorFunc.map(({ func, atendimentos, comissoes: coms, totalComissao, totalPago, totalPendente }) => {
              const cor = corFunc(func.nome)
              const isAberto = funcSelecionado === func.id
              const todosPago = coms.length > 0 && coms.every(c => c.status === 'pago')
              return (
                <div key={func.id} className="com-card">
                  {/* Header do funcionário */}
                  <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                    onClick={() => setFuncSelecionado(isAberto ? null : func.id)}>
                    <div style={{ width: 46, height: 46, borderRadius: '50%', background: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                      {func.nome.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <p style={{ color: t.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{func.nome}</p>
                        {todosPago && <span style={{ background: '#f0fdf4', color: '#15803d', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>✓ Pago</span>}
                        {totalPendente > 0 && <span style={{ background: '#fef9ec', color: '#b45309', fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Pendente</span>}
                      </div>
                      <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>
                        {func.cargo || 'Profissional'} · {func.comissao_pct || 0}% comissão · {atendimentos.length} atendimento{atendimentos.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ color: cor, fontSize: 22, fontWeight: 300, margin: '0 0 2px', letterSpacing: -1 }}>R$ {totalComissao.toFixed(2)}</p>
                      <p style={{ color: t.textFaint, fontSize: 10, margin: 0 }}>{isAberto ? '▲ fechar' : '▼ detalhes'}</p>
                    </div>
                  </div>

                  {/* Detalhes expandidos */}
                  {isAberto && (
                    <div style={{ borderTop: `0.5px solid ${t.rowBorder}` }}>
                      {/* Barra de status */}
                      <div style={{ padding: '12px 20px', background: t.bg, display: 'flex', gap: 16 }}>
                        {[
                          { label: 'Total', value: `R$ ${totalComissao.toFixed(2)}`, cor: t.text },
                          { label: 'Pago', value: `R$ ${totalPago.toFixed(2)}`, cor: '#22c55e' },
                          { label: 'Pendente', value: `R$ ${totalPendente.toFixed(2)}`, cor: '#f59e0b' },
                        ].map(item => (
                          <div key={item.label} style={{ textAlign: 'center', flex: 1 }}>
                            <p style={{ color: item.cor, fontSize: 16, fontWeight: 500, margin: '0 0 2px' }}>{item.value}</p>
                            <p style={{ color: t.textFaint, fontSize: 10, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>{item.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Lista de atendimentos */}
                      <div style={{ borderTop: `0.5px solid ${t.rowBorder}` }}>
                        <div style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>Atendimentos</p>
                          {totalPendente > 0 && (
                            <button onClick={() => pagarComissao(func.id)}
                              style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                              ✓ Marcar R$ {totalPendente.toFixed(2)} como pago
                            </button>
                          )}
                        </div>
                        {atendimentos.map((ag, i) => {
                          const com = coms.find(c => c.agendamento_id === ag.id)
                          return (
                            <div key={ag.id} className="com-row">
                              <div style={{ width: 7, height: 7, borderRadius: '50%', background: com?.status === 'pago' ? '#22c55e' : '#f59e0b', flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ color: t.text, fontSize: 12, fontWeight: 500, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ag.cliente_nome}</p>
                                <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>
                                  {new Date(ag.data+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} às {ag.horario.slice(0,5)}
                                  {ag.servico ? ` · ${ag.servico}` : ''}
                                </p>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                {com ? (
                                  <>
                                    <p style={{ color: t.text, fontSize: 13, fontWeight: 600, margin: '0 0 1px' }}>R$ {com.valor_comissao.toFixed(2)}</p>
                                    <span style={{ background: com.status === 'pago' ? '#f0fdf4' : '#fef9ec', color: com.status === 'pago' ? '#15803d' : '#b45309', fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                                      {com.status === 'pago' ? '✓ Pago' : 'Pendente'}
                                    </span>
                                  </>
                                ) : (
                                  <span style={{ color: t.textFaint, fontSize: 11 }}>Não calculado</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Histórico de meses anteriores */}
        <div style={{ marginTop: 24, ...card, padding: '18px 20px' }}>
          <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 14px', fontWeight: 600 }}>Navegar por meses anteriores</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Array.from({ length: 6 }, (_, i) => {
              const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
              const off = -i
              return (
                <button key={i} onClick={() => setMesOffset(off)}
                  style={{ background: mesOffset === off ? t.text : t.bg, color: mesOffset === off ? t.bg : t.textMuted, border: `0.5px solid ${t.border}`, borderRadius: 8, padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontWeight: mesOffset === off ? 600 : 400 }}>
                  {MESES_CURTOS[d.getMonth()]} {d.getFullYear()}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Layout>
  )
}
