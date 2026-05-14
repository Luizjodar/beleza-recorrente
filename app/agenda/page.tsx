'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '@/app/lib/tema'
import Layout from '../components/Layout'

const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab']
const DIAS_FULL = ['Domingo','Segunda','Terca','Quarta','Quinta','Sexta','Sabado']
const MESES = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const CORES_SERVICO: Record<string, string> = {
  'Corte': '#6366f1',
  'Escova': '#ec4899',
  'Coloração': '#f59e0b',
  'Coloracao': '#f59e0b',
  'Manicure': '#10b981',
  'Pedicure': '#14b8a6',
  'Sobrancelha': '#8b5cf6',
  'Depilação': '#f43f5e',
  'Depilacao': '#f43f5e',
  'Hidratação': '#06b6d4',
  'Hidratacao': '#06b6d4',
  'Tratamento': '#0ea5e9',
  'Progressiva': '#d97706',
  'Relaxamento': '#7c3aed',
}

function corServico(servico?: string | null): string {
  if (!servico) return '#6366f1'
  for (const [key, cor] of Object.entries(CORES_SERVICO)) {
    if (servico.toLowerCase().includes(key.toLowerCase())) return cor
  }
  const hash = servico.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const hue = hash % 360
  return `hsl(${hue}, 65%, 50%)`
}

type StatusAg = 'pendente' | 'confirmado' | 'em_atendimento' | 'concluido' | 'cancelado'

