'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useParams } from 'next/navigation'

export default function PaginaPublica() {
  const { slug } = useParams()
  const [salao, setSalao] = useState<any>(null)
  const [pacotes, setPacotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pacoteSelecionado, setPacoteSelecionado] = useState<any>(null)
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    async function init() {
      const { data: salaoData } = await supabase
        .from('saloes').select('*').eq('slug', slug).single()
      if (!salaoData) { setLoading(false); return }
      setSalao(salaoData)
      const { data: pacotesData } = await supabase
        .from('pacotes')
        .select('*, pacote_itens(*)')
        .eq('salao_id', salaoData.id)
        .eq('ativo', true)
        .order('preco_mensal', { ascending: true })
      setPacotes(pacotesData || [])
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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666', fontSize: 14 }}>Carregando...</p>
    </div>
  )

  if (!salao) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#666', fontSize: 14 }}>Salão não encontrado</p>
    </div>
  )

  if (sucesso) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 16, padding: 40, maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 style={{ color: 'white', fontSize: 22, fontWeight: 300, letterSpacing: 2, marginBottom: 8, fontFamily: 'Georgia, serif' }}>Confirmado</h2>
        <div style={{ width: 40, height: 1, background: '#444', margin: '16px auto' }} />
        <p style={{ color: '#999', fontSize: 14, lineHeight: 1.8 }}>
          Olá, <span style={{ color: 'white' }}>{nome}</span>.<br />
          Sua assinatura do <span style={{ color: 'white' }}>{pacoteSelecionado.nome}</span> foi registrada.<br />
          Em breve entraremos em contato.
        </p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: '#555', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 16 }}>Hair Designer</p>
        <h1 style={{ color: 'white', fontSize: 32, fontWeight: 300, letterSpacing: 6, fontFamily: 'Georgia, serif', margin: '0 0 8px' }}>
          Marcelo Rissato
        </h1>
        <div style={{ width: 60, height: 1, background: '#333', margin: '16px auto' }} />
        {salao.cidade && <p style={{ color: '#555', fontSize: 12, letterSpacing: 2 }}>{salao.cidade}</p>}
        <p style={{ color: '#666', fontSize: 13, marginTop: 16 }}>Planos de assinatura exclusivos</p>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>
        {!pacoteSelecionado ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pacotes.map((p, idx) => (
              <div key={p.id}
                onClick={() => setPacoteSelecionado(p)}
                style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 24, cursor: 'pointer', transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#444')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <p style={{ color: '#555', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
                      {idx === 0 ? 'Essencial' : idx === 1 ? 'Completo' : 'Premium'}
                    </p>
                    <h3 style={{ color: 'white', fontSize: 18, fontWeight: 300, letterSpacing: 2, fontFamily: 'Georgia, serif', margin: 0 }}>{p.nome}</h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: 'white', fontSize: 24, fontWeight: 300, margin: 0 }}>R$ {parseFloat(p.preco_mensal).toFixed(0)}</p>
                    <p style={{ color: '#555', fontSize: 11, margin: '4px 0 0' }}>por mês</p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {p.pacote_itens?.map((item: any) => (
                    <span key={item.id} style={{ color: '#888', fontSize: 12, border: '1px solid #222', borderRadius: 20, padding: '4px 12px' }}>
                      {item.quantidade}x {item.servico_nome}
                    </span>
                  ))}
                </div>
                <button style={{ width: '100%', background: 'white', color: 'black', border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 13, letterSpacing: 2, cursor: 'pointer', fontWeight: 500 }}>
                  ASSINAR
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: 28, maxWidth: 440, margin: '0 auto' }}>
            <button onClick={() => setPacoteSelecionado(null)}
              style={{ background: 'none', border: 'none', color: '#555', fontSize: 13, cursor: 'pointer', marginBottom: 24, padding: 0, letterSpacing: 1 }}>
              ← voltar
            </button>

            <div style={{ borderBottom: '1px solid #1e1e1e', paddingBottom: 20, marginBottom: 24 }}>
              <p style={{ color: '#555', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>Plano selecionado</p>
              <p style={{ color: 'white', fontSize: 18, fontWeight: 300, letterSpacing: 2, fontFamily: 'Georgia, serif', margin: '0 0 4px' }}>{pacoteSelecionado.nome}</p>
              <p style={{ color: '#888', fontSize: 14, margin: 0 }}>R$ {parseFloat(pacoteSelecionado.preco_mensal).toFixed(0)}/mês</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ color: '#555', fontSize: 11, letterSpacing: 2, display: 'block', marginBottom: 8 }}>NOME</label>
                <input value={nome} onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, padding: '12px 14px', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ color: '#555', fontSize: 11, letterSpacing: 2, display: 'block', marginBottom: 8 }}>WHATSAPP</label>
                <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                  placeholder="5519999999999"
                  style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, padding: '12px 14px', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ color: '#555', fontSize: 11, letterSpacing: 2, display: 'block', marginBottom: 8 }}>EMAIL <span style={{ color: '#333' }}>(opcional)</span></label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8, padding: '12px 14px', color: 'white', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={assinar} disabled={enviando || !nome || !whatsapp}
                style={{ width: '100%', background: enviando || !nome || !whatsapp ? '#222' : 'white', color: enviando || !nome || !whatsapp ? '#555' : 'black', border: 'none', borderRadius: 8, padding: '14px 0', fontSize: 13, letterSpacing: 2, cursor: 'pointer', marginTop: 8, fontWeight: 500 }}>
                {enviando ? 'AGUARDE...' : 'CONFIRMAR ASSINATURA'}
              </button>
              <p style={{ color: '#333', fontSize: 11, textAlign: 'center', letterSpacing: 1 }}>O pagamento será combinado diretamente com o salão</p>
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #111', padding: '24px', textAlign: 'center', marginTop: 40 }}>
        <p style={{ color: '#333', fontSize: 11, letterSpacing: 3 }}>MARCELO RISSATO — HAIR DESIGNER</p>
      </div>
    </div>
  )
}