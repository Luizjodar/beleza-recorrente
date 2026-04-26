'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '../lib/tema'
import Navbar from '../components/Navbar'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const DIAS_FULL = ['Domingo', 'Segunda-feira', 'Terca-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sabado']
const MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const STATUS_CONFIG: any = {
  pendente:   { bg: '#fef9ec', text: '#b45309', dot: '#f59e0b', label: 'Pendente' },
  confirmado: { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Confirmado' },
  concluido:  { bg: '#f5f5f5', text: '#666',    dot: '#aaa',    label: 'Concluido' },
  cancelado:  { bg: '#fff1f2', text: '#be123c', dot: '#f43f5e', label: 'Cancelado' },
}

function gerarHorarios(inicio: string, fim: string, intervalo: number): string[] {
  const result: string[] = []
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fim.split(':').map(Number)
  let mins = hi * 60 + mi
  const fimMins = hf * 60 + mf
  while (mins < fimMins) {
    const h = Math.floor(mins / 60).toString().padStart(2, '0')
    const m = (mins % 60).toString().padStart(2, '0')
    result.push(`${h}:${m}`)
    mins += intervalo
  }
  return result
}

export default function AgendaPage() {
  const router = useRouter()
  const { t } = useTema()
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [horariosSalao, setHorariosSalao] = useState<any[]>([])
  const [view, setView] = useState<'semana' | 'mes'>('semana')
  const [offset, setOffset] = useState(0)
  const [novoAberto, setNovoAberto] = useState(false)
  const [processando, setProcessando] = useState<string | null>(null)

  const hoje = new Date()
  const [diaSelecionado, setDiaSelecionado] = useState(hoje.toISOString().split('T')[0])
  const diaHoje = hoje.toISOString().split('T')[0]

  // Form
  const [nomeCliente, setNomeCliente] = useState('')
  const [whatsCliente, setWhatsCliente] = useState('')
  const [servico, setServico] = useState('')
  const [dataAg, setDataAg] = useState(diaSelecionado)
  const [horarioAg, setHorarioAg] = useState('')
  const [obs, setObs] = useState('')

  // Calcula periodo visivel
  const periodoAtual = () => {
    if (view === 'semana') {
      const ini = new Date(hoje)
      ini.setDate(hoje.getDate() - hoje.getDay() + offset * 7)
      const dias = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ini); d.setDate(ini.getDate() + i); return d
      })
      return { dias, inicio: dias[0].toISOString().split('T')[0], fim: dias[6].toISOString().split('T')[0] }
    } else {
      const ref = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1)
      const inicio = new Date(ref.getFullYear(), ref.getMonth(), 1)
      const fim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
      // Preenche dias do mes incluindo dias do mes anterior/proximo para completar semanas
      const primeiroDiaSemana = inicio.getDay()
      const dias: Date[] = []
      for (let i = -primeiroDiaSemana; i < 42 - primeiroDiaSemana; i++) {
        const d = new Date(inicio); d.setDate(1 + i); dias.push(d)
      }
      return { dias, inicio: inicio.toISOString().split('T')[0], fim: fim.toISOString().split('T')[0], ref }
    }
  }

  const periodo = periodoAtual()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) { router.push('/dashboard'); return }
      setSalaoId(salao.id)
      await recarregar(salao.id, periodo.inicio, periodo.fim)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (salaoId) recarregar(salaoId, periodo.inicio, periodo.fim)
  }, [offset, view, salaoId])

  async function recarregar(id: string, inicio: string, fim: string) {
    // Para o mes, busca um periodo maior
    const inicioExt = new Date(inicio); inicioExt.setDate(inicioExt.getDate() - 7)
    const fimExt = new Date(fim); fimExt.setDate(fimExt.getDate() + 7)
    const [{ data: ags }, { data: hs }] = await Promise.all([
      supabase.from('agendamentos').select('*').eq('salao_id', id)
        .gte('data', inicioExt.toISOString().split('T')[0])
        .lte('data', fimExt.toISOString().split('T')[0])
        .order('data').order('horario'),
      supabase.from('horarios_salao').select('*').eq('salao_id', id),
    ])
    setAgendamentos(ags || [])
    setHorariosSalao(hs || [])
  }

  async function salvarAgendamento() {
    if (!nomeCliente || !dataAg || !horarioAg || !salaoId) return
    setProcessando('novo')
    await supabase.from('agendamentos').insert({
      salao_id: salaoId, cliente_nome: nomeCliente,
      cliente_whatsapp: whatsCliente, servico,
      data: dataAg, horario: horarioAg + ':00', observacao: obs,
    })
    await recarregar(salaoId, periodo.inicio, periodo.fim)
    setNomeCliente(''); setWhatsCliente(''); setServico('')
    setHorarioAg(''); setObs(''); setNovoAberto(false)
    setProcessando(null)
  }

  async function alterarStatus(id: string, status: string) {
    setProcessando(id)
    await supabase.from('agendamentos').update({ status }).eq('id', id)
    setAgendamentos(agendamentos.map(a => a.id === id ? { ...a, status } : a))
    setProcessando(null)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir agendamento?')) return
    await supabase.from('agendamentos').delete().eq('id', id)
    setAgendamentos(agendamentos.filter(a => a.id !== id))
  }

  const agDia = (data: string) => agendamentos.filter(a => a.data === data)
  const agHoje = agDia(diaSelecionado)

  const diaSelecionadoObj = new Date(diaSelecionado + 'T12:00:00')
  const diaSemanaNum = diaSelecionadoObj.getDay()
  const configDia = horariosSalao.find(h => h.dia_semana === diaSemanaNum && h.ativo)
  const horariosDisponiveis = configDia
    ? gerarHorarios(configDia.hora_inicio, configDia.hora_fim, configDia.intervalo_min)
    : []

  const inputStyle = {
    width: '100%', border: `0.5px solid ${t.border}`, borderRadius: 10,
    padding: '10px 14px', background: t.bgInput, fontSize: 13,
    color: t.text, outline: 'none', boxSizing: 'border-box' as const,
  }

  const labelAtual = () => {
    if (view === 'semana') {
      const dias = periodo.dias as Date[]
      return `${dias[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — ${dias[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`
    } else {
      const ref = (periodo as any).ref as Date
      return `${MESES[ref.getMonth()]} ${ref.getFullYear()}`
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textFaint, fontSize: 12, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: t.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Gestao</p>
            <h1 style={{ color: t.text, fontSize: 28, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Agenda</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Toggle Semana/Mes */}
            <div style={{ display: 'flex', background: t.bgCard, border: `0.5px solid ${t.border}`, borderRadius: 10, padding: 3 }}>
              {(['semana', 'mes'] as const).map(v => (
                <button key={v} onClick={() => { setView(v); setOffset(0) }}
                  style={{ background: view === v ? t.text : 'none', color: view === v ? t.bg : t.textMuted, border: 'none', borderRadius: 8, padding: '6px 16px', fontSize: 12, cursor: 'pointer', fontWeight: view === v ? 500 : 400, transition: 'all 0.15s' }}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={() => router.push('/agenda/horarios')}
              style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 10, padding: '9px 16px', fontSize: 12, cursor: 'pointer' }}>
              Configurar horarios
            </button>
            <button onClick={() => { setDataAg(diaSelecionado); setNovoAberto(true) }}
              style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
              + Novo agendamento
            </button>
          </div>
        </div>

        {/* Navegacao */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button onClick={() => setOffset(offset - 1)}
            style={{ background: t.bgCard, border: `0.5px solid ${t.border}`, color: t.text, borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>←</button>
          <p style={{ color: t.text, fontSize: 13, fontWeight: 500, margin: 0, flex: 1, textAlign: 'center' }}>{labelAtual()}</p>
          {offset !== 0 && (
            <button onClick={() => { setOffset(0); setDiaSelecionado(diaHoje) }}
              style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: '7px 12px', fontSize: 11, cursor: 'pointer' }}>
              Hoje
            </button>
          )}
          <button onClick={() => setOffset(offset + 1)}
            style={{ background: t.bgCard, border: `0.5px solid ${t.border}`, color: t.text, borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>→</button>
        </div>

        {/* VISAO SEMANA */}
        {view === 'semana' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 20 }}>
              {(periodo.dias as Date[]).map((dia, i) => {
                const dataStr = dia.toISOString().split('T')[0]
                const ags = agDia(dataStr)
                const isHoje = dataStr === diaHoje
                const isSelecionado = diaSelecionado === dataStr
                const confirmados = ags.filter(a => a.status === 'confirmado').length
                const pendentes = ags.filter(a => a.status === 'pendente').length
                return (
                  <div key={i} onClick={() => setDiaSelecionado(dataStr)}
                    style={{ background: isSelecionado ? t.text : t.bgCard, border: `0.5px solid ${isHoje && !isSelecionado ? t.accentBar : t.borderCard}`, borderRadius: 14, padding: '10px 8px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <p style={{ color: isSelecionado ? t.bg : t.textFaint, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 3px', textAlign: 'center' }}>{DIAS[i]}</p>
                    <p style={{ color: isSelecionado ? t.bg : t.text, fontSize: 20, fontWeight: isHoje ? 600 : 300, margin: '0 0 8px', textAlign: 'center', lineHeight: 1 }}>{dia.getDate()}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {confirmados > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: isSelecionado ? 'rgba(255,255,255,0.6)' : '#22c55e' }} /><span style={{ color: isSelecionado ? 'rgba(255,255,255,0.7)' : '#15803d', fontSize: 10 }}>{confirmados}</span></div>}
                      {pendentes > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: isSelecionado ? 'rgba(255,255,255,0.6)' : '#f59e0b' }} /><span style={{ color: isSelecionado ? 'rgba(255,255,255,0.7)' : '#b45309', fontSize: 10 }}>{pendentes}</span></div>}
                      {ags.length === 0 && <p style={{ color: isSelecionado ? 'rgba(255,255,255,0.3)' : t.textFaint, fontSize: 10, margin: 0, textAlign: 'center' }}>livre</p>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Layout semana: linha do tempo + painel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
              <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: t.text, fontSize: 14, fontWeight: 500, margin: 0 }}>{DIAS_FULL[diaSelecionadoObj.getDay()]}</p>
                    <p style={{ color: t.textFaint, fontSize: 12, margin: '2px 0 0' }}>{diaSelecionadoObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]: any) => {
                      const count = agHoje.filter(a => a.status === key).length
                      if (count === 0) return null
                      return <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot }} /><span style={{ color: t.textMuted, fontSize: 11 }}>{count}</span></div>
                    })}
                  </div>
                </div>
                {horariosDisponiveis.length === 0 ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <p style={{ color: t.textFaint, fontSize: 13, marginBottom: 12 }}>{configDia === undefined ? 'Horarios nao configurados' : 'Salao fechado neste dia'}</p>
                    <button onClick={() => router.push('/agenda/horarios')} style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: '8px 16px', fontSize: 12, cursor: 'pointer' }}>Configurar horarios</button>
                  </div>
                ) : (
                  <div style={{ padding: '12px 0' }}>
                    {horariosDisponiveis.map((hora, i) => {
                      const ag = agHoje.find(a => a.horario.slice(0, 5) === hora)
                      const cfg = ag ? STATUS_CONFIG[ag.status] : null
                      return (
                        <div key={hora} style={{ display: 'flex', borderBottom: i < horariosDisponiveis.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none' }}>
                          <div style={{ width: 64, padding: '14px 12px', flexShrink: 0, borderRight: `0.5px solid ${t.rowBorder}` }}>
                            <p style={{ color: t.textFaint, fontSize: 12, margin: 0, fontWeight: 500 }}>{hora}</p>
                          </div>
                          <div style={{ flex: 1, padding: '10px 16px' }}>
                            {ag ? (
                              <div style={{ background: cfg.bg, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                                  <div>
                                    <p style={{ color: cfg.text, fontSize: 13, fontWeight: 500, margin: '0 0 2px' }}>{ag.cliente_nome}</p>
                                    <p style={{ color: cfg.text, fontSize: 11, margin: 0, opacity: 0.8 }}>{ag.servico || 'Servico nao informado'}</p>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                  <select value={ag.status} onChange={e => alterarStatus(ag.id, e.target.value)} disabled={processando === ag.id}
                                    style={{ background: 'transparent', border: 'none', color: cfg.text, fontSize: 11, cursor: 'pointer', outline: 'none' }}>
                                    <option value="pendente">Pendente</option>
                                    <option value="confirmado">Confirmado</option>
                                    <option value="concluido">Concluido</option>
                                    <option value="cancelado">Cancelado</option>
                                  </select>
                                  <button onClick={() => excluir(ag.id)} style={{ background: 'none', border: 'none', color: cfg.text, fontSize: 14, cursor: 'pointer', opacity: 0.6 }}>✕</button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => { setDataAg(diaSelecionado); setHorarioAg(hora); setNovoAberto(true) }}
                                style={{ background: 'none', border: 'none', color: t.textFaint, fontSize: 12, cursor: 'pointer', padding: '4px 0', width: '100%', textAlign: 'left', opacity: 0 }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                                + agendar
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Painel lateral */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '20px' }}>
                  <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 16px' }}>Resumo do dia</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { label: 'Total agendados', val: agHoje.filter(a => a.status !== 'cancelado').length, color: t.text },
                      { label: 'Confirmados', val: agHoje.filter(a => a.status === 'confirmado').length, color: '#16a34a' },
                      { label: 'Pendentes', val: agHoje.filter(a => a.status === 'pendente').length, color: '#b45309' },
                      { label: 'Horarios livres', val: Math.max(0, horariosDisponiveis.length - agHoje.filter(a => a.status !== 'cancelado').length), color: t.textMuted },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: t.textMuted, fontSize: 13 }}>{item.label}</span>
                        <span style={{ color: item.color, fontSize: 20, fontWeight: 300 }}>{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, overflow: 'hidden', flex: 1 }}>
                  <div style={{ padding: '16px 20px', borderBottom: `0.5px solid ${t.rowBorder}` }}>
                    <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>Agendamentos</p>
                  </div>
                  {agHoje.length === 0 ? (
                    <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                      <p style={{ color: t.textFaint, fontSize: 12, margin: '0 0 12px' }}>Nenhum agendamento</p>
                      <button onClick={() => { setDataAg(diaSelecionado); setNovoAberto(true) }}
                        style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 11, cursor: 'pointer' }}>+ Adicionar</button>
                    </div>
                  ) : agHoje.map((a, i) => {
                    const cfg = STATUS_CONFIG[a.status]
                    return (
                      <div key={a.id} style={{ padding: '12px 20px', borderBottom: i < agHoje.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, marginTop: 4, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <p style={{ color: t.text, fontSize: 12, fontWeight: 500, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>{a.cliente_nome}</p>
                            <span style={{ color: t.textFaint, fontSize: 11 }}>{a.horario.slice(0, 5)}</span>
                          </div>
                          <p style={{ color: t.textFaint, fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.servico || 'Servico nao informado'}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* VISAO MES */}
        {view === 'mes' && (
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, overflow: 'hidden' }}>
            {/* Cabecalho dias da semana */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `0.5px solid ${t.rowBorder}` }}>
              {DIAS.map(d => (
                <div key={d} style={{ padding: '10px 0', textAlign: 'center' }}>
                  <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>{d}</p>
                </div>
              ))}
            </div>
            {/* Grade do mes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {(periodo.dias as Date[]).map((dia, i) => {
                const dataStr = dia.toISOString().split('T')[0]
                const ags = agDia(dataStr)
                const isHoje = dataStr === diaHoje
                const isSelecionado = diaSelecionado === dataStr
                const ref = (periodo as any).ref as Date
                const mesAtual = dia.getMonth() === ref.getMonth()
                const confirmados = ags.filter(a => a.status === 'confirmado').length
                const pendentes = ags.filter(a => a.status === 'pendente').length
                return (
                  <div key={i} onClick={() => setDiaSelecionado(dataStr)}
                    style={{ minHeight: 90, padding: '8px 10px', borderRight: (i + 1) % 7 !== 0 ? `0.5px solid ${t.rowBorder}` : 'none', borderBottom: i < 35 ? `0.5px solid ${t.rowBorder}` : 'none', background: isSelecionado ? t.text : 'transparent', cursor: 'pointer', transition: 'background 0.1s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: isHoje ? 13 : 12, fontWeight: isHoje ? 700 : 400, background: isHoje && !isSelecionado ? t.text : 'transparent', color: isSelecionado ? t.bg : isHoje && !isSelecionado ? t.bg : mesAtual ? t.text : t.textFaint, borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {dia.getDate()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {ags.slice(0, 3).map(a => {
                        const cfg = STATUS_CONFIG[a.status]
                        return (
                          <div key={a.id} style={{ background: isSelecionado ? 'rgba(255,255,255,0.2)' : cfg.bg, borderRadius: 4, padding: '2px 6px' }}>
                            <p style={{ color: isSelecionado ? t.bg : cfg.text, fontSize: 10, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {a.horario.slice(0, 5)} {a.cliente_nome.split(' ')[0]}
                            </p>
                          </div>
                        )
                      })}
                      {ags.length > 3 && <p style={{ color: isSelecionado ? 'rgba(255,255,255,0.5)' : t.textFaint, fontSize: 10, margin: 0 }}>+{ags.length - 3} mais</p>}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Detalhe do dia selecionado no mes */}
            {agHoje.length > 0 && (
              <div style={{ borderTop: `0.5px solid ${t.rowBorder}`, padding: '16px 20px' }}>
                <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 12px' }}>
                  {diaSelecionadoObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {agHoje.map(a => {
                    const cfg = STATUS_CONFIG[a.status]
                    return (
                      <div key={a.id} style={{ background: cfg.bg, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot }} />
                          <div>
                            <p style={{ color: cfg.text, fontSize: 13, fontWeight: 500, margin: '0 0 2px' }}>{a.horario.slice(0, 5)} — {a.cliente_nome}</p>
                            <p style={{ color: cfg.text, fontSize: 11, margin: 0, opacity: 0.8 }}>{a.servico || 'Servico nao informado'}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <select value={a.status} onChange={e => alterarStatus(a.id, e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: cfg.text, fontSize: 11, cursor: 'pointer', outline: 'none' }}>
                            <option value="pendente">Pendente</option>
                            <option value="confirmado">Confirmado</option>
                            <option value="concluido">Concluido</option>
                            <option value="cancelado">Cancelado</option>
                          </select>
                          <button onClick={() => excluir(a.id)} style={{ background: 'none', border: 'none', color: cfg.text, fontSize: 14, cursor: 'pointer', opacity: 0.6 }}>✕</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal novo agendamento */}
        {novoAberto && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 20, padding: '32px', width: '100%', maxWidth: 480 }}>
              <h2 style={{ color: t.text, fontSize: 18, fontWeight: 400, margin: '0 0 24px' }}>Novo agendamento</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Nome *</label>
                    <input value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} placeholder="Ex: Ana Paula" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>WhatsApp</label>
                    <input value={whatsCliente} onChange={e => setWhatsCliente(e.target.value)} placeholder="5519..." style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Servico</label>
                  <input value={servico} onChange={e => setServico(e.target.value)} placeholder="Ex: Corte + Escova" style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Data *</label>
                    <input type="date" value={dataAg} onChange={e => setDataAg(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Horario *</label>
                    {horariosDisponiveis.length > 0 ? (
                      <select value={horarioAg} onChange={e => setHorarioAg(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const }}>
                        <option value="">Selecione...</option>
                        {horariosDisponiveis.map(h => {
                          const ocupado = agHoje.some(a => a.horario.slice(0, 5) === h && a.status !== 'cancelado')
                          return <option key={h} value={h} disabled={ocupado}>{h}{ocupado ? ' (ocupado)' : ''}</option>
                        })}
                      </select>
                    ) : (
                      <input type="time" value={horarioAg} onChange={e => setHorarioAg(e.target.value)} style={inputStyle} />
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Observacao</label>
                  <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button onClick={salvarAgendamento} disabled={processando === 'novo' || !nomeCliente || !dataAg || !horarioAg}
                  style={{ flex: 1, background: !nomeCliente || !dataAg || !horarioAg ? t.border : t.text, color: t.bg, border: 'none', borderRadius: 10, padding: 13, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                  {processando === 'novo' ? 'Salvando...' : 'Salvar agendamento'}
                </button>
                <button onClick={() => { setNovoAberto(false); setHorarioAg('') }}
                  style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 10, padding: '13px 20px', fontSize: 12, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
