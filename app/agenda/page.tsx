'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '../lib/tema'
import Navbar from '../components/Navbar'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const DIAS_FULL = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']
const STATUS_COLOR: any = {
  pendente: { bg: '#fffbeb', text: '#d97706' },
  confirmado: { bg: '#f0fdf4', text: '#16a34a' },
  cancelado: { bg: '#fef2f2', text: '#dc2626' },
  concluido: { bg: '#f5f4f0', text: '#888' },
}

export default function AgendaPage() {
  const router = useRouter()
  const { t } = useTema()
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [agendamentos, setAgendamentos] = useState<any[]>([])
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)
  const [novoAberto, setNovoAberto] = useState(false)
  const [processando, setProcessando] = useState<string | null>(null)

  // Form novo agendamento
  const [nomeCliente, setNomeCliente] = useState('')
  const [whatsCliente, setWhatsCliente] = useState('')
  const [servico, setServico] = useState('')
  const [dataAg, setDataAg] = useState('')
  const [horarioAg, setHorarioAg] = useState('')
  const [obs, setObs] = useState('')

  // Semana atual
  const hoje = new Date()
  const inicioSemana = new Date(hoje)
  inicioSemana.setDate(hoje.getDate() - hoje.getDay() + semanaOffset * 7)

  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicioSemana)
    d.setDate(inicioSemana.getDate() + i)
    return d
  })

  const dataInicio = diasSemana[0].toISOString().split('T')[0]
  const dataFim = diasSemana[6].toISOString().split('T')[0]

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) { router.push('/dashboard'); return }
      setSalaoId(salao.id)
      await carregar(salao.id, dataInicio, dataFim)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (salaoId) carregar(salaoId, dataInicio, dataFim)
  }, [semanaOffset, salaoId])

  async function carregar(id: string, inicio: string, fim: string) {
    const { data } = await supabase.from('agendamentos')
      .select('*').eq('salao_id', id)
      .gte('data', inicio).lte('data', fim)
      .order('data').order('horario')
    setAgendamentos(data || [])
  }

  async function salvarAgendamento() {
    if (!nomeCliente || !dataAg || !horarioAg || !salaoId) return
    setProcessando('novo')
    const { data } = await supabase.from('agendamentos').insert({
      salao_id: salaoId, cliente_nome: nomeCliente,
      cliente_whatsapp: whatsCliente, servico, data: dataAg,
      horario: horarioAg, observacao: obs,
    }).select().single()
    if (data) setAgendamentos([...agendamentos, data].sort((a, b) => a.horario.localeCompare(b.horario)))
    setNomeCliente(''); setWhatsCliente(''); setServico(''); setDataAg(''); setHorarioAg(''); setObs('')
    setNovoAberto(false)
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
  const diaHoje = hoje.toISOString().split('T')[0]

  const inputStyle = { width: '100%', border: `0.5px solid ${t.border}`, borderRadius: 10, padding: '10px 14px', background: t.bgInput, fontSize: 13, color: t.text, outline: 'none', boxSizing: 'border-box' as const }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textFaint, fontSize: 12, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: t.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 6px' }}>Gestao</p>
            <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Agenda</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => router.push('/agenda/horarios')}
              style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 10, padding: '10px 16px', fontSize: 12, cursor: 'pointer' }}>
              Configurar horarios
            </button>
            <button onClick={() => setNovoAberto(true)}
              style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 12, cursor: 'pointer' }}>
              + Novo agendamento
            </button>
          </div>
        </div>

        {/* Navegacao semanal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button onClick={() => setSemanaOffset(semanaOffset - 1)}
            style={{ background: t.bgCard, border: `0.5px solid ${t.border}`, color: t.text, borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
            ←
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: t.text, fontSize: 14, fontWeight: 500, margin: 0 }}>
              {diasSemana[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — {diasSemana[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            {semanaOffset !== 0 && (
              <button onClick={() => setSemanaOffset(0)}
                style={{ background: 'none', border: 'none', color: t.textMuted, fontSize: 11, cursor: 'pointer', marginTop: 2 }}>
                Voltar para hoje
              </button>
            )}
          </div>
          <button onClick={() => setSemanaOffset(semanaOffset + 1)}
            style={{ background: t.bgCard, border: `0.5px solid ${t.border}`, color: t.text, borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
            →
          </button>
        </div>

        {/* Grade semanal */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 24 }}>
          {diasSemana.map((dia, i) => {
            const dataStr = dia.toISOString().split('T')[0]
            const ags = agDia(dataStr)
            const isHoje = dataStr === diaHoje
            const isSelecionado = diaSelecionado === dataStr
            return (
              <div key={i} onClick={() => setDiaSelecionado(isSelecionado ? null : dataStr)}
                style={{ background: isSelecionado ? t.text : t.bgCard, border: `0.5px solid ${isHoje ? t.accentBar : t.borderCard}`, borderRadius: 14, padding: '12px 8px', cursor: 'pointer', transition: 'all 0.15s', minHeight: 80 }}>
                <p style={{ color: isSelecionado ? t.bg : t.textFaint, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 4px', textAlign: 'center' }}>{DIAS[i]}</p>
                <p style={{ color: isSelecionado ? t.bg : isHoje ? t.text : t.text, fontSize: 18, fontWeight: isHoje ? 500 : 300, margin: '0 0 8px', textAlign: 'center' }}>
                  {dia.getDate()}
                </p>
                {ags.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {ags.slice(0, 2).map(a => (
                      <div key={a.id} style={{ background: isSelecionado ? 'rgba(255,255,255,0.2)' : STATUS_COLOR[a.status]?.bg || t.bg, borderRadius: 4, padding: '2px 6px' }}>
                        <p style={{ color: isSelecionado ? t.bg : STATUS_COLOR[a.status]?.text || t.textMuted, fontSize: 10, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {a.horario.slice(0, 5)} {a.cliente_nome.split(' ')[0]}
                        </p>
                      </div>
                    ))}
                    {ags.length > 2 && (
                      <p style={{ color: isSelecionado ? t.bg : t.textFaint, fontSize: 10, margin: 0, textAlign: 'center' }}>+{ags.length - 2}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Detalhe do dia selecionado */}
        {diaSelecionado && (
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '16px 24px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ color: t.text, fontSize: 14, fontWeight: 500, margin: 0 }}>
                {new Date(diaSelecionado + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </p>
              <span style={{ color: t.textFaint, fontSize: 12 }}>{agDia(diaSelecionado).length} agendamento(s)</span>
            </div>
            {agDia(diaSelecionado).length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <p style={{ color: t.textFaint, fontSize: 13 }}>Nenhum agendamento neste dia</p>
              </div>
            ) : (
              agDia(diaSelecionado).map((a, i) => (
                <div key={a.id} style={{ padding: '14px 24px', borderBottom: i < agDia(diaSelecionado).length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ background: t.bg, borderRadius: 8, padding: '6px 10px', textAlign: 'center', minWidth: 48 }}>
                      <p style={{ color: t.text, fontSize: 14, fontWeight: 500, margin: 0 }}>{a.horario.slice(0, 5)}</p>
                    </div>
                    <div>
                      <p style={{ color: t.text, fontSize: 13, margin: '0 0 2px', fontWeight: 400 }}>{a.cliente_nome}</p>
                      <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>
                        {a.servico || 'Servico nao informado'}
                        {a.cliente_whatsapp && ` · ${a.cliente_whatsapp}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: STATUS_COLOR[a.status]?.bg, color: STATUS_COLOR[a.status]?.text, fontSize: 10, padding: '3px 10px', borderRadius: 20 }}>{a.status}</span>
                    <select value={a.status} onChange={e => alterarStatus(a.id, e.target.value)}
                      disabled={processando === a.id}
                      style={{ background: t.bgInput, border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: '4px 8px', fontSize: 11, cursor: 'pointer', outline: 'none' }}>
                      <option value="pendente">Pendente</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="concluido">Concluido</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                    <button onClick={() => excluir(a.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Form novo agendamento */}
        {novoAberto && (
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '28px 32px', marginBottom: 20 }}>
            <h2 style={{ color: t.text, fontSize: 16, fontWeight: 400, margin: '0 0 20px' }}>Novo agendamento</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Nome do cliente</label>
                  <input value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} placeholder="Ex: Ana Paula" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>WhatsApp</label>
                  <input value={whatsCliente} onChange={e => setWhatsCliente(e.target.value)} placeholder="5519999999999" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Servico</label>
                <input value={servico} onChange={e => setServico(e.target.value)} placeholder="Ex: Corte + Escova" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Data</label>
                  <input type="date" value={dataAg} onChange={e => setDataAg(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Horario</label>
                  <input type="time" value={horarioAg} onChange={e => setHorarioAg(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Observacao</label>
                <input value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={salvarAgendamento} disabled={processando === 'novo'}
                  style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 12, cursor: 'pointer', opacity: processando === 'novo' ? 0.5 : 1 }}>
                  {processando === 'novo' ? 'Salvando...' : 'Salvar'}
                </button>
                <button onClick={() => setNovoAberto(false)}
                  style={{ background: 'none', border: 'none', color: t.textMuted, fontSize: 13, cursor: 'pointer' }}>
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
