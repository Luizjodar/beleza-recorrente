'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useParams } from 'next/navigation'
function AgendamentoPromo({ promo }: { promo: any }) {
  const [aberto, setAberto] = useState(false)
  const [nomeAge, setNomeAge] = useState('')
  const [whatsAge, setWhatsAge] = useState('')
  const [horario, setHorario] = useState('')

  function confirmar() {
    if (!nomeAge || !whatsAge || !horario) return
    const msg = encodeURIComponent(
      `Olá, Marcelo! Gostaria de agendar a promoção:\n\n` +
      `*${promo.titulo}* — R$ ${parseFloat(promo.preco_promo).toFixed(0)}\n\n` +
      `*Nome:* ${nomeAge}\n` +
      `*WhatsApp:* ${whatsAge}\n` +
      `*Horário desejado:* ${horario}`
    )
    window.open(`https://wa.me/551934266185?text=${msg}`, '_blank')
    setAberto(false)
    setNomeAge(''); setWhatsAge(''); setHorario('')
  }

  if (!aberto) return (
    <button
      onClick={() => setAberto(true)}
      style={{ marginTop: 14, marginLeft: 12, width: 'calc(100% - 12px)', background: '#25D366', color: 'white', border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 12, letterSpacing: 2, cursor: 'pointer', fontWeight: 500 }}>
      AGENDAR VIA WHATSAPP
    </button>
  )

  return (
    <div style={{ marginTop: 14, marginLeft: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ color: '#aaa', fontSize: 10, letterSpacing: 2, display: 'block', marginBottom: 6 }}>SEU NOME</label>
          <input value={nomeAge} onChange={e => setNomeAge(e.target.value)}
            placeholder="Ex: Ana Paula"
            style={{ width: '100%', background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 8, padding: '10px 12px', color: '#111', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ color: '#aaa', fontSize: 10, letterSpacing: 2, display: 'block', marginBottom: 6 }}>SEU WHATSAPP</label>
          <input value={whatsAge} onChange={e => setWhatsAge(e.target.value)}
            placeholder="5519999999999"
            style={{ width: '100%', background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 8, padding: '10px 12px', color: '#111', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ color: '#aaa', fontSize: 10, letterSpacing: 2, display: 'block', marginBottom: 6 }}>HORÁRIO DESEJADO</label>
          <input value={horario} onChange={e => setHorario(e.target.value)}
            placeholder="Ex: Segunda às 14h ou Terça manhã"
            style={{ width: '100%', background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 8, padding: '10px 12px', color: '#111', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={confirmar} disabled={!nomeAge || !whatsAge || !horario}
            style={{ flex: 1, background: !nomeAge || !whatsAge || !horario ? '#f0f0f0' : '#25D366', color: !nomeAge || !whatsAge || !horario ? '#bbb' : 'white', border: 'none', borderRadius: 8, padding: '11px 0', fontSize: 12, letterSpacing: 2, cursor: 'pointer', fontWeight: 500 }}>
            ENVIAR
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
const slug = typeof window !== 'undefined'
  ? window.location.pathname.split('/').pop()
  : Array.isArray(params?.slug) ? params.slug[0] : params?.slug
  const [salao, setSalao] = useState<any>(null)
  const [pacotes, setPacotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [promocoes, setPromocoes] = useState<any[]>([])
  const [pacoteSelecionado, setPacoteSelecionado] = useState<any>(null)
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    async function init() {
      if (!slug) return
      const slugStr = Array.isArray(slug) ? slug[0] : slug
      const { data: salaoData } = await supabase
        .from('saloes').select('*').eq('slug', slugStr).single()
      if (!salaoData) {
  console.log('SLUG RECEBIDO:', slug)
  console.log('SLUG STR:', slugStr)
  setLoading(false); return
}
      setSalao(salaoData)
      const { data: pacotesData } = await supabase
        .from('pacotes')
        .select('*, pacote_itens(*)')
        .eq('salao_id', salaoData.id)
        .eq('ativo', true)
        .order('preco_mensal', { ascending: true })
      setPacotes(pacotesData || [])

      const hoje = new Date().toISOString().split('T')[0]
      const { data: promoData } = await supabase
        .from('promocoes')
        .select('*')
        .eq('salao_id', salaoData.id)
        .eq('ativo', true)
        .gte('data_fim', hoje)
        .order('criado_em', { ascending: false })
      setPromocoes(promoData || [])

      setLoading(false)
    }
    init()
  }, [slug])

  async function assinar() {
    if (!nome || !whatsapp || !pacoteSelecionado) return
    setEnviando(true)
    const { data } = await supabase.from('assinantes').insert({
      salao_id: salao.id,
      pacote_id: pacoteSelecionado.id,
      nome, whatsapp, email,
      data_inicio: new Date().toISOString().split('T')[0],
    }).select().single()
    if (data) {
      await supabase.rpc('gerar_saldo_mensal', {
        p_assinante_id: data.id,
        p_mes: new Date().toISOString().split('T')[0],
      })
      await fetch('/api/notificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeCliente: nome,
          emailCliente: email,
          nomePlano: pacoteSelecionado.nome,
          preco: parseFloat(pacoteSelecionado.preco_mensal).toFixed(0),
          emailSalao: 'luisjodar00@gmail.com',
          nomeSalao: salao.nome,
          whatsappCliente: whatsapp,
        }),
      })
      setSucesso(true)
    }
    setEnviando(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#999', fontSize: 14 }}>Carregando...</p>
    </div>
  )

  if (!salao) return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
      <p style={{ color: '#999', fontSize: 14 }}>Salão não encontrado</p>
      <p style={{ color: 'red', fontSize: 12 }}>slug: {String(slug)}</p>
      <p style={{ color: 'red', fontSize: 12 }}>url: {typeof window !== 'undefined' ? window.location.pathname : 'ssr'}</p>
    </div>
  )

  if (sucesso) return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'white', border: '1px solid #e5e5e5', borderRadius: 16, padding: 48, maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 style={{ color: '#111', fontSize: 22, fontWeight: 300, letterSpacing: 3, marginBottom: 8, fontFamily: 'Georgia, serif' }}>Confirmado</h2>
        <div style={{ width: 40, height: 1, background: '#ddd', margin: '16px auto' }} />
        <p style={{ color: '#888', fontSize: 14, lineHeight: 1.8 }}>
          Olá, <span style={{ color: '#111' }}>{nome}</span>.<br />
          Sua assinatura do <span style={{ color: '#111' }}>{pacoteSelecionado.nome}</span> foi registrada.<br />
          Em breve entraremos em contato.
        </p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #eee', padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ color: '#aaa', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>Hair Designer</p>
        <h1 style={{ color: '#111', fontSize: 34, fontWeight: 300, letterSpacing: 6, fontFamily: 'Georgia, serif', margin: '0 0 8px' }}>
          Marcelo Rissato
        </h1>
        <div style={{ width: 60, height: 1, background: '#ddd', margin: '16px auto' }} />
        {salao.cidade && <p style={{ color: '#bbb', fontSize: 11, letterSpacing: 2 }}>{salao.cidade}</p>}
        <p style={{ color: '#999', fontSize: 13, marginTop: 12 }}>Planos de assinatura exclusivos</p>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>

        {promocoes.length > 0 && !pacoteSelecionado && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ color: '#aaa', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 }}>Promoções especiais</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {promocoes.map(p => (
                <div key={p.id} style={{ background: 'white', border: '1px solid #e8e8e8', borderRadius: 12, padding: 20, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: '#111' }} />
                  <div style={{ paddingLeft: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ color: '#aaa', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
                          até {new Date(p.data_fim + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                        </p>
                        <h3 style={{ color: '#111', fontSize: 16, fontWeight: 400, margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>{p.titulo}</h3>
                        {p.descricao && <p style={{ color: '#999', fontSize: 12, margin: 0 }}>{p.descricao}</p>}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                        {p.preco_original && (
                          <p style={{ color: '#ccc', fontSize: 12, textDecoration: 'line-through', margin: '0 0 2px' }}>
                            R$ {parseFloat(p.preco_original).toFixed(0)}
                          </p>
                        )}
                        <p style={{ color: '#111', fontSize: 20, fontWeight: 300, margin: 0 }}>R$ {parseFloat(p.preco_promo).toFixed(0)}</p>
                        {p.preco_original && (
                          <span style={{ background: '#111', color: 'white', fontSize: 10, padding: '2px 8px', borderRadius: 20, letterSpacing: 1 }}>
                            -{Math.round((1 - p.preco_promo / p.preco_original) * 100)}% OFF
                          </span>
                        )}
                      </div>
                    </div>
                    <AgendamentoPromo promo={p} />
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
                style={{ background: 'white', border: '1px solid #e8e8e8', borderRadius: 12, padding: 24, cursor: 'pointer', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#bbb'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <p style={{ color: '#bbb', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
                      {idx === 0 ? 'Essencial' : idx === 1 ? 'Completo' : 'Premium'}
                    </p>
                    <h3 style={{ color: '#111', fontSize: 20, fontWeight: 300, letterSpacing: 2, fontFamily: 'Georgia, serif', margin: 0 }}>{p.nome}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: '#111', fontSize: 26, fontWeight: 300, margin: 0 }}>R$ {parseFloat(p.preco_mensal).toFixed(0)}</p>
                    <p style={{ color: '#bbb', fontSize: 11, margin: '4px 0 0' }}>por mês</p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {p.pacote_itens?.map((item: any) => (
                    <span key={item.id} style={{ color: '#888', fontSize: 12, border: '1px solid #eee', borderRadius: 20, padding: '4px 12px', background: '#fafafa' }}>
                      {item.quantidade}x {item.servico_nome}
                    </span>
                  ))}
                </div>
                <button style={{ width: '100%', background: '#111', color: 'white', border: 'none', borderRadius: 8, padding: '13px 0', fontSize: 12, letterSpacing: 2, cursor: 'pointer', fontWeight: 500 }}>
                  ASSINAR
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'white', border: '1px solid #e8e8e8', borderRadius: 12, padding: 28, maxWidth: 440, margin: '0 auto' }}>
            <button onClick={() => setPacoteSelecionado(null)}
              style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 13, cursor: 'pointer', marginBottom: 24, padding: 0, letterSpacing: 1 }}>
              ← voltar
            </button>
            <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 20, marginBottom: 24 }}>
              <p style={{ color: '#bbb', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>Plano selecionado</p>
              <p style={{ color: '#111', fontSize: 18, fontWeight: 300, letterSpacing: 2, fontFamily: 'Georgia, serif', margin: '0 0 4px' }}>{pacoteSelecionado.nome}</p>
              <p style={{ color: '#999', fontSize: 14, margin: 0 }}>R$ {parseFloat(pacoteSelecionado.preco_mensal).toFixed(0)}/mês</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ color: '#aaa', fontSize: 11, letterSpacing: 2, display: 'block', marginBottom: 8 }}>NOME</label>
                <input value={nome} onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  style={{ width: '100%', background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 8, padding: '12px 14px', color: '#111', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ color: '#aaa', fontSize: 11, letterSpacing: 2, display: 'block', marginBottom: 8 }}>WHATSAPP</label>
                <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                  placeholder="5519999999999"
                  style={{ width: '100%', background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 8, padding: '12px 14px', color: '#111', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ color: '#aaa', fontSize: 11, letterSpacing: 2, display: 'block', marginBottom: 8 }}>EMAIL <span style={{ color: '#ddd' }}>(opcional)</span></label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  style={{ width: '100%', background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 8, padding: '12px 14px', color: '#111', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={assinar} disabled={enviando || !nome || !whatsapp}
                style={{ width: '100%', background: enviando || !nome || !whatsapp ? '#f0f0f0' : '#111', color: enviando || !nome || !whatsapp ? '#bbb' : 'white', border: 'none', borderRadius: 8, padding: '14px 0', fontSize: 12, letterSpacing: 2, cursor: 'pointer', marginTop: 8, fontWeight: 500 }}>
                {enviando ? 'AGUARDE...' : 'CONFIRMAR ASSINATURA'}
              </button>
              <p style={{ color: '#ccc', fontSize: 11, textAlign: 'center', letterSpacing: 1 }}>O pagamento será combinado diretamente com o salão</p>
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #eee', padding: '24px', textAlign: 'center', marginTop: 40, background: 'white' }}>
        <p style={{ color: '#ccc', fontSize: 10, letterSpacing: 4 }}>MARCELO RISSATO — HAIR DESIGNER</p>
      </div>
    </div>
  )
}
