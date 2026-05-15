'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '@/app/lib/tema'
import Layout from '../components/Layout'

type Pacote = { id: string; nome: string; preco_mensal: number }
type Assinante = {
  id: string; nome: string; whatsapp: string; email?: string
  status: 'ativo' | 'cancelado' | 'inadimplente' | 'pausado'
  data_inicio?: string; pacote_id: string; pacotes?: Pacote
  aniversario?: string; preferencias?: string; observacoes?: string
  pontos?: number; ultimo_atendimento?: string; foto_url?: string
}
type Saldo = {
  id: string; assinante_id: string; servico_nome: string
  quantidade_total: number; quantidade_usada: number; mes_referencia: string
}
type Agendamento = {
  id: string; data: string; horario: string; servico?: string; status?: string
}

const STATUS_CFG = {
  ativo:        { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Ativo' },
  inadimplente: { bg: '#fef9ec', text: '#b45309', dot: '#f59e0b', label: 'Inadimplente' },
  cancelado:    { bg: '#fff1f2', text: '#be123c', dot: '#f43f5e', label: 'Cancelado' },
  pausado:      { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Pausado' },
}

function pontosFidelidade(a: Assinante): { nivel: string; cor: string; emoji: string; prox: number } {
  const p = a.pontos || 0
  if (p >= 500) return { nivel: 'Diamante', cor: '#06b6d4', emoji: '💎', prox: 0 }
  if (p >= 200) return { nivel: 'Ouro', cor: '#f59e0b', emoji: '🥇', prox: 500 - p }
  if (p >= 50)  return { nivel: 'Prata', cor: '#94a3b8', emoji: '🥈', prox: 200 - p }
  return { nivel: 'Bronze', cor: '#cd7f32', emoji: '🥉', prox: 50 - p }
}

export default function AssinantesPage() {
  const router = useRouter()
  const { t } = useTema()
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [assinantes, setAssinantes] = useState<Assinante[]>([])
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [criando, setCriando] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<Assinante | null>(null)
  const [saldos, setSaldos] = useState<Saldo[]>([])
  const [historico, setHistorico] = useState<Agendamento[]>([])
  const [abaDetalhe, setAbaDetalhe] = useState<'info' | 'saldo' | 'historico' | 'fidelidade'>('info')

  // Form novo assinante
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [pacoteId, setPacoteId] = useState('')
  const [aniversario, setAniversario] = useState('')
  const [preferencias, setPreferencias] = useState('')
  const [observacoes, setObservacoes] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) { router.push('/dashboard'); return }
      setSalaoId(salao.id)
      const [{ data: ass }, { data: pacs }] = await Promise.all([
        supabase.from('assinantes').select('*, pacotes(nome, preco_mensal)').eq('salao_id', salao.id).order('criado_em', { ascending: false }),
        supabase.from('pacotes').select('id, nome, preco_mensal').eq('salao_id', salao.id).eq('ativo', true),
      ])
      setAssinantes((ass || []) as unknown as Assinante[])
      setPacotes((pacs || []) as Pacote[])
      setLoading(false)
    }
    init()
  }, [router])

  async function abrirCliente(a: Assinante) {
    setClienteSelecionado(a)
    setAbaDetalhe('info')
    const mes = new Date().toISOString().slice(0, 7) + '-01'
    const [{ data: saldosData }, { data: ags }] = await Promise.all([
      supabase.from('saldo_mensal').select('*').eq('assinante_id', a.id).eq('mes_referencia', mes),
      supabase.from('agendamentos').select('id, data, horario, servico, status').eq('salao_id', salaoId!).ilike('cliente_nome', `%${a.nome.split(' ')[0]}%`).order('data', { ascending: false }).limit(10),
    ])
    setSaldos((saldosData || []) as Saldo[])
    setHistorico((ags || []) as Agendamento[])
  }

  async function salvarAssinante() {
    if (!nome || !whatsapp || !pacoteId || !salaoId) return
    const { data, error } = await supabase.from('assinantes').insert({
      salao_id: salaoId, pacote_id: pacoteId, nome, whatsapp, email: email || null,
      aniversario: aniversario || null, preferencias: preferencias || null,
      observacoes: observacoes || null, pontos: 0,
      data_inicio: new Date().toISOString().split('T')[0], status: 'ativo',
    }).select('*, pacotes(nome, preco_mensal)').single()
    if (!error && data) {
      await supabase.rpc('gerar_saldo_mensal', { p_assinante_id: data.id, p_mes: new Date().toISOString().split('T')[0] })
      setAssinantes([data as unknown as Assinante, ...assinantes])
      setNome(''); setWhatsapp(''); setEmail(''); setPacoteId('')
      setAniversario(''); setPreferencias(''); setObservacoes('')
      setCriando(false)
    }
  }

  async function marcarUso(saldo: Saldo) {
    if (saldo.quantidade_usada >= saldo.quantidade_total) return
    await supabase.from('usos').insert({ saldo_id: saldo.id, assinante_id: saldo.assinante_id, servico_nome: saldo.servico_nome })
    setSaldos(saldos.map(s => s.id === saldo.id ? { ...s, quantidade_usada: s.quantidade_usada + 1 } : s))
    // Adicionar pontos
    if (clienteSelecionado && salaoId) {
      const novos = (clienteSelecionado.pontos || 0) + 10
      await supabase.from('assinantes').update({ pontos: novos }).eq('id', clienteSelecionado.id)
      setClienteSelecionado({ ...clienteSelecionado, pontos: novos })
      setAssinantes(assinantes.map(a => a.id === clienteSelecionado.id ? { ...a, pontos: novos } : a))
    }
  }

  async function salvarEdicao(campo: string, valor: string) {
    if (!clienteSelecionado) return
    await supabase.from('assinantes').update({ [campo]: valor || null }).eq('id', clienteSelecionado.id)
    const atualizado = { ...clienteSelecionado, [campo]: valor }
    setClienteSelecionado(atualizado)
    setAssinantes(assinantes.map(a => a.id === clienteSelecionado.id ? atualizado : a))
  }

  async function alterarStatus(status: string) {
    if (!clienteSelecionado) return
    await supabase.from('assinantes').update({ status }).eq('id', clienteSelecionado.id)
    const atualizado = { ...clienteSelecionado, status: status as Assinante['status'] }
    setClienteSelecionado(atualizado)
    setAssinantes(assinantes.map(a => a.id === clienteSelecionado.id ? atualizado : a))
  }

  const filtrados = assinantes.filter(a => {
    const matchBusca = a.nome.toLowerCase().includes(busca.toLowerCase()) || a.whatsapp?.includes(busca)
    const matchStatus = filtroStatus === 'todos' || a.status === filtroStatus
    return matchBusca && matchStatus
  })

  const hoje = new Date()
  const aniversariantesHoje = assinantes.filter(a => {
    if (!a.aniversario) return false
    const d = new Date(a.aniversario + 'T12:00:00')
    return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth()
  })

  const mrr = assinantes.filter(a => a.status === 'ativo').reduce((acc, a) => acc + (a.pacotes?.preco_mensal || 0), 0)

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
        .cli { max-width: 1100px; margin: 0 auto; padding: 28px 20px; }
        .cli-kpi { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
        .cli-card { background: ${t.bgCard}; border: 0.5px solid ${t.borderCard}; border-radius: 18px; }
        .cli-item { padding: 14px 16px; border-bottom: 0.5px solid ${t.rowBorder}; cursor: pointer; transition: background 0.15s; display: flex; align-items: center; gap: 12px; }
        .cli-item:hover { background: ${t.bg}; }
        .cli-item:last-child { border-bottom: none; }
        .detalhe-aba { padding: 8px 14px; border: none; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
        @media (max-width: 768px) {
          .cli { padding: 14px 12px; }
          .cli-kpi { grid-template-columns: 1fr 1fr; gap: 10px; }
        }
      `}</style>

      <div className="cli">

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: t.textFaint, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Gestao</p>
            <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Clientes</h1>
          </div>
          <button onClick={() => setCriando(true)}
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 12, cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}>
            + Novo cliente
          </button>
        </div>

        {/* Aniversariantes */}
        {aniversariantesHoje.length > 0 && (
          <div style={{ background: 'linear-gradient(135deg,#ec4899,#f43f5e)', borderRadius: 16, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🎂</span>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: '0 0 2px', fontWeight: 600, letterSpacing: 1 }}>ANIVERSÁRIO HOJE</p>
              <p style={{ color: 'white', fontSize: 14, margin: 0, fontWeight: 500 }}>
                {aniversariantesHoje.map(a => a.nome.split(' ')[0]).join(', ')} 🎉
              </p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {aniversariantesHoje.map(a => a.whatsapp && (
                <a key={a.id} href={`https://wa.me/${a.whatsapp}?text=Feliz aniversário, ${a.nome.split(' ')[0]}! 🎂🎉 O Salão deseja tudo de melhor pra você!`}
                  target="_blank" rel="noreferrer"
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 11, textDecoration: 'none', fontWeight: 600 }}>
                  💬 Parabenizar
                </a>
              ))}
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="cli-kpi">
          {[
            { label: 'Total clientes', value: assinantes.length, sub: 'cadastrados', cor: t.text },
            { label: 'Ativos', value: assinantes.filter(a => a.status === 'ativo').length, sub: 'pagando', cor: '#22c55e' },
            { label: 'Inadimplentes', value: assinantes.filter(a => a.status === 'inadimplente').length, sub: 'pendentes', cor: '#f59e0b' },
            { label: 'MRR', value: `R$ ${mrr.toLocaleString('pt-BR',{maximumFractionDigits:0})}`, sub: 'recorrente/mês', cor: '#6366f1' },
          ].map(k => (
            <div key={k.label} className="cli-card" style={{ padding: '18px 20px' }}>
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px', fontWeight: 600 }}>{k.label}</p>
              <p style={{ color: k.cor, fontSize: 28, fontWeight: 200, letterSpacing: -1, margin: '0 0 2px', lineHeight: 1 }}>{k.value}</p>
              <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Busca e filtros */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="🔍  Buscar por nome ou WhatsApp..."
            style={{ flex: 1, minWidth: 200, border: `0.5px solid ${t.border}`, borderRadius: 10, padding: '10px 14px', background: t.bgCard, fontSize: 13, color: t.text, outline: 'none' }} />
          <div style={{ display: 'flex', gap: 4, background: t.bgCard, border: `0.5px solid ${t.border}`, borderRadius: 10, padding: 3 }}>
            {(['todos', 'ativo', 'inadimplente', 'cancelado', 'pausado'] as const).map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                style={{ background: filtroStatus === s ? t.text : 'none', color: filtroStatus === s ? t.bg : t.textMuted, border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontWeight: filtroStatus === s ? 600 : 400, whiteSpace: 'nowrap' }}>
                {s === 'todos' ? 'Todos' : STATUS_CFG[s as keyof typeof STATUS_CFG]?.label || s}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de clientes */}
        <div className="cli-card">
          {filtrados.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <p style={{ color: t.textFaint, fontSize: 13, margin: '0 0 16px' }}>Nenhum cliente encontrado</p>
              <button onClick={() => setCriando(true)} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>+ Adicionar cliente</button>
            </div>
          ) : filtrados.map(a => {
            const cfg = STATUS_CFG[a.status] || STATUS_CFG.pausado
            const fid = pontosFidelidade(a)
            const diasCliente = a.data_inicio ? Math.floor((hoje.getTime() - new Date(a.data_inicio).getTime()) / (1000*60*60*24)) : 0
            const isAniv = a.aniversario && (() => { const d = new Date(a.aniversario+'T12:00:00'); return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth() })()
            return (
              <div key={a.id} className="cli-item" onClick={() => abrirCliente(a)}>
                {/* Avatar */}
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: `hsl(${a.nome.charCodeAt(0)*7},60%,60%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 700, flexShrink: 0, position: 'relative' }}>
                  {a.nome.charAt(0).toUpperCase()}
                  {isAniv && <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 14 }}>🎂</span>}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <p style={{ color: t.text, fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.nome}</p>
                    <span style={{ fontSize: 12 }}>{fid.emoji}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ color: t.textFaint, fontSize: 11 }}>{a.pacotes?.nome || 'Sem plano'}</span>
                    {diasCliente > 0 && <span style={{ color: t.textFaint, fontSize: 11 }}>· {diasCliente}d cliente</span>}
                    {a.whatsapp && <span style={{ color: t.textFaint, fontSize: 11 }}>· {a.whatsapp}</span>}
                  </div>
                </div>
                {/* Direita */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ background: cfg.bg, color: cfg.text, fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{cfg.label}</span>
                  <span style={{ color: t.textFaint, fontSize: 11 }}>R$ {(a.pacotes?.preco_mensal||0).toFixed(0)}/mês</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal novo cliente */}
      {criando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: t.bgCard, borderRadius: '24px 24px 0 0', padding: '24px 20px 36px', width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ width: 36, height: 4, background: t.border, borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ color: t.text, fontSize: 18, fontWeight: 500, margin: 0, fontFamily: 'Georgia, serif' }}>Novo cliente</h2>
              <button onClick={() => setCriando(false)} style={{ background: 'none', border: 'none', color: t.textFaint, fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>Nome *</label>
                  <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>WhatsApp *</label>
                  <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="5519..." style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>E-mail</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="opcional" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>Aniversário</label>
                  <input type="date" value={aniversario} onChange={e => setAniversario(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>Plano *</label>
                <select value={pacoteId} onChange={e => setPacoteId(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const }}>
                  <option value="">Selecione um plano...</option>
                  {pacotes.map(p => <option key={p.id} value={p.id}>{p.nome} — R$ {p.preco_mensal.toFixed(0)}/mês</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>Preferências</label>
                <input value={preferencias} onChange={e => setPreferencias(e.target.value)} placeholder="Ex: Prefere horários pela manhã, alérgica a amônia..." style={inputStyle} />
              </div>
              <div>
                <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>Observações internas</label>
                <input value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Notas internas sobre o cliente..." style={inputStyle} />
              </div>
            </div>
            <button onClick={salvarAssinante} disabled={!nome || !whatsapp || !pacoteId}
              style={{ width: '100%', marginTop: 20, background: !nome || !whatsapp || !pacoteId ? t.border : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: !nome || !whatsapp || !pacoteId ? t.textFaint : 'white', border: 'none', borderRadius: 12, padding: 14, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              ✓ Cadastrar cliente
            </button>
          </div>
        </div>
      )}

      {/* Drawer detalhe do cliente */}
      {clienteSelecionado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: t.bgCard, width: '100%', maxWidth: 440, height: '100%', overflowY: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>

            {/* Header do drawer */}
            <div style={{ background: `hsl(${clienteSelecionado.nome.charCodeAt(0)*7},60%,55%)`, padding: '32px 24px 24px', position: 'relative' }}>
              <button onClick={() => setClienteSelecionado(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: 32, height: 32, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24, fontWeight: 700, marginBottom: 12, border: '2px solid rgba(255,255,255,0.4)' }}>
                {clienteSelecionado.nome.charAt(0).toUpperCase()}
              </div>
              <h2 style={{ color: 'white', fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>{clienteSelecionado.nome}</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>
                  {clienteSelecionado.pacotes?.nome || 'Sem plano'}
                </span>
                {(() => { const fid = pontosFidelidade(clienteSelecionado); return (
                  <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500 }}>
                    {fid.emoji} {fid.nivel} · {clienteSelecionado.pontos || 0} pts
                  </span>
                )})()}
              </div>
            </div>

            {/* Status rápido */}
            <div style={{ padding: '12px 20px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: t.textFaint, fontSize: 11, marginRight: 4 }}>Status:</span>
              {(Object.keys(STATUS_CFG) as Array<keyof typeof STATUS_CFG>).map(s => {
                const cfg = STATUS_CFG[s]
                const ativo = clienteSelecionado.status === s
                return (
                  <button key={s} onClick={() => alterarStatus(s)}
                    style={{ background: ativo ? cfg.dot : t.bg, color: ativo ? 'white' : t.textMuted, border: `1px solid ${ativo ? cfg.dot : t.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, cursor: 'pointer', fontWeight: ativo ? 600 : 400, transition: 'all 0.2s' }}>
                    {cfg.label}
                  </button>
                )
              })}
            </div>

            {/* Abas */}
            <div style={{ padding: '12px 20px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', gap: 4 }}>
              {([
                { id: 'info', label: '👤 Info' },
                { id: 'saldo', label: '✅ Saldo' },
                { id: 'historico', label: '📅 Histórico' },
                { id: 'fidelidade', label: '⭐ Pontos' },
              ] as const).map(aba => (
                <button key={aba.id} onClick={() => setAbaDetalhe(aba.id)} className="detalhe-aba"
                  style={{ background: abaDetalhe === aba.id ? t.text : t.bg, color: abaDetalhe === aba.id ? t.bg : t.textMuted, border: `0.5px solid ${abaDetalhe === aba.id ? t.text : t.border}` }}>
                  {aba.label}
                </button>
              ))}
            </div>

            {/* Conteúdo das abas */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>

              {/* ABA INFO */}
              {abaDetalhe === 'info' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {[
                    { label: '📱 WhatsApp', campo: 'whatsapp', valor: clienteSelecionado.whatsapp, tipo: 'text', placeholder: '5519...' },
                    { label: '📧 E-mail', campo: 'email', valor: clienteSelecionado.email || '', tipo: 'email', placeholder: 'email@exemplo.com' },
                    { label: '🎂 Aniversário', campo: 'aniversario', valor: clienteSelecionado.aniversario || '', tipo: 'date', placeholder: '' },
                    { label: '💬 Preferências', campo: 'preferencias', valor: clienteSelecionado.preferencias || '', tipo: 'text', placeholder: 'Ex: prefere manhã, alérgica a amônia...' },
                    { label: '📝 Observações', campo: 'observacoes', valor: clienteSelecionado.observacoes || '', tipo: 'text', placeholder: 'Notas internas...' },
                  ].map(f => (
                    <div key={f.campo}>
                      <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6, fontWeight: 600 }}>{f.label}</label>
                      <input type={f.tipo} defaultValue={f.valor} placeholder={f.placeholder}
                        onBlur={e => salvarEdicao(f.campo, e.target.value)}
                        style={{ ...inputStyle, background: t.bg }} />
                    </div>
                  ))}
                  {/* Ações rápidas */}
                  <div>
                    <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 10, fontWeight: 600 }}>⚡ Ações rápidas</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {clienteSelecionado.whatsapp && (
                        <a href={`https://wa.me/${clienteSelecionado.whatsapp}`} target="_blank" rel="noreferrer"
                          style={{ background: '#25D366', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          💬 WhatsApp
                        </a>
                      )}
                      <button onClick={() => router.push('/agenda')}
                        style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                        📅 Agendar
                      </button>
                      <button onClick={() => router.push('/pagamentos')}
                        style={{ background: t.bg, color: t.textMuted, border: `0.5px solid ${t.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>
                        💳 Cobrar
                      </button>
                    </div>
                  </div>
                  {/* Dados do plano */}
                  <div style={{ background: t.bg, borderRadius: 12, padding: '14px 16px', border: `0.5px solid ${t.border}` }}>
                    <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 10px', fontWeight: 600 }}>Plano atual</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: t.textMuted, fontSize: 13 }}>{clienteSelecionado.pacotes?.nome || '—'}</span>
                      <span style={{ color: t.text, fontSize: 13, fontWeight: 600 }}>R$ {(clienteSelecionado.pacotes?.preco_mensal||0).toFixed(0)}/mês</span>
                    </div>
                    {clienteSelecionado.data_inicio && (
                      <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>
                        Cliente há {Math.floor((hoje.getTime()-new Date(clienteSelecionado.data_inicio).getTime())/(1000*60*60*24))} dias · desde {new Date(clienteSelecionado.data_inicio+'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ABA SALDO */}
              {abaDetalhe === 'saldo' && (
                <div>
                  <p style={{ color: t.textFaint, fontSize: 11, marginBottom: 16 }}>Saldo de serviços do mês atual. Clique em + para registrar uso.</p>
                  {saldos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
                      <p style={{ color: t.textFaint, fontSize: 13 }}>Nenhum saldo disponível</p>
                    </div>
                  ) : saldos.map(s => {
                    const pct = s.quantidade_total > 0 ? (s.quantidade_usada / s.quantidade_total) * 100 : 0
                    const restante = s.quantidade_total - s.quantidade_usada
                    return (
                      <div key={s.id} style={{ background: t.bg, borderRadius: 14, padding: '16px', marginBottom: 12, border: `0.5px solid ${t.border}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <div>
                            <p style={{ color: t.text, fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>{s.servico_nome}</p>
                            <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{s.quantidade_usada}/{s.quantidade_total} utilizados</p>
                          </div>
                          <button onClick={() => marcarUso(s)} disabled={restante === 0}
                            style={{ background: restante > 0 ? '#6366f1' : t.border, color: restante > 0 ? 'white' : t.textFaint, border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: restante > 0 ? 'pointer' : 'default', fontWeight: 600 }}>
                            {restante > 0 ? `+ Usar (${restante} restante${restante > 1 ? 's' : ''})` : 'Esgotado'}
                          </button>
                        </div>
                        <div style={{ background: t.borderCard, borderRadius: 4, height: 6, overflow: 'hidden' }}>
                          <div style={{ background: pct >= 100 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#6366f1', height: '100%', width: `${pct}%`, borderRadius: 4, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ABA HISTÓRICO */}
              {abaDetalhe === 'historico' && (
                <div>
                  <p style={{ color: t.textFaint, fontSize: 11, marginBottom: 16 }}>Últimos 10 agendamentos encontrados.</p>
                  {historico.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0' }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>📅</div>
                      <p style={{ color: t.textFaint, fontSize: 13 }}>Nenhum histórico encontrado</p>
                    </div>
                  ) : historico.map((ag, i) => {
                    const statusCor: Record<string, string> = { confirmado: '#22c55e', concluido: '#6366f1', cancelado: '#ef4444', pendente: '#f59e0b', em_atendimento: '#3b82f6' }
                    return (
                      <div key={ag.id} style={{ display: 'flex', gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: i < historico.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusCor[ag.status||'pendente'] || '#aaa', marginTop: 4, flexShrink: 0 }} />
                        <div>
                          <p style={{ color: t.text, fontSize: 13, fontWeight: 500, margin: '0 0 2px' }}>
                            {new Date(ag.data+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'})} às {ag.horario.slice(0,5)}
                          </p>
                          <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>{ag.servico || 'Serviço não informado'}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ABA FIDELIDADE */}
              {abaDetalhe === 'fidelidade' && (() => {
                const fid = pontosFidelidade(clienteSelecionado)
                const pontos = clienteSelecionado.pontos || 0
                const niveis = [
                  { nome: 'Bronze', min: 0, max: 49, cor: '#cd7f32', emoji: '🥉', beneficio: 'Acesso básico ao programa' },
                  { nome: 'Prata', min: 50, max: 199, cor: '#94a3b8', emoji: '🥈', beneficio: '5% de desconto em produtos' },
                  { nome: 'Ouro', min: 200, max: 499, cor: '#f59e0b', emoji: '🥇', beneficio: '10% de desconto + prioridade na agenda' },
                  { nome: 'Diamante', min: 500, max: 9999, cor: '#06b6d4', emoji: '💎', beneficio: '15% de desconto + serviço surpresa mensal' },
                ]
                return (
                  <div>
                    {/* Card de pontos */}
                    <div style={{ background: `linear-gradient(135deg, ${fid.cor}30, ${fid.cor}10)`, border: `1px solid ${fid.cor}40`, borderRadius: 16, padding: '20px', marginBottom: 20, textAlign: 'center' }}>
                      <div style={{ fontSize: 48, marginBottom: 8 }}>{fid.emoji}</div>
                      <p style={{ color: fid.cor, fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 4px' }}>Nível {fid.nivel}</p>
                      <p style={{ color: t.text, fontSize: 36, fontWeight: 200, margin: '0 0 4px', letterSpacing: -1 }}>{pontos}</p>
                      <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>pontos acumulados</p>
                      {fid.prox > 0 && <p style={{ color: t.textFaint, fontSize: 11, marginTop: 8 }}>Faltam {fid.prox} pts para o próximo nível</p>}
                    </div>
                    {/* Como ganhar pontos */}
                    <div style={{ marginBottom: 20 }}>
                      <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 10px', fontWeight: 600 }}>Como ganhar pontos</p>
                      {[
                        { acao: 'Uso de serviço do plano', pts: '+10 pts' },
                        { acao: 'Pagamento em dia', pts: '+20 pts' },
                        { acao: 'Indicar amigo', pts: '+50 pts' },
                        { acao: 'Aniversário', pts: '+30 pts' },
                      ].map(r => (
                        <div key={r.acao} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `0.5px solid ${t.rowBorder}` }}>
                          <span style={{ color: t.textMuted, fontSize: 12 }}>{r.acao}</span>
                          <span style={{ color: '#6366f1', fontSize: 12, fontWeight: 600 }}>{r.pts}</span>
                        </div>
                      ))}
                    </div>
                    {/* Níveis */}
                    <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 10px', fontWeight: 600 }}>Níveis e benefícios</p>
                    {niveis.map(n => (
                      <div key={n.nome} style={{ display: 'flex', gap: 12, padding: '10px 12px', borderRadius: 10, marginBottom: 6, background: fid.nivel === n.nome ? n.cor+'15' : t.bg, border: `0.5px solid ${fid.nivel === n.nome ? n.cor : t.border}` }}>
                        <span style={{ fontSize: 20 }}>{n.emoji}</span>
                        <div>
                          <p style={{ color: fid.nivel === n.nome ? n.cor : t.text, fontSize: 13, fontWeight: fid.nivel === n.nome ? 700 : 500, margin: '0 0 2px' }}>{n.nome} · {n.min}–{n.max === 9999 ? '∞' : n.max} pts</p>
                          <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{n.beneficio}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