const STATUS_CFG: Record<StatusAg, { bg: string; text: string; dot: string; label: string; emoji: string }> = {
  pendente:        { bg: '#fef9ec', text: '#b45309', dot: '#f59e0b', label: 'Pendente',        emoji: '⏳' },
  confirmado:      { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Confirmado',      emoji: '✅' },
  em_atendimento:  { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Em atendimento',  emoji: '💈' },
  concluido:       { bg: '#f5f5f5', text: '#555',    dot: '#aaa',    label: 'Concluido',       emoji: '⭐' },
  cancelado:       { bg: '#fff1f2', text: '#be123c', dot: '#f43f5e', label: 'Cancelado',       emoji: '❌' },
}

type Agendamento = {
  id: string; salao_id: string; cliente_nome: string
  cliente_whatsapp?: string | null; servico?: string | null
  data: string; horario: string; observacao?: string | null
  status?: StatusAg | null; duracao_min?: number
  funcionario_nome?: string | null; cor?: string | null
}

type HorarioSalao = {
  dia_semana: number; ativo: boolean
  hora_inicio: string; hora_fim: string; intervalo_min: number
}

type Funcionario = { id: string; nome: string; cargo?: string }

const HORARIOS_PADRAO: HorarioSalao[] = Array.from({ length: 7 }, (_, i) => ({
  dia_semana: i, ativo: i >= 1 && i <= 6,
  hora_inicio: '09:00', hora_fim: '18:00', intervalo_min: 60,
}))

function dataLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function statusAg(s?: string | null): StatusAg {
  return s && s in STATUS_CFG ? s as StatusAg : 'pendente'
}
function gerarHorarios(inicio: string, fim: string, intervalo: number): string[] {
  const result: string[] = []
  const [hi, mi] = inicio.split(':').map(Number)
  const [hf, mf] = fim.split(':').map(Number)
  let mins = hi * 60 + mi
  while (mins < hf * 60 + mf) {
    result.push(`${Math.floor(mins/60).toString().padStart(2,'0')}:${(mins%60).toString().padStart(2,'0')}`)
    mins += intervalo
  }
  return result
}

export default function AgendaPage() {
  const router = useRouter()
  const { t } = useTema()
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [horariosSalao, setHorariosSalao] = useState<HorarioSalao[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [erro, setErro] = useState('')
  const [view, setView] = useState<'semana' | 'mes' | 'dia'>('semana')
  const [offset, setOffset] = useState(0)
  const [novoAberto, setNovoAberto] = useState(false)
  const [agSelecionado, setAgSelecionado] = useState<Agendamento | null>(null)
  const [processando, setProcessando] = useState<string | null>(null)
  const inicializado = useRef(false)

  const hoje = useMemo(() => new Date(), [])
  const [diaSelecionado, setDiaSelecionado] = useState(() => dataLocal(new Date()))
  const diaHoje = dataLocal(hoje)

  // Form novo agendamento
  const [nomeCliente, setNomeCliente] = useState('')
  const [whatsCliente, setWhatsCliente] = useState('')
  const [servico, setServico] = useState('')
  const [dataAg, setDataAg] = useState(diaSelecionado)
  const [horarioAg, setHorarioAg] = useState('')
  const [duracaoAg, setDuracaoAg] = useState('60')
  const [funcionarioAg, setFuncionarioAg] = useState('')
  const [obs, setObs] = useState('')

  const periodo = useMemo(() => {
    if (view === 'semana' || view === 'dia') {
      const ini = new Date(hoje)
      ini.setDate(hoje.getDate() - hoje.getDay() + offset * 7)
      const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(ini); d.setDate(ini.getDate()+i); return d })
      return { dias, inicio: dataLocal(dias[0]), fim: dataLocal(dias[6]) }
    } else {
      const ref = new Date(hoje.getFullYear(), hoje.getMonth()+offset, 1)
      const inicio = new Date(ref.getFullYear(), ref.getMonth(), 1)
      const fim = new Date(ref.getFullYear(), ref.getMonth()+1, 0)
      const pds = inicio.getDay()
      const dias: Date[] = []
      for (let i = -pds; i < 42-pds; i++) { const d = new Date(inicio); d.setDate(1+i); dias.push(d) }
      return { dias, inicio: dataLocal(inicio), fim: dataLocal(fim), ref }
    }
  }, [hoje, offset, view])

  const recarregar = useCallback(async (id: string, inicio: string, fim: string) => {
    const ini2 = new Date(inicio+'T12:00:00'); ini2.setDate(ini2.getDate()-7)
    const fim2 = new Date(fim+'T12:00:00'); fim2.setDate(fim2.getDate()+7)
    const [{ data: ags }, { data: hs }, { data: funcs }] = await Promise.all([
      supabase.from('agendamentos').select('*').eq('salao_id', id).gte('data', dataLocal(ini2)).lte('data', dataLocal(fim2)).order('data').order('horario'),
      supabase.from('horarios_salao').select('*').eq('salao_id', id),
      supabase.from('funcionarios').select('id, nome, cargo').eq('salao_id', id).eq('ativo', true),
    ])
    setAgendamentos((ags || []) as Agendamento[])
    setHorariosSalao(((hs && hs.length > 0) ? hs : HORARIOS_PADRAO) as HorarioSalao[])
    setFuncionarios((funcs || []) as Funcionario[])
  }, [])

  useEffect(() => {
    if (inicializado.current) return
    inicializado.current = true
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
  }, [periodo.fim, periodo.inicio, recarregar, router])

  useEffect(() => {
    if (!salaoId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recarregar(salaoId, periodo.inicio, periodo.fim)
  }, [offset, periodo.fim, periodo.inicio, recarregar, salaoId, view])

  const corAtual = corServico(servico)

  async function salvarAgendamento() {
    if (!nomeCliente || !dataAg || !horarioAg || !salaoId) return
    setProcessando('novo')
    setErro('')
    const { error } = await supabase.from('agendamentos').insert({
      salao_id: salaoId, cliente_nome: nomeCliente, cliente_whatsapp: whatsCliente,
      servico, data: dataAg, horario: horarioAg.length === 5 ? `${horarioAg}:00` : horarioAg,
      observacao: obs, status: 'pendente', duracao_min: parseInt(duracaoAg) || 60,
      funcionario_nome: funcionarioAg || null, cor: corAtual,
    })
    if (!error) {
      await recarregar(salaoId, periodo.inicio, periodo.fim)
      setNomeCliente(''); setWhatsCliente(''); setServico(''); setHorarioAg('')
      setDuracaoAg('60'); setFuncionarioAg(''); setObs(''); setNovoAberto(false)
    } else { setErro(error.message) }
    setProcessando(null)
  }

  async function alterarStatus(id: string, status: string) {
    setProcessando(id)
    const { error } = await supabase.from('agendamentos').update({ status }).eq('id', id)
    if (!error) setAgendamentos(agendamentos.map(a => a.id === id ? { ...a, status: statusAg(status) } : a))
    setProcessando(null)
    if (agSelecionado?.id === id) setAgSelecionado(prev => prev ? { ...prev, status: statusAg(status) } : null)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir agendamento?')) return
    const { error } = await supabase.from('agendamentos').delete().eq('id', id)
    if (!error) { setAgendamentos(agendamentos.filter(a => a.id !== id)); setAgSelecionado(null) }
  }

  const agDia = (data: string) => agendamentos.filter(a => a.data === data)
  const agHoje = agDia(diaSelecionado)
  const diaSelecionadoObj = new Date(diaSelecionado + 'T12:00:00')
  const configDia = horariosSalao.find(h => h.dia_semana === diaSelecionadoObj.getDay() && h.ativo)
  const horariosDisponiveis = configDia ? gerarHorarios(configDia.hora_inicio, configDia.hora_fim, configDia.intervalo_min) : []
  const horariosFormulario = useMemo(() => {
    const diaF = new Date(dataAg+'T12:00:00').getDay()
    const cfg = horariosSalao.find(h => h.dia_semana === diaF && h.ativo)
    return cfg ? gerarHorarios(cfg.hora_inicio, cfg.hora_fim, cfg.intervalo_min) : []
  }, [dataAg, horariosSalao])

  const labelAtual = () => {
    if (view === 'semana' || view === 'dia') {
      const dias = periodo.dias as Date[]
      return `${dias[0].toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} — ${dias[6].toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}`
    }
    const ref = (periodo as { ref?: Date }).ref
    return ref ? `${MESES[ref.getMonth()]} ${ref.getFullYear()}` : ''
  }

  const inputStyle = { width: '100%', border: `0.5px solid ${t.border}`, borderRadius: 10, padding: '10px 14px', background: t.bgInput, fontSize: 13, color: t.text, outline: 'none', boxSizing: 'border-box' as const }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.text}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <Layout>
      <style>{`
        .ag { max-width: 1200px; margin: 0 auto; padding: 28px 20px; }
        .ag-week { display: grid; grid-template-columns: repeat(7,1fr); gap: 8px; margin-bottom: 16px; }
        .ag-layout { display: grid; grid-template-columns: 1fr 280px; gap: 16px; }
        .ag-mes-grid { display: grid; grid-template-columns: repeat(7,1fr); }
        .ag-card { background: ${t.bgCard}; border: 0.5px solid ${t.borderCard}; border-radius: 20px; overflow: hidden; }
        .ag-row { display: flex; border-bottom: 0.5px solid ${t.rowBorder}; transition: background 0.15s; }
        .ag-row:hover { background: ${t.bg}; }
        .hora-col { width: 56px; padding: 10px 8px; border-right: 0.5px solid ${t.rowBorder}; text-align: center; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .ag-slot { flex: 1; padding: 6px 10px; min-height: 52px; display: flex; align-items: center; }
        .ag-item { border-radius: 10px; padding: 8px 12px; width: 100%; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; border-left: 3px solid transparent; }
        .ag-item:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        .ag-add-btn { background: none; border: none; color: ${t.textFaint}; font-size: 12px; cursor: pointer; opacity: 0; transition: opacity 0.15s; padding: 4px 8px; border-radius: 6px; width: 100%; text-align: left; }
        .ag-row:hover .ag-add-btn { opacity: 1; }
        .status-pill { display: inline-flex; align-items: center; gap: 4px; border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 500; cursor: pointer; border: none; }
        @media (max-width: 768px) {
          .ag { padding: 14px 12px; }
          .ag-layout { grid-template-columns: 1fr; }
          .ag-week { gap: 4px; }
          .ag-lateral { order: -1; }
        }
      `}</style>

      <div className="ag">

        {/* Header premium */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: t.textFaint, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Gestao</p>
            <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Agenda</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* View switcher */}
            <div style={{ display: 'flex', background: t.bgCard, border: `0.5px solid ${t.border}`, borderRadius: 12, padding: 3, gap: 2 }}>
              {(['dia','semana','mes'] as const).map(v => (
                <button key={v} onClick={() => { setView(v); setOffset(0) }}
                  style={{ background: view === v ? t.text : 'none', color: view === v ? t.bg : t.textMuted, border: 'none', borderRadius: 9, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: view === v ? 600 : 400, transition: 'all 0.2s' }}>
                  {v.charAt(0).toUpperCase()+v.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={() => router.push('/agenda/horarios')}
              style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 10, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
              ⚙️ Horarios
            </button>
            <button onClick={() => { setDataAg(diaSelecionado); setNovoAberto(true) }}
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 12, cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 14px rgba(99,102,241,0.35)', whiteSpace: 'nowrap' }}>
              + Agendar
            </button>
          </div>
        </div>

        {/* Navegacao */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setOffset(offset-1)} style={{ background: t.bgCard, border: `0.5px solid ${t.border}`, color: t.text, borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }}>‹</button>
          <p style={{ flex: 1, color: t.text, fontSize: 14, fontWeight: 500, margin: 0, textAlign: 'center' }}>{labelAtual()}</p>
          {offset !== 0 && (
            <button onClick={() => { setOffset(0); setDiaSelecionado(diaHoje) }}
              style={{ background: 'none', border: `0.5px solid ${t.border}`, color: '#6366f1', borderRadius: 8, padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
              Hoje
            </button>
          )}
          <button onClick={() => setOffset(offset+1)} style={{ background: t.bgCard, border: `0.5px solid ${t.border}`, color: t.text, borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }}>›</button>
        </div>

        {erro && (
          <div style={{ background: '#fff1f2', border: '0.5px solid #fecdd3', color: '#be123c', borderRadius: 12, padding: '12px 16px', fontSize: 12, marginBottom: 16 }}>{erro}</div>
        )}

        {/* LEGENDA STATUS */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {(Object.entries(STATUS_CFG) as [StatusAg, typeof STATUS_CFG[StatusAg]][]).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: cfg.dot }} />
              <span style={{ color: t.textFaint, fontSize: 11 }}>{cfg.emoji} {cfg.label}</span>
            </div>
          ))}
        </div>

        {/* VISAO SEMANA */}
        {(view === 'semana' || view === 'dia') && (
          <>
            {/* Mini calendário semanal */}
            <div className="ag-week">
              {(periodo.dias as Date[]).map((dia, i) => {
                const ds = dataLocal(dia)
                const ags = agDia(ds)
                const isHoje = ds === diaHoje
                const isSel = diaSelecionado === ds
                return (
                  <div key={i} onClick={() => setDiaSelecionado(ds)}
                    style={{ background: isSel ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : t.bgCard, border: `0.5px solid ${isHoje && !isSel ? '#6366f1' : t.borderCard}`, borderRadius: 14, padding: '10px 4px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: isSel ? '0 4px 16px rgba(99,102,241,0.3)' : 'none' }}>
                    <p style={{ color: isSel ? 'rgba(255,255,255,0.7)' : t.textFaint, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px', textAlign: 'center', fontWeight: 600 }}>{DIAS[i]}</p>
                    <p style={{ color: isSel ? 'white' : isHoje ? '#6366f1' : t.text, fontSize: 20, fontWeight: isHoje ? 700 : 300, margin: '0 0 6px', textAlign: 'center', lineHeight: 1 }}>{dia.getDate()}</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                      {ags.slice(0,3).map(a => (
                        <div key={a.id} style={{ width: 6, height: 6, borderRadius: '50%', background: a.cor || corServico(a.servico), opacity: isSel ? 0.8 : 1 }} />
                      ))}
                      {ags.length === 0 && <span style={{ color: isSel ? 'rgba(255,255,255,0.4)' : t.textFaint, fontSize: 9 }}>livre</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="ag-layout">
              {/* Linha do tempo premium */}
              <div className="ag-card">
                <div style={{ padding: '16px 20px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: t.text, fontSize: 15, fontWeight: 600, margin: 0 }}>
                      {DIAS_FULL[diaSelecionadoObj.getDay()]}, {diaSelecionadoObj.getDate()} de {MESES[diaSelecionadoObj.getMonth()]}
                    </p>
                    <p style={{ color: t.textFaint, fontSize: 11, margin: '2px 0 0' }}>
                      {agHoje.filter(a => a.status !== 'cancelado').length} agendamentos · {Math.max(0, horariosDisponiveis.length - agHoje.filter(a => a.status !== 'cancelado').length)} livres
                    </p>
                  </div>
                  <button onClick={() => { setDataAg(diaSelecionado); setNovoAberto(true) }}
                    style={{ background: '#6366f120', color: '#6366f1', border: '1px solid #6366f130', borderRadius: 8, padding: '6px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                    + Novo
                  </button>
                </div>

                {horariosDisponiveis.length === 0 ? (
                  <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                    <p style={{ color: t.textFaint, fontSize: 13, margin: '0 0 16px' }}>{configDia === undefined ? 'Horarios nao configurados' : 'Salao fechado neste dia'}</p>
                    <button onClick={() => router.push('/agenda/horarios')} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>Configurar horarios</button>
                  </div>
                ) : (
                  <div>
                    {horariosDisponiveis.map((hora, i) => {
                      const ag = agHoje.find(a => a.horario.slice(0,5) === hora)
                      const cfg = ag ? STATUS_CFG[statusAg(ag.status)] : null
                      const corAg = ag?.cor || corServico(ag?.servico)
                      return (
                        <div key={hora} className="ag-row" style={{ borderBottom: i < horariosDisponiveis.length-1 ? `0.5px solid ${t.rowBorder}` : 'none' }}>
                          <div className="hora-col">
                            <p style={{ color: t.textFaint, fontSize: 11, margin: 0, fontWeight: 500 }}>{hora}</p>
                          </div>
                          <div className="ag-slot">
                            {ag ? (
                              <div className="ag-item"
                                onClick={() => setAgSelecionado(ag)}
                                style={{ background: cfg!.bg, borderLeftColor: corAg, position: 'relative' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                    {/* Avatar */}
                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: corAtual, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                      {ag.cliente_nome.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                      <p style={{ color: cfg!.text, fontSize: 12, fontWeight: 600, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ag.cliente_nome}</p>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {ag.servico && <span style={{ background: corAg+'25', color: corAg, fontSize: 10, padding: '1px 6px', borderRadius: 10, fontWeight: 500 }}>{ag.servico}</span>}
                                        {ag.funcionario_nome && <span style={{ color: cfg!.text, fontSize: 10, opacity: 0.7 }}>👤 {ag.funcionario_nome}</span>}
                                        {ag.duracao_min && <span style={{ color: cfg!.text, fontSize: 10, opacity: 0.7 }}>⏱ {ag.duracao_min}min</span>}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                    <span style={{ background: cfg!.dot+'20', color: cfg!.dot, fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{cfg!.emoji} {cfg!.label}</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button className="ag-add-btn" onClick={() => { setDataAg(diaSelecionado); setHorarioAg(hora); setNovoAberto(true) }}>
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
              <div className="ag-lateral" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Resumo */}
                <div className="ag-card" style={{ padding: '20px' }}>
                  <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 16px', fontWeight: 600 }}>Resumo do dia</p>
                  {(Object.entries(STATUS_CFG) as [StatusAg, typeof STATUS_CFG[StatusAg]][]).map(([key, cfg]) => {
                    const count = agHoje.filter(a => statusAg(a.status) === key).length
                    if (count === 0 && key !== 'pendente') return null
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: cfg.dot }} />
                          <span style={{ color: t.textMuted, fontSize: 12 }}>{cfg.label}</span>
                        </div>
                        <span style={{ color: count > 0 ? cfg.dot : t.textFaint, fontSize: 20, fontWeight: 300 }}>{count}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Lista dos agendamentos */}
                <div className="ag-card">
                  <div style={{ padding: '14px 16px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ color: t.text, fontSize: 13, fontWeight: 500, margin: 0 }}>Agendamentos</p>
                    <span style={{ background: '#6366f120', color: '#6366f1', fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{agHoje.filter(a => a.status !== 'cancelado').length}</span>
                  </div>
                  {agHoje.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                      <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>Nenhum agendamento</p>
                    </div>
                  ) : agHoje.map((a, i) => {
                    const cfg = STATUS_CFG[statusAg(a.status)]
                    const cor = a.cor || corServico(a.servico)
                    return (
                      <div key={a.id} onClick={() => setAgSelecionado(a)} style={{ padding: '10px 16px', borderBottom: i < agHoje.length-1 ? `0.5px solid ${t.rowBorder}` : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = t.bg} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                            {a.cliente_nome.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: t.text, fontSize: 12, fontWeight: 500, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.cliente_nome}</p>
                            <p style={{ color: t.textFaint, fontSize: 10, margin: 0 }}>{a.horario.slice(0,5)} · {a.servico || 'Servico'}</p>
                          </div>
                          <span style={{ fontSize: 11 }}>{cfg.emoji}</span>
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
          <div className="ag-card">
            <div className="ag-mes-grid" style={{ borderBottom: `0.5px solid ${t.rowBorder}` }}>
              {DIAS.map(d => <div key={d} style={{ padding: '10px 0', textAlign: 'center' }}><p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', margin: 0, fontWeight: 600 }}>{d}</p></div>)}
            </div>
            <div className="ag-mes-grid">
              {(periodo.dias as Date[]).map((dia, i) => {
                const ds = dataLocal(dia)
                const ags = agDia(ds)
                const isHoje = ds === diaHoje
                const isSel = diaSelecionado === ds
                const ref = (periodo as { ref?: Date }).ref
                const doMes = ref ? dia.getMonth() === ref.getMonth() : true
                return (
                  <div key={i} onClick={() => { setDiaSelecionado(ds); setView('dia') }}
                    style={{ minHeight: 80, padding: '6px', borderRight: (i+1)%7!==0 ? `0.5px solid ${t.rowBorder}` : 'none', borderBottom: i < 35 ? `0.5px solid ${t.rowBorder}` : 'none', background: isSel ? '#6366f108' : 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: isHoje ? 700 : 400, background: isHoje ? '#6366f1' : 'transparent', color: isHoje ? 'white' : doMes ? t.text : t.textFaint, borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {dia.getDate()}
                      </span>
                      {ags.length > 0 && <span style={{ background: '#6366f120', color: '#6366f1', fontSize: 9, padding: '1px 5px', borderRadius: 10, fontWeight: 700 }}>{ags.length}</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {ags.slice(0,2).map(a => (
                        <div key={a.id} style={{ borderRadius: 4, padding: '2px 5px', background: (a.cor || corServico(a.servico))+'20', borderLeft: `2px solid ${a.cor || corServico(a.servico)}` }}>
                          <p style={{ color: a.cor || corServico(a.servico), fontSize: 9, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                            {a.horario.slice(0,5)} {a.cliente_nome.split(' ')[0]}
                          </p>
                        </div>
                      ))}
                      {ags.length > 2 && <p style={{ color: t.textFaint, fontSize: 9, margin: 0 }}>+{ags.length-2} mais</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal novo agendamento */}
      {novoAberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: t.bgCard, borderRadius: '24px 24px 0 0', padding: '24px 20px 32px', width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, background: t.border, borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ color: t.text, fontSize: 18, fontWeight: 500, margin: 0, fontFamily: 'Georgia, serif' }}>Novo agendamento</h2>
              <button onClick={() => setNovoAberto(false)} style={{ background: 'none', border: 'none', color: t.textFaint, fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>Nome *</label>
                  <input value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} placeholder="Ex: Ana Paula" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>WhatsApp</label>
                  <input value={whatsCliente} onChange={e => setWhatsCliente(e.target.value)} placeholder="5519..." style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>Servico</label>
                <input value={servico} onChange={e => setServico(e.target.value)} placeholder="Ex: Corte + Escova" style={inputStyle} />
                {servico && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: corAtual }} />
                    <span style={{ color: t.textFaint, fontSize: 11 }}>Cor detectada automaticamente</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>Data *</label>
                  <input type="date" value={dataAg} onChange={e => setDataAg(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>Horario *</label>
                  {horariosFormulario.length > 0 ? (
                    <select value={horarioAg} onChange={e => setHorarioAg(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const }}>
                      <option value="">Selecione...</option>
                      {horariosFormulario.map(h => {
                        const ag = agendamentos.find(a => a.data === dataAg && a.horario.slice(0,5) === h && statusAg(a.status) !== 'cancelado')
                        return <option key={h} value={h} disabled={!!ag}>{h}{ag ? ' (ocupado)' : ''}</option>
                      })}
                    </select>
                  ) : <input type="time" value={horarioAg} onChange={e => setHorarioAg(e.target.value)} style={inputStyle} />}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>Duracao</label>
                  <select value={duracaoAg} onChange={e => setDuracaoAg(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const }}>
                    {[30,45,60,90,120,180].map(m => <option key={m} value={m}>{m} min</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>Profissional</label>
                  <select value={funcionarioAg} onChange={e => setFuncionarioAg(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const }}>
                    <option value="">Qualquer um</option>
                    {funcionarios.map(f => <option key={f.id} value={f.nome}>{f.nome}{f.cargo ? ` — ${f.cargo}` : ''}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>Observacao</label>
                <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" style={inputStyle} />
              </div>
            </div>
            {erro && <p style={{ color: '#be123c', fontSize: 12, margin: '12px 0 0' }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={salvarAgendamento} disabled={processando === 'novo' || !nomeCliente || !dataAg || !horarioAg}
                style={{ flex: 1, background: !nomeCliente || !dataAg || !horarioAg ? t.border : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: !nomeCliente || !dataAg || !horarioAg ? t.textFaint : 'white', border: 'none', borderRadius: 12, padding: 14, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                {processando === 'novo' ? 'Salvando...' : '✓ Confirmar agendamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalhe do agendamento */}
      {agSelecionado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: t.bgCard, borderRadius: 24, padding: '28px', maxWidth: 420, width: '100%', position: 'relative' }}>
            <button onClick={() => setAgSelecionado(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: t.textFaint, fontSize: 20, cursor: 'pointer' }}>×</button>
            {/* Header colorido */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: agSelecionado.cor || corServico(agSelecionado.servico), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20, fontWeight: 700 }}>
                {agSelecionado.cliente_nome.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ color: t.text, fontSize: 18, fontWeight: 600, margin: '0 0 4px' }}>{agSelecionado.cliente_nome}</h2>
                {agSelecionado.servico && <span style={{ background: (agSelecionado.cor||corServico(agSelecionado.servico))+'20', color: agSelecionado.cor||corServico(agSelecionado.servico), fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>{agSelecionado.servico}</span>}
              </div>
            </div>
            {/* Infos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {[
                { icon: '📅', label: 'Data', value: new Date(agSelecionado.data+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'}) },
                { icon: '🕐', label: 'Horario', value: `${agSelecionado.horario.slice(0,5)}${agSelecionado.duracao_min ? ` · ${agSelecionado.duracao_min} min` : ''}` },
                agSelecionado.funcionario_nome ? { icon: '👤', label: 'Profissional', value: agSelecionado.funcionario_nome } : null,
                agSelecionado.cliente_whatsapp ? { icon: '📱', label: 'WhatsApp', value: agSelecionado.cliente_whatsapp } : null,
                agSelecionado.observacao ? { icon: '📝', label: 'Observacao', value: agSelecionado.observacao } : null,
              ].filter(Boolean).map((item, i) => item && (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  <div>
                    <p style={{ color: t.textFaint, fontSize: 10, margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{item.label}</p>
                    <p style={{ color: t.text, fontSize: 13, margin: 0 }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Status */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 600 }}>Status</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(Object.entries(STATUS_CFG) as [StatusAg, typeof STATUS_CFG[StatusAg]][]).map(([key, cfg]) => (
                  <button key={key} onClick={() => alterarStatus(agSelecionado.id, key)}
                    style={{ background: statusAg(agSelecionado.status) === key ? cfg.dot : t.bg, color: statusAg(agSelecionado.status) === key ? 'white' : t.textMuted, border: `1px solid ${statusAg(agSelecionado.status) === key ? cfg.dot : t.border}`, borderRadius: 20, padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}>
                    {cfg.emoji} {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Ações */}
            <div style={{ display: 'flex', gap: 8 }}>
              {agSelecionado.cliente_whatsapp && (
                <a href={`https://wa.me/${agSelecionado.cliente_whatsapp}?text=Oi ${agSelecionado.cliente_nome.split(' ')[0]}! Confirmando seu horario de ${agSelecionado.horario.slice(0,5)}.`}
                  target="_blank" rel="noreferrer"
                  style={{ flex: 1, background: '#25D366', color: 'white', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 12, cursor: 'pointer', fontWeight: 600, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  💬 WhatsApp
                </a>
              )}
              <button onClick={() => excluir(agSelecionado.id)}
                style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', borderRadius: 10, padding: '10px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
