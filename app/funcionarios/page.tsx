'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '@/app/lib/tema'
import Layout from '../components/Layout'

type Funcionario = {
  id: string; nome: string; cargo?: string; telefone?: string
  email?: string; comissao_pct?: number; ativo: boolean; criado_em?: string
}
type Agendamento = {
  id: string; data: string; horario: string; servico?: string
  status?: string; funcionario_nome?: string; cliente_nome: string
}

const CARGOS = ['Cabeleireira', 'Manicure', 'Pedicure', 'Esteticista', 'Maquiadora', 'Colorista', 'Depiladora', 'Recepcionista', 'Outro']
const CORES = ['#6366f1','#ec4899','#10b981','#f59e0b','#06b6d4','#8b5cf6','#f43f5e','#84cc16']

function corFunc(nome: string) {
  return CORES[nome.charCodeAt(0) % CORES.length]
}

export default function FuncionariosPage() {
  const router = useRouter()
  const { t } = useTema()
  const [loading, setLoading] = useState(true)
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [selecionado, setSelecionado] = useState<Funcionario | null>(null)
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<Funcionario | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [abaPerfil, setAbaPerfil] = useState<'agenda'|'producao'|'comissao'>('agenda')

  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [comissao, setComissao] = useState('30')

  const hoje = useMemo(() => new Date(), [])
  const mesRef = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,'0')}`

  const carregar = useCallback(async (id: string) => {
    const [{ data: funcs }, { data: ags }] = await Promise.all([
      supabase.from('funcionarios').select('*').eq('salao_id', id).order('criado_em'),
      supabase.from('agendamentos').select('id,data,horario,servico,status,funcionario_nome,cliente_nome').eq('salao_id', id).order('data', { ascending: false }),
    ])
    setFuncionarios((funcs || []) as Funcionario[])
    setAgendamentos((ags || []) as Agendamento[])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) return
      setSalaoId(salao.id)
      await carregar(salao.id)
      setLoading(false)
    }
    init()
  }, [carregar, router])

  function abrir(f?: Funcionario) {
    if (f) {
      setEditando(f); setNome(f.nome); setCargo(f.cargo || '')
      setTelefone(f.telefone || ''); setEmail(f.email || '')
      setComissao(f.comissao_pct?.toString() || '30')
    } else {
      setEditando(null); setNome(''); setCargo(''); setTelefone(''); setEmail(''); setComissao('30')
    }
    setCriando(true)
  }

  async function salvar() {
    if (!nome || !salaoId) return
    setSalvando(true)
    const payload = { salao_id: salaoId, nome, cargo, telefone, email, comissao_pct: parseFloat(comissao) || 0 }
    const { error } = editando
      ? await supabase.from('funcionarios').update(payload).eq('id', editando.id)
      : await supabase.from('funcionarios').insert(payload)
    if (!error) { await carregar(salaoId); setCriando(false); setEditando(null) }
    setSalvando(false)
  }

  async function toggleAtivo(f: Funcionario) {
    await supabase.from('funcionarios').update({ ativo: !f.ativo }).eq('id', f.id)
    setFuncionarios(funcionarios.map(x => x.id === f.id ? { ...x, ativo: !x.ativo } : x))
    if (selecionado?.id === f.id) setSelecionado({ ...f, ativo: !f.ativo })
  }

  // Produtividade por funcionário
  function statsFunc(f: Funcionario) {
    const ags = agendamentos.filter(a => a.funcionario_nome === f.nome)
    const agsMes = ags.filter(a => a.data.startsWith(mesRef))
    const agsHoje = ags.filter(a => a.data === hoje.toISOString().split('T')[0])
    const concluidos = agsMes.filter(a => a.status === 'concluido').length
    const total = agsMes.length
    const cancelados = agsMes.filter(a => a.status === 'cancelado').length
    return { total, concluidos, cancelados, agsHoje, agsMes: ags.filter(a => a.data.startsWith(mesRef)) }
  }

  // Ranking por atendimentos
  const ranking = [...funcionarios]
    .filter(f => f.ativo)
    .map(f => ({ ...f, ...statsFunc(f) }))
    .sort((a, b) => b.concluidos - a.concluidos)

  const totalAtend = agendamentos.filter(a => a.data.startsWith(mesRef) && a.status === 'concluido').length
  const comissaoTotal = funcionarios.reduce((acc, f) => {
    const stats = statsFunc(f)
    return acc + (stats.concluidos * 100 * ((f.comissao_pct || 0) / 100))
  }, 0)

  const inputStyle = { width: '100%', border: `0.5px solid ${t.border}`, borderRadius: 10, padding: '10px 14px', background: t.bgInput, fontSize: 13, color: t.text, outline: 'none', boxSizing: 'border-box' as const }
  const card = { background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18 }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.text}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const stats = selecionado ? statsFunc(selecionado) : null

  return (
    <Layout>
      <style>{`
        .fn { max-width: 1100px; margin: 0 auto; padding: 28px 20px; }
        .fn-kpi { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
        .fn-grid { display: grid; grid-template-columns: 1fr 360px; gap: 16px; }
        .fn-item { padding: 14px 18px; border-bottom: 0.5px solid ${t.rowBorder}; cursor: pointer; transition: background 0.15s; display: flex; align-items: center; gap: 12px; }
        .fn-item:hover { background: ${t.bg}; }
        .fn-item:last-child { border-bottom: none; }
        .aba-btn { padding: 7px 14px; border: none; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
        @media (max-width: 768px) {
          .fn { padding: 14px 12px; }
          .fn-kpi { grid-template-columns: 1fr 1fr; gap: 10px; }
          .fn-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="fn">

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: t.textFaint, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Equipe</p>
            <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Funcionários</h1>
          </div>
          <button onClick={() => abrir()}
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 12, cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
            + Novo funcionário
          </button>
        </div>

        {/* KPIs */}
        <div className="fn-kpi">
          {[
            { label: 'Total equipe', value: funcionarios.length, sub: 'cadastrados', cor: t.text },
            { label: 'Ativos', value: funcionarios.filter(f => f.ativo).length, sub: 'em atividade', cor: '#22c55e' },
            { label: 'Atendimentos mês', value: totalAtend, sub: 'concluídos', cor: '#6366f1' },
            { label: 'Comissões mês', value: `R$ ${comissaoTotal.toFixed(0)}`, sub: 'a pagar', cor: '#f59e0b' },
          ].map(k => (
            <div key={k.label} style={{ ...card, padding: '18px 20px' }}>
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 600 }}>{k.label}</p>
              <p style={{ color: k.cor, fontSize: 26, fontWeight: 200, letterSpacing: -1, margin: '0 0 2px', lineHeight: 1 }}>{k.value}</p>
              <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Ranking do mês */}
        {ranking.length > 0 && (
          <div style={{ ...card, padding: '20px', marginBottom: 20 }}>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 16px', fontWeight: 600 }}>🏆 Ranking do mês</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {ranking.map((f, i) => (
                <div key={f.id} onClick={() => setSelecionado(f)}
                  style={{ flex: 1, minWidth: 120, background: t.bg, borderRadius: 14, padding: '14px', border: `0.5px solid ${selecionado?.id === f.id ? corFunc(f.nome) : t.border}`, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}º`}</div>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: corFunc(f.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 700, margin: '0 auto 8px' }}>
                    {f.nome.charAt(0).toUpperCase()}
                  </div>
                  <p style={{ color: t.text, fontSize: 12, fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nome.split(' ')[0]}</p>
                  <p style={{ color: corFunc(f.nome), fontSize: 18, fontWeight: 300, margin: '4px 0 0', lineHeight: 1 }}>{f.concluidos}</p>
                  <p style={{ color: t.textFaint, fontSize: 10, margin: 0 }}>atendimentos</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="fn-grid">

          {/* Lista de funcionários */}
          <div style={card}>
            {funcionarios.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                <p style={{ color: t.textFaint, fontSize: 13, margin: '0 0 16px' }}>Nenhum funcionário cadastrado</p>
                <button onClick={() => abrir()} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                  + Adicionar
                </button>
              </div>
            ) : funcionarios.map(f => {
              const s = statsFunc(f)
              const cor = corFunc(f.nome)
              const isSel = selecionado?.id === f.id
              return (
                <div key={f.id} className="fn-item" onClick={() => setSelecionado(isSel ? null : f)}
                  style={{ background: isSel ? cor+'10' : 'transparent', borderLeft: isSel ? `3px solid ${cor}` : '3px solid transparent', opacity: f.ativo ? 1 : 0.5 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                    {f.nome.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <p style={{ color: t.text, fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nome}</p>
                      <span style={{ background: f.ativo ? '#f0fdf4' : '#f1f5f9', color: f.ativo ? '#15803d' : '#64748b', fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 600, flexShrink: 0 }}>
                        {f.ativo ? 'ativo' : 'inativo'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: t.textFaint, fontSize: 11 }}>{f.cargo || 'Sem cargo'}</span>
                      <span style={{ color: cor, fontSize: 11, fontWeight: 600 }}>{s.concluidos} este mês</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ color: t.text, fontSize: 16, fontWeight: 300, margin: '0 0 1px' }}>{f.comissao_pct || 0}%</p>
                    <p style={{ color: t.textFaint, fontSize: 10, margin: 0 }}>comissão</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Painel lateral */}
          {selecionado ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Card do funcionário */}
              <div style={{ background: `linear-gradient(135deg, ${corFunc(selecionado.nome)}, ${corFunc(selecionado.nome)}cc)`, borderRadius: 18, padding: '24px', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, border: '2px solid rgba(255,255,255,0.4)' }}>
                    {selecionado.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 3px' }}>{selecionado.nome}</h3>
                    <p style={{ fontSize: 12, opacity: 0.8, margin: 0 }}>{selecionado.cargo || 'Sem cargo'}</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { label: 'Comissão', value: `${selecionado.comissao_pct || 0}%` },
                    { label: 'Este mês', value: `${stats!.concluidos} atend.` },
                    { label: 'WhatsApp', value: selecionado.telefone || '—' },
                    { label: 'Email', value: selecionado.email ? '✓' : '—' },
                  ].map(i => (
                    <div key={i.label} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 12px' }}>
                      <p style={{ fontSize: 10, opacity: 0.7, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 1 }}>{i.label}</p>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.value}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={() => abrir(selecionado)}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 0', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                    ✏️ Editar
                  </button>
                  <button onClick={() => toggleAtivo(selecionado)}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 0', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                    {selecionado.ativo ? '⏸ Desativar' : '▶ Ativar'}
                  </button>
                </div>
              </div>

              {/* Abas */}
              <div style={{ ...card, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', gap: 4 }}>
                  {([
                    { key: 'agenda', label: '📅 Agenda' },
                    { key: 'producao', label: '📊 Produção' },
                    { key: 'comissao', label: '💰 Comissão' },
                  ] as const).map(aba => (
                    <button key={aba.key} onClick={() => setAbaPerfil(aba.key)} className="aba-btn"
                      style={{ background: abaPerfil === aba.key ? corFunc(selecionado.nome) : t.bg, color: abaPerfil === aba.key ? 'white' : t.textMuted, border: `0.5px solid ${abaPerfil === aba.key ? 'transparent' : t.border}` }}>
                      {aba.label}
                    </button>
                  ))}
                </div>

                <div style={{ padding: '16px', maxHeight: 320, overflowY: 'auto' }}>

                  {/* ABA AGENDA */}
                  {abaPerfil === 'agenda' && (
                    <div>
                      <p style={{ color: t.textFaint, fontSize: 11, margin: '0 0 12px' }}>Agendamentos de hoje e próximos</p>
                      {stats!.agsMes.slice(0, 8).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 0' }}>
                          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
                          <p style={{ color: t.textFaint, fontSize: 12 }}>Sem agendamentos este mês</p>
                        </div>
                      ) : stats!.agsMes.slice(0, 8).map((ag, i) => {
                        const statusCor: Record<string, string> = { confirmado: '#22c55e', concluido: '#6366f1', cancelado: '#ef4444', pendente: '#f59e0b', em_atendimento: '#3b82f6' }
                        return (
                          <div key={ag.id} style={{ display: 'flex', gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: i < stats!.agsMes.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusCor[ag.status||'pendente'] || '#aaa', marginTop: 4, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ color: t.text, fontSize: 12, fontWeight: 500, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ag.cliente_nome}</p>
                              <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>
                                {new Date(ag.data+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} às {ag.horario.slice(0,5)}
                                {ag.servico ? ` · ${ag.servico}` : ''}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ABA PRODUÇÃO */}
                  {abaPerfil === 'producao' && (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                        {[
                          { label: 'Concluídos', value: stats!.concluidos, cor: '#22c55e' },
                          { label: 'Total agend.', value: stats!.total, cor: '#6366f1' },
                          { label: 'Cancelados', value: stats!.cancelados, cor: '#ef4444' },
                          { label: 'Taxa conclusão', value: stats!.total > 0 ? `${Math.round((stats!.concluidos/stats!.total)*100)}%` : '—', cor: corFunc(selecionado.nome) },
                        ].map(k => (
                          <div key={k.label} style={{ background: t.bg, borderRadius: 10, padding: '12px', border: `0.5px solid ${t.border}` }}>
                            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>{k.label}</p>
                            <p style={{ color: k.cor, fontSize: 22, fontWeight: 200, margin: 0, lineHeight: 1 }}>{k.value}</p>
                          </div>
                        ))}
                      </div>
                      {/* Barra de desempenho */}
                      <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 600 }}>Desempenho vs equipe</p>
                      {ranking.map((f, i) => {
                        const maxConcl = Math.max(...ranking.map(r => r.concluidos), 1)
                        const pct = maxConcl > 0 ? (f.concluidos / maxConcl) * 100 : 0
                        return (
                          <div key={f.id} style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ color: f.id === selecionado.id ? corFunc(f.nome) : t.textMuted, fontSize: 11, fontWeight: f.id === selecionado.id ? 700 : 400 }}>{f.nome.split(' ')[0]}</span>
                              <span style={{ color: t.textFaint, fontSize: 11 }}>{f.concluidos}</span>
                            </div>
                            <div style={{ background: t.border, borderRadius: 3, height: 5, overflow: 'hidden' }}>
                              <div style={{ background: f.id === selecionado.id ? corFunc(f.nome) : t.border, height: '100%', width: `${pct}%`, borderRadius: 3, transition: 'width 0.5s' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* ABA COMISSÃO */}
                  {abaPerfil === 'comissao' && (
                    <div>
                      <div style={{ background: corFunc(selecionado.nome)+'15', borderRadius: 14, padding: '16px', marginBottom: 16, border: `1px solid ${corFunc(selecionado.nome)}30` }}>
                        <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Comissão do mês</p>
                        <p style={{ color: corFunc(selecionado.nome), fontSize: 32, fontWeight: 200, margin: '0 0 4px', letterSpacing: -1 }}>
                          R$ {(stats!.concluidos * 100 * ((selecionado.comissao_pct || 0) / 100)).toFixed(2)}
                        </p>
                        <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>
                          {stats!.concluidos} atendimentos × R$ 100 × {selecionado.comissao_pct || 0}%
                        </p>
                      </div>
                      <div style={{ background: t.bg, borderRadius: 12, padding: '14px', border: `0.5px solid ${t.border}` }}>
                        <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 12px', fontWeight: 600 }}>Detalhamento</p>
                        {[
                          { label: 'Taxa de comissão', value: `${selecionado.comissao_pct || 0}%` },
                          { label: 'Atendimentos concluídos', value: stats!.concluidos },
                          { label: 'Valor médio por atend.', value: 'R$ 100,00' },
                          { label: 'Total a pagar', value: `R$ ${(stats!.concluidos * 100 * ((selecionado.comissao_pct||0)/100)).toFixed(2)}` },
                        ].map(r => (
                          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `0.5px solid ${t.rowBorder}` }}>
                            <span style={{ color: t.textMuted, fontSize: 12 }}>{r.label}</span>
                            <span style={{ color: t.text, fontSize: 12, fontWeight: 600 }}>{r.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ ...card, padding: '32px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👆</div>
              <p style={{ color: t.text, fontSize: 14, fontWeight: 500, margin: '0 0 6px' }}>Selecione um funcionário</p>
              <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>Clique na lista para ver agenda, produção e comissão</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal novo/editar funcionário */}
      {criando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: t.bgCard, borderRadius: '24px 24px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, background: t.border, borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ color: t.text, fontSize: 18, fontWeight: 500, margin: 0, fontFamily: 'Georgia, serif' }}>
                {editando ? `Editando ${editando.nome.split(' ')[0]}` : 'Novo funcionário'}
              </h2>
              <button onClick={() => { setCriando(false); setEditando(null) }} style={{ background: 'none', border: 'none', color: t.textFaint, fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>Nome *</label>
                  <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>Cargo</label>
                  <select value={cargo} onChange={e => setCargo(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const }}>
                    <option value="">Selecione...</option>
                    {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>WhatsApp</label>
                  <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="5519..." style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>E-mail</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@email.com" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>Comissão (%)</label>
                <input value={comissao} onChange={e => setComissao(e.target.value)} placeholder="Ex: 30" type="number" min="0" max="100" style={inputStyle} />
                <p style={{ color: t.textFaint, fontSize: 11, margin: '6px 0 0' }}>Percentual sobre o valor de cada atendimento</p>
              </div>
            </div>
            <button onClick={salvar} disabled={salvando || !nome}
              style={{ width: '100%', marginTop: 20, background: !nome ? t.border : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: !nome ? t.textFaint : 'white', border: 'none', borderRadius: 12, padding: 14, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              {salvando ? 'Salvando...' : editando ? '✓ Salvar alterações' : '✓ Cadastrar funcionário'}
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
