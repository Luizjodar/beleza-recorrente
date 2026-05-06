'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useParams, useSearchParams } from 'next/navigation'

type Salao = {
  id: string
  nome: string
  cargo?: string | null
  cidade?: string | null
  descricao?: string | null
  whatsapp?: string | null
  email_contato?: string | null
  pagamento_online?: boolean | null
  taxa_reserva?: number | null
}

type PacoteItem = {
  id: string
  servico_nome: string
  quantidade: number
}

type Pacote = {
  id: string
  nome: string
  preco_mensal: string | number
  imagem_url?: string | null
  pacote_itens?: PacoteItem[]
}

type Promocao = {
  id: string
  titulo: string
  descricao?: string | null
  preco_original?: string | number | null
  preco_promo: string | number
  data_fim: string
  imagem_url?: string | null
}

const inputStyle = {
  width: '100%',
  background: '#fafafa',
  border: '1px solid #e8e8e8',
  borderRadius: 8,
  padding: '12px 14px',
  color: '#111',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  color: '#aaa',
  fontSize: 11,
  letterSpacing: 2,
  display: 'block',
  marginBottom: 8,
}

function dinheiro(valor: string | number | null | undefined) {
  const num = Number(valor || 0)
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2).replace('.', ',')
}

function AgendamentoPromo({ promo, salao, slug }: { promo: Promocao; salao: Salao; slug: string }) {
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [dataSelecionada, setDataSelecionada] = useState<string>('')
  const [horarioSelecionado, setHorarioSelecionado] = useState<string>('')
  const [mostrarCalendario, setMostrarCalendario] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const horarios = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00']

  function pagarPessoalmente() {
    if (!nome || !whatsapp || !dataSelecionada || !horarioSelecionado) return

    const dataFormatada = new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR')
    const msg = encodeURIComponent(
      `Ola! Gostaria de agendar a promocao:\n\n` +
      `*${promo.titulo}* - R$ ${dinheiro(promo.preco_promo)}\n\n` +
      `*Data:* ${dataFormatada}\n` +
      `*Horario:* ${horarioSelecionado}\n` +
      `*Nome:* ${nome}\n` +
      `*WhatsApp:* ${whatsapp}\n` +
      `*Email:* ${email || '(nao informado)'}`
    )

    window.open(`https://wa.me/${salao.whatsapp || ''}?text=${msg}`, '_blank')
    
    notificarAgendamentoPromo(dataFormatada)
    
    setAberto(false)
    setNome('')
    setWhatsapp('')
    setEmail('')
    setDataSelecionada('')
    setHorarioSelecionado('')
    setMostrarCalendario(false)
  }

  async function notificarAgendamentoPromo(dataFormatada: string) {
    await fetch('/api/notificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'agendamento_promocao',
        nomeCliente: nome,
        emailCliente: email,
        whatsappCliente: whatsapp,
        nomePromo: promo.titulo,
        preco: dinheiro(promo.preco_promo),
        dataAgendamento: dataFormatada,
        horarioAgendamento: horarioSelecionado,
        emailSalao: salao.email_contato,
        nomeSalao: salao.nome,
      }),
    })
  }

  function obterProximosDias() {
    const dias = []
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    for (let i = 0; i < 30; i++) {
      const data = new Date(hoje)
      data.setDate(data.getDate() + i)
      const diaSemana = data.getDay()
      if (diaSemana !== 0 && diaSemana !== 6) {
        dias.push(data.toISOString().split('T')[0])
      }
    }
    return dias
  }

  async function pagarOnline() {
    if (!nome || !whatsapp || !dataSelecionada || !horarioSelecionado) return
    setEnviando(true)
    setErro('')

    const res = await fetch('/api/stripe/public-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'promocao',
        salaoId: salao.id,
        promocaoId: promo.id,
        slug,
        nome,
        whatsapp,
        email,
        dataSelecionada,
        horarioSelecionado,
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.url) {
      setErro(data.error || 'Nao foi possivel abrir o pagamento online.')
      setEnviando(false)
      return
    }

    window.location.assign(data.url)
  }

  if (!aberto) return (
    <button
      onClick={() => setAberto(true)}
      style={{ marginTop: 14, marginLeft: 12, width: 'calc(100% - 12px)', background: '#111', color: 'white', border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 12, letterSpacing: 2, cursor: 'pointer', fontWeight: 500 }}>
      QUERO ESTA PROMOCAO
    </button>
  )

  return (
    <div style={{ marginTop: 14, marginLeft: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={labelStyle}>SEU NOME</label>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Ana Paula" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>SEU WHATSAPP</label>
          <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="5519999999999" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>EMAIL <span style={{ color: '#ddd' }}>(opcional)</span></label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>SELECIONE DATA E HORARIO</label>
          <button
            onClick={() => setMostrarCalendario(!mostrarCalendario)}
            style={{
              width: '100%',
              background: '#fafafa',
              border: '1px solid #e8e8e8',
              borderRadius: 8,
              padding: '12px 14px',
              color: dataSelecionada && horarioSelecionado ? '#111' : '#bbb',
              fontSize: 14,
              cursor: 'pointer',
              textAlign: 'left',
              fontWeight: dataSelecionada && horarioSelecionado ? 500 : 400,
            }}>
            {dataSelecionada && horarioSelecionado
              ? `${new Date(dataSelecionada + 'T00:00:00').toLocaleDateString('pt-BR')} - ${horarioSelecionado}`
              : 'Escolha data e horario'}
          </button>

          {mostrarCalendario && (
            <div style={{ marginTop: 10, background: 'white', border: '1px solid #e8e8e8', borderRadius: 8, padding: 16 }}>
              <p style={{ ...labelStyle, marginBottom: 12 }}>PROXIMOS DIAS</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                {obterProximosDias().map(dia => (
                  <button
                    key={dia}
                    onClick={() => setDataSelecionada(dia)}
                    style={{
                      padding: '10px 8px',
                      border: dataSelecionada === dia ? '2px solid #111' : '1px solid #e8e8e8',
                      background: dataSelecionada === dia ? '#111' : '#fafafa',
                      color: dataSelecionada === dia ? 'white' : '#111',
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: dataSelecionada === dia ? 600 : 400,
                    }}>
                    {new Date(dia + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  </button>
                ))}
              </div>

              {dataSelecionada && (
                <>
                  <p style={{ ...labelStyle, marginBottom: 12 }}>HORARIOS DISPONIVEIS</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {horarios.map(horario => (
                      <button
                        key={horario}
                        onClick={() => setHorarioSelecionado(horario)}
                        style={{
                          padding: '10px 8px',
                          border: horarioSelecionado === horario ? '2px solid #25D366' : '1px solid #e8e8e8',
                          background: horarioSelecionado === horario ? '#25D366' : '#fafafa',
                          color: horarioSelecionado === horario ? 'white' : '#111',
                          borderRadius: 6,
                          fontSize: 12,
                          cursor: 'pointer',
                          fontWeight: horarioSelecionado === horario ? 600 : 400,
                        }}>
                        {horario}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {erro && <p style={{ color: '#be123c', fontSize: 12, margin: 0 }}>{erro}</p>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={pagarOnline} disabled={enviando || !nome || !whatsapp || !dataSelecionada || !horarioSelecionado}
            style={{ flex: 1, minWidth: 150, background: enviando || !nome || !whatsapp || !dataSelecionada || !horarioSelecionado ? '#f0f0f0' : '#111', color: enviando || !nome || !whatsapp || !dataSelecionada || !horarioSelecionado ? '#bbb' : 'white', border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 12, letterSpacing: 2, cursor: 'pointer', fontWeight: 500 }}>
            {enviando ? 'ABRINDO...' : 'AGENDAR ONLINE'}
          </button>
          <button onClick={pagarPessoalmente} disabled={!nome || !whatsapp || !dataSelecionada || !horarioSelecionado}
            style={{ flex: 1, minWidth: 150, background: !nome || !whatsapp || !dataSelecionada || !horarioSelecionado ? '#f0f0f0' : '#25D366', color: !nome || !whatsapp || !dataSelecionada || !horarioSelecionado ? '#bbb' : 'white', border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 12, letterSpacing: 2, cursor: 'pointer', fontWeight: 500 }}>
            AGENDAR VIA WHATS
          </button>
          <button onClick={() => setAberto(false)}
            style={{ background: 'none', border: '1px solid #e8e8e8', borderRadius: 8, padding: '11px 16px', fontSize: 12, color: '#aaa', cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PaginaPublica() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug

  const [salao, setSalao] = useState<Salao | null>(null)
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [promocoes, setPromocoes] = useState<Promocao[]>([])
  const [loading, setLoading] = useState(true)
  const [pacoteSelecionado, setPacoteSelecionado] = useState<Pacote | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [dataSelecionadaPlano, setDataSelecionadaPlano] = useState<string>('')
  const [horarioSelecionadoPlano, setHorarioSelecionadoPlano] = useState<string>('')
  const [mostrarCalendarioPlano, setMostrarCalendarioPlano] = useState(false)

  const horarios = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00']

  function obterProximosDiasPlano() {
    const dias = []
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    for (let i = 0; i < 30; i++) {
      const data = new Date(hoje)
      data.setDate(data.getDate() + i)
      const diaSemana = data.getDay()
      if (diaSemana !== 0 && diaSemana !== 6) {
        dias.push(data.toISOString().split('T')[0])
      }
    }
    return dias
  }

  useEffect(() => {
    async function init() {
      if (!slug) return

      const { data: salaoData } = await supabase
        .from('saloes').select('*').eq('slug', slug).single()

      if (!salaoData) { setLoading(false); return }
      setSalao(salaoData as Salao)

      const { data: pacotesData } = await supabase
        .from('pacotes')
        .select('*, pacote_itens(*)')
        .eq('salao_id', salaoData.id)
        .eq('ativo', true)
        .order('preco_mensal', { ascending: true })
      setPacotes((pacotesData || []) as Pacote[])

      const hoje = new Date().toISOString().split('T')[0]
      const { data: promoData } = await supabase
        .from('promocoes')
        .select('*')
        .eq('salao_id', salaoData.id)
        .eq('ativo', true)
        .gte('data_fim', hoje)
        .order('criado_em', { ascending: false })
      setPromocoes((promoData || []) as Promocao[])

      setLoading(false)
    }
    init()
  }, [slug])

  async function notificarAssinatura() {
    if (!salao || !pacoteSelecionado) return
    const dataFormatada = new Date(dataSelecionadaPlano + 'T00:00:00').toLocaleDateString('pt-BR')
    await fetch('/api/notificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'agendamento_plano',
        nomeCliente: nome,
        emailCliente: email,
        whatsappCliente: whatsapp,
        nomePlano: pacoteSelecionado.nome,
        preco: dinheiro(pacoteSelecionado.preco_mensal),
        dataAgendamento: dataFormatada,
        horarioAgendamento: horarioSelecionadoPlano,
        emailSalao: salao.email_contato,
        nomeSalao: salao.nome,
      }),
    })
  }

  function assinarPessoalmente() {
    if (!nome || !whatsapp || !pacoteSelecionado || !salao || !dataSelecionadaPlano || !horarioSelecionadoPlano) return

    const dataFormatada = new Date(dataSelecionadaPlano + 'T00:00:00').toLocaleDateString('pt-BR')
    const msg = encodeURIComponent(
      `Ola! Gostaria de agendar o plano ${pacoteSelecionado.nome}:\n\n` +
      `*Plano:* ${pacoteSelecionado.nome}\n` +
      `*Valor:* R$ ${dinheiro(pacoteSelecionado.preco_mensal)}/mes\n\n` +
      `*Data:* ${dataFormatada}\n` +
      `*Horario:* ${horarioSelecionadoPlano}\n` +
      `*Nome:* ${nome}\n` +
      `*WhatsApp:* ${whatsapp}\n` +
      `*Email:* ${email || '(nao informado)'}`
    )

    window.open(`https://wa.me/${salao.whatsapp || ''}?text=${msg}`, '_blank')
    
    notificarAssinatura()
    
    setPacoteSelecionado(null)
    setNome('')
    setWhatsapp('')
    setEmail('')
    setDataSelecionadaPlano('')
    setHorarioSelecionadoPlano('')
    setMostrarCalendarioPlano(false)
    setSucesso(true)
  }

  async function pagarPlanoOnline() {
    if (!nome || !whatsapp || !pacoteSelecionado || !salao || !dataSelecionadaPlano || !horarioSelecionadoPlano) return
    setEnviando(true)
    setErro('')

    const res = await fetch('/api/stripe/public-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'plano',
        salaoId: salao.id,
        pacoteId: pacoteSelecionado.id,
        slug,
        nome,
        whatsapp,
        email,
        dataSelecionada: dataSelecionadaPlano,
        horarioSelecionado: horarioSelecionadoPlano,
      }),
    })

    const data = await res.json()
    if (!res.ok || !data.url) {
      setErro(data.error || 'Nao foi possivel abrir o pagamento online.')
      setEnviando(false)
      return
    }

    window.location.assign(data.url)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#999', fontSize: 14 }}>Carregando...</p>
    </div>
  )

  if (!salao) return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#999', fontSize: 14 }}>Salao nao encontrado</p>
    </div>
  )

  if (sucesso) return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: 16, padding: 48, maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <h2 style={{ color: '#111', fontSize: 22, fontWeight: 300, letterSpacing: 3, marginBottom: 8, fontFamily: 'Georgia, serif' }}>Confirmado</h2>
        <div style={{ width: 40, height: 1, background: '#ddd', margin: '16px auto' }} />
        <p style={{ color: '#888', fontSize: 14, lineHeight: 1.8 }}>
          Ola, <span style={{ color: '#111' }}>{nome}</span>.<br />
          Seu agendamento do <span style={{ color: '#111' }}>{pacoteSelecionado?.nome}</span> foi registrado.<br />
          Entraremos em contato em breve.
        </p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #eee', padding: '40px 24px', textAlign: 'center' }}>
        {salao.cargo && <p style={{ color: '#aaa', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>{salao.cargo}</p>}
        <h1 style={{ color: '#111', fontSize: 34, fontWeight: 300, letterSpacing: 6, fontFamily: 'Georgia, serif', margin: '0 0 8px' }}>{salao.nome}</h1>
        <div style={{ width: 60, height: 1, background: '#ddd', margin: '16px auto' }} />
        {salao.cidade && <p style={{ color: '#bbb', fontSize: 11, letterSpacing: 2 }}>{salao.cidade}</p>}
        {salao.descricao && <p style={{ color: '#999', fontSize: 13, marginTop: 12 }}>{salao.descricao}</p>}
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>
        {searchParams.get('pagamento') === 'sucesso' && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 12, padding: '12px 16px', fontSize: 13, marginBottom: 20 }}>
            Agendamento confirmado. Obrigado!
          </div>
        )}
        {searchParams.get('pagamento') === 'cancelado' && (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', borderRadius: 12, padding: '12px 16px', fontSize: 13, marginBottom: 20 }}>
            Agendamento cancelado. Voce ainda pode agendar via WhatsApp ou tentar de novo.
          </div>
        )}

        {promocoes.length > 0 && !pacoteSelecionado && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ color: '#aaa', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>Promocoes especiais</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {promocoes.map(p => (
                <div key={p.id} style={{ background: 'white', border: '1px solid #e8e8e8', borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
                  {p.imagem_url && (
                    <img src={p.imagem_url} alt={p.titulo} style={{ width: '100%', height: 280, objectFit: 'cover', objectPosition: 'top', display: 'block', borderRadius: '16px 16px 0 0' }} />
                  )}
                  <div style={{ padding: 20, position: 'relative' }}>
                  {!p.imagem_url && <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: '#111' }} />}
                  <div style={{ paddingLeft: p.imagem_url ? 0 : 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ color: '#aaa', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
                          ate {new Date(p.data_fim + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                        </p>
                        <h3 style={{ color: '#111', fontSize: 16, fontWeight: 400, margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>{p.titulo}</h3>
                        {p.descricao && <p style={{ color: '#999', fontSize: 12, margin: 0 }}>{p.descricao}</p>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                        {p.preco_original && <p style={{ color: '#ccc', fontSize: 12, textDecoration: 'line-through', margin: '0 0 2px' }}>R$ {dinheiro(p.preco_original)}</p>}
                        <p style={{ color: '#111', fontSize: 20, fontWeight: 300, margin: 0 }}>R$ {dinheiro(p.preco_promo)}</p>
                        {p.preco_original && Number(p.preco_original) > 0 && (
                          <span style={{ background: '#111', color: 'white', fontSize: 10, padding: '2px 8px', borderRadius: 20, display: 'inline-block', marginTop: 4 }}>
                            -{Math.round((1 - Number(p.preco_promo) / Number(p.preco_original)) * 100)}% OFF
                          </span>
                        )}
                      </div>
                    </div>
                    <AgendamentoPromo promo={p} salao={salao} slug={slug || ''} />
                  </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!pacoteSelecionado ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pacotes.map((p, idx) => (
              <div key={p.id}
                onClick={() => setPacoteSelecionado(p)}
                style={{ background: 'white', border: '1px solid #e8e8e8', borderRadius: 16, cursor: 'pointer', overflow: 'hidden', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#bbb'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.boxShadow = 'none' }}>
                {p.imagem_url && (
                  <img src={p.imagem_url} alt={p.nome} style={{ width: '100%', height: 280, objectFit: 'cover', objectPosition: 'top', display: 'block', borderRadius: '16px 16px 0 0' }} />
                )}
                <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <p style={{ color: '#bbb', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
                      {idx === 0 ? 'Essencial' : idx === 1 ? 'Completo' : 'Premium'}
                    </p>
                    <h3 style={{ color: '#111', fontSize: 20, fontWeight: 300, letterSpacing: 2, fontFamily: 'Georgia, serif', margin: 0 }}>{p.nome}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#111', fontSize: 26, fontWeight: 300, margin: 0 }}>R$ {dinheiro(p.preco_mensal)}</p>
                    <p style={{ color: '#bbb', fontSize: 11, margin: '4px 0 0' }}>por mes</p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {p.pacote_itens?.map(item => (
                    <span key={item.id} style={{ color: '#888', fontSize: 12, border: '1px solid #eee', borderRadius: 20, padding: '4px 12px', background: '#fafafa' }}>
                      {item.quantidade}x {item.servico_nome}
                    </span>
                  ))}
                </div>
                <button style={{ width: '100%', background: '#111', color: 'white', border: 'none', borderRadius: 8, padding: '13px 0', fontSize: 12, letterSpacing: 2, cursor: 'pointer', fontWeight: 500 }}>
                  ASSINAR
                </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'white', border: '1px solid #e8e8e8', borderRadius: 12, padding: 28, maxWidth: 440, margin: '0 auto' }}>
            <button onClick={() => setPacoteSelecionado(null)}
              style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 13, cursor: 'pointer', marginBottom: 24, padding: 0, letterSpacing: 1 }}>
              voltar
            </button>
            <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 20, marginBottom: 24 }}>
              <p style={{ color: '#bbb', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>Plano selecionado</p>
              <p style={{ color: '#111', fontSize: 18, fontWeight: 300, letterSpacing: 2, fontFamily: 'Georgia, serif', margin: '0 0 4px' }}>{pacoteSelecionado.nome}</p>
              <p style={{ color: '#999', fontSize: 14, margin: 0 }}>R$ {dinheiro(pacoteSelecionado.preco_mensal)}/mes</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>NOME</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>WHATSAPP</label>
                <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="5519999999999" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>EMAIL <span style={{ color: '#ddd' }}>(opcional)</span></label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>SELECIONE DATA E HORARIO</label>
                <button
                  onClick={() => setMostrarCalendarioPlano(!mostrarCalendarioPlano)}
                  style={{
                    width: '100%',
                    background: '#fafafa',
                    border: '1px solid #e8e8e8',
                    borderRadius: 8,
                    padding: '12px 14px',
                    color: dataSelecionadaPlano && horarioSelecionadoPlano ? '#111' : '#bbb',
                    fontSize: 14,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: dataSelecionadaPlano && horarioSelecionadoPlano ? 500 : 400,
                  }}>
                  {dataSelecionadaPlano && horarioSelecionadoPlano
                    ? `${new Date(dataSelecionadaPlano + 'T00:00:00').toLocaleDateString('pt-BR')} - ${horarioSelecionadoPlano}`
                    : 'Escolha data e horario'}
                </button>

                {mostrarCalendarioPlano && (
                  <div style={{ marginTop: 10, background: 'white', border: '1px solid #e8e8e8', borderRadius: 8, padding: 16 }}>
                    <p style={{ ...labelStyle, marginBottom: 12 }}>PROXIMOS DIAS</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                      {obterProximosDiasPlano().map(dia => (
                        <button
                          key={dia}
                          onClick={() => setDataSelecionadaPlano(dia)}
                          style={{
                            padding: '10px 8px',
                            border: dataSelecionadaPlano === dia ? '2px solid #111' : '1px solid #e8e8e8',
                            background: dataSelecionadaPlano === dia ? '#111' : '#fafafa',
                            color: dataSelecionadaPlano === dia ? 'white' : '#111',
                            borderRadius: 6,
                            fontSize: 12,
                            cursor: 'pointer',
                            fontWeight: dataSelecionadaPlano === dia ? 600 : 400,
                          }}>
                          {new Date(dia + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </button>
                      ))}
                    </div>

                    {dataSelecionadaPlano && (
                      <>
                        <p style={{ ...labelStyle, marginBottom: 12 }}>HORARIOS DISPONIVEIS</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          {horarios.map(horario => (
                            <button
                              key={horario}
                              onClick={() => setHorarioSelecionadoPlano(horario)}
                              style={{
                                padding: '10px 8px',
                                border: horarioSelecionadoPlano === horario ? '2px solid #25D366' : '1px solid #e8e8e8',
                                background: horarioSelecionadoPlano === horario ? '#25D366' : '#fafafa',
                                color: horarioSelecionadoPlano === horario ? 'white' : '#111',
                                borderRadius: 6,
                                fontSize: 12,
                                cursor: 'pointer',
                                fontWeight: horarioSelecionadoPlano === horario ? 600 : 400,
                              }}>
                              {horario}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {erro && <p style={{ color: '#be123c', fontSize: 12, margin: 0 }}>{erro}</p>}

              {salao.taxa_reserva && (
                <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>🔒</span>
                  <div>
                    <p style={{ color: '#15803d', fontSize: 12, fontWeight: 500, margin: '0 0 2px' }}>
                      Taxa de reserva: R$ {salao.taxa_reserva.toFixed(0)}
                    </p>
                    <p style={{ color: '#16a34a', fontSize: 11, margin: 0 }}>
                      Cobrada agora para garantir seu horário. Descontada no dia do serviço.
                    </p>
                  </div>
                </div>
              )}

              <button onClick={pagarPlanoOnline} disabled={enviando || !nome || !whatsapp || !dataSelecionadaPlano || !horarioSelecionadoPlano}
                style={{ width: '100%', background: enviando || !nome || !whatsapp || !dataSelecionadaPlano || !horarioSelecionadoPlano ? '#f0f0f0' : '#111', color: enviando || !nome || !whatsapp || !dataSelecionadaPlano || !horarioSelecionadoPlano ? '#bbb' : 'white', border: 'none', borderRadius: 8, padding: '14px 0', fontSize: 12, letterSpacing: 2, cursor: 'pointer', marginTop: 8, fontWeight: 500 }}>
                {enviando ? 'AGUARDE...' : salao.taxa_reserva ? `RESERVAR — R$ ${salao.taxa_reserva.toFixed(0)}` : 'AGENDAR ONLINE'}
              </button>
              <button onClick={assinarPessoalmente} disabled={!nome || !whatsapp || !dataSelecionadaPlano || !horarioSelecionadoPlano}
                style={{ width: '100%', background: !nome || !whatsapp || !dataSelecionadaPlano || !horarioSelecionadoPlano ? '#f0f0f0' : '#25D366', color: !nome || !whatsapp || !dataSelecionadaPlano || !horarioSelecionadoPlano ? '#bbb' : 'white', border: 'none', borderRadius: 8, padding: '14px 0', fontSize: 12, letterSpacing: 2, cursor: 'pointer', fontWeight: 500 }}>
                AGENDAR VIA WHATS
              </button>
              <p style={{ color: '#ccc', fontSize: 11, textAlign: 'center', letterSpacing: 1 }}>
                Você escolhe agendar agora ou via WhatsApp
              </p>
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #eee', padding: '24px', textAlign: 'center', marginTop: 40, background: 'white' }}>
        <p style={{ color: '#ccc', fontSize: 10, letterSpacing: 4 }}>
          {salao.nome.toUpperCase()}
          {salao.cargo ? ` - ${salao.cargo.toUpperCase()}` : ''}
        </p>
      </div>
    </div>
  )
}
