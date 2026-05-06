'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '@/app/lib/tema'
import Layout from '../components/Layout'

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { t } = useTema()
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [slugOriginal, setSlugOriginal] = useState('')
  const [cargo, setCargo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [cidade, setCidade] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [emailContato, setEmailContato] = useState('')
  const [taxaReserva, setTaxaReserva] = useState('')
  const [stripeConectado, setStripeConectado] = useState(false)
  const [stripeCarregando, setStripeCarregando] = useState(false)
  const [stripeChecking, setStripeChecking] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('*').eq('user_id', user.id).single()
      if (!salao) { router.push('/dashboard'); return }
      setSalaoId(salao.id)
      setNome(salao.nome || ''); setSlug(salao.slug || ''); setSlugOriginal(salao.slug || '')
      setCargo(salao.cargo || ''); setDescricao(salao.descricao || '')
      setCidade(salao.cidade || ''); setWhatsapp(salao.whatsapp || ''); setEmailContato(salao.email_contato || '')
      setTaxaReserva(salao.taxa_reserva?.toString() || '')
      setLoading(false)
    }
    init()
  }, [router])

  const verificarStripe = useCallback(async (id: string) => {
    setStripeChecking(true)
    const res = await fetch('/api/stripe/connect/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salaoId: id }),
    })
    const data = await res.json()
    setStripeConectado(data.conectado || false)
    setStripeChecking(false)
  }, [])

  const stripeChecked = useRef(false)
  useEffect(() => {
    if (!salaoId || stripeChecked.current) return
    stripeChecked.current = true
    const params = new URLSearchParams(window.location.search)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    verificarStripe(salaoId).then(() => {
      if (params.get('stripe') === 'sucesso') {
        window.history.replaceState({}, '', '/configuracoes')
      }
    })
  }, [salaoId, verificarStripe])

  async function conectarStripe() {
    if (!salaoId) return
    setStripeCarregando(true)
    const res = await fetch('/api/stripe/connect/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salaoId }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setStripeCarregando(false)
  }

  function gerarSlug(valor: string) {
    return valor.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
  }

  function handleNome(valor: string) {
    setNome(valor)
    if (slug === slugOriginal) setSlug(gerarSlug(valor))
  }

  async function salvar() {
    if (!nome || !slug || !whatsapp) { setErro('Nome, link publico e WhatsApp sao obrigatorios.'); return }
    if (!/^[a-z0-9-]+$/.test(slug)) { setErro('O link publico so pode ter letras minusculas, numeros e hifens.'); return }
    if (slug !== slugOriginal) {
      const { data: existente } = await supabase.from('saloes').select('id').eq('slug', slug).neq('id', salaoId).single()
      if (existente) { setErro('Este link ja esta em uso. Escolha outro.'); return }
    }
    setSalvando(true); setErro('')
    const { error } = await supabase.from('saloes').update({ nome, slug, cargo, descricao, cidade, whatsapp, email_contato: emailContato, taxa_reserva: taxaReserva ? parseFloat(taxaReserva) : null }).eq('id', salaoId)
    if (error) { setErro('Erro ao salvar. Tente novamente.') }
    else { setSlugOriginal(slug); setSucesso(true); setTimeout(() => setSucesso(false), 3000) }
    setSalvando(false)
  }

  const inputStyle = { width: '100%', border: `0.5px solid ${t.border}`, borderRadius: 10, padding: '11px 14px', background: t.bgInput, fontSize: 13, color: t.text, outline: 'none', boxSizing: 'border-box' as const }
  const labelStyle = { color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' as const, display: 'block', marginBottom: 7 }
  const sectionStyle = { background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, overflow: 'hidden', marginBottom: 14 }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textFaint, fontSize: 12, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )

  return (
    <Layout>
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
<div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: 32 }}>
          <p style={{ color: t.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 6px' }}>Conta</p>
          <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Configuracoes</h1>
        </div>

        {/* Identidade */}
        <div style={sectionStyle}>
          <div style={{ padding: '20px 24px', borderBottom: `0.5px solid ${t.rowBorder}` }}>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>Identidade</p>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div><label style={labelStyle}>Nome do salao</label><input value={nome} onChange={e => handleNome(e.target.value)} placeholder="Ex: Marcelo Rissato" style={inputStyle} /></div>
            <div><label style={labelStyle}>Cargo</label><input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Hair Designer" style={inputStyle} /></div>
            <div><label style={labelStyle}>Descricao curta</label><input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Planos de assinatura exclusivos" style={inputStyle} /></div>
            <div><label style={labelStyle}>Cidade</label><input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Ex: Piracicaba, SP" style={inputStyle} /></div>
          </div>
        </div>

        {/* Link publico */}
        <div style={sectionStyle}>
          <div style={{ padding: '20px 24px', borderBottom: `0.5px solid ${t.rowBorder}` }}>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>Link publico</p>
          </div>
          <div style={{ padding: '24px' }}>
            <label style={labelStyle}>Endereco da sua pagina</label>
            <div style={{ display: 'flex', alignItems: 'center', border: `0.5px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <span style={{ background: t.bg, padding: '11px 14px', fontSize: 12, color: t.textMuted, borderRight: `0.5px solid ${t.border}`, whiteSpace: 'nowrap' }}>
                beleza-recorrente.vercel.app/s/
              </span>
              <input value={slug} onChange={e => setSlug(gerarSlug(e.target.value))} placeholder="meu-salao"
                style={{ flex: 1, border: 'none', padding: '11px 14px', background: t.bgInput, fontSize: 13, color: t.text, outline: 'none' }} />
            </div>
            <p style={{ color: t.textFaint, fontSize: 11, marginTop: 8 }}>So letras minusculas, numeros e hifens.</p>
            {slug && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: t.bg, borderRadius: 10, border: `0.5px solid ${t.border}` }}>
                <span style={{ color: t.textFaint, fontSize: 11 }}>Seu link:</span>
                <span style={{ color: t.textMuted, fontSize: 11, fontWeight: 500 }}>beleza-recorrente.vercel.app/s/{slug}</span>
                <button onClick={() => { navigator.clipboard.writeText('https://beleza-recorrente.vercel.app/s/' + slug); setSucesso(true); setTimeout(() => setSucesso(false), 2000) }}
                  style={{ marginLeft: 'auto', background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>
                  Copiar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pagamento */}
        <div style={sectionStyle}>
          <div style={{ padding: '20px 24px', borderBottom: `0.5px solid ${t.rowBorder}` }}>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>Pagamento online</p>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Stripe Connect */}
            <div style={{ border: `0.5px solid ${stripeConectado ? t.badgeAtivoText : t.border}`, borderRadius: 12, padding: '16px 20px', background: stripeConectado ? t.badgeAtivo : t.bg }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: stripeConectado ? t.badgeAtivoText : t.text, fontSize: 13, fontWeight: 500, margin: '0 0 3px' }}>
                    {stripeChecking ? 'Verificando...' : stripeConectado ? '✓ Conta bancária conectada' : 'Conectar conta bancária'}
                  </p>
                  <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>
                    {stripeConectado
                      ? 'Você recebe os pagamentos diretamente. Comissão de 5% por transação.'
                      : 'Conecte sua conta para receber os pagamentos das reservas diretamente.'}
                  </p>
                </div>
                {!stripeChecking && (
                  <button onClick={conectarStripe} disabled={stripeCarregando}
                    style={{
                      background: stripeConectado ? 'none' : t.text,
                      color: stripeConectado ? t.textFaint : t.navBg,
                      border: stripeConectado ? `0.5px solid ${t.border}` : 'none',
                      borderRadius: 8, padding: '8px 16px', fontSize: 11,
                      cursor: 'pointer', whiteSpace: 'nowrap', opacity: stripeCarregando ? 0.5 : 1,
                      marginLeft: 16, flexShrink: 0,
                    }}>
                    {stripeCarregando ? 'Aguarde...' : stripeConectado ? 'Reconfigurar' : 'Conectar Stripe'}
                  </button>
                )}
              </div>
            </div>

            {/* Taxa de reserva */}
            <div>
              <label style={labelStyle}>Taxa de reserva (R$)</label>
              <div style={{ display: 'flex', alignItems: 'center', border: `0.5px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <span style={{ background: t.bg, padding: '11px 14px', fontSize: 13, color: t.textMuted, borderRight: `0.5px solid ${t.border}` }}>R$</span>
                <input value={taxaReserva} onChange={e => setTaxaReserva(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="50"
                  style={{ flex: 1, border: 'none', padding: '11px 14px', background: t.bgInput, fontSize: 13, color: t.text, outline: 'none' }} />
              </div>
              <p style={{ color: t.textFaint, fontSize: 11, marginTop: 8 }}>
                Valor cobrado antecipadamente para garantir o horario. Descontado no dia do servico. Deixe vazio para cobrar o valor cheio do plano.
              </p>
            </div>
          </div>
        </div>

        {/* Contato */}
        <div style={sectionStyle}>
          <div style={{ padding: '20px 24px', borderBottom: `0.5px solid ${t.rowBorder}` }}>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>Contato</p>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>WhatsApp</label>
              <div style={{ display: 'flex', alignItems: 'center', border: `0.5px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <span style={{ background: t.bg, padding: '11px 14px', fontSize: 13, color: t.textMuted, borderRight: `0.5px solid ${t.border}` }}>+</span>
                <input value={whatsapp} onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))} placeholder="5519999999999"
                  style={{ flex: 1, border: 'none', padding: '11px 14px', background: t.bgInput, fontSize: 13, color: t.text, outline: 'none' }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email para notificacoes</label>
              <input value={emailContato} onChange={e => setEmailContato(e.target.value)} placeholder="seu@email.com" type="email" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
          <div>
            {erro && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{erro}</p>}
            {sucesso && <p style={{ color: t.badgeAtivoText, fontSize: 13, margin: 0 }}>Salvo com sucesso!</p>}
          </div>
          <button onClick={salvar} disabled={salvando}
            style={{ background: t.text, color: t.navBg, border: 'none', borderRadius: 10, padding: '11px 28px', fontSize: 12, cursor: 'pointer', opacity: salvando ? 0.5 : 1 }}>
            {salvando ? 'Salvando...' : 'Salvar alteracoes'}
          </button>
        </div>

        {/* Sair */}
        <div style={{ ...sectionStyle, marginTop: 24 }}>
          <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: t.text, fontSize: 13, margin: '0 0 3px' }}>Sair da conta</p>
              <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>Voce sera redirecionado para o login</p>
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
              style={{ background: 'none', border: '0.5px solid #ef4444', color: '#ef4444', borderRadius: 8, padding: '7px 16px', fontSize: 12, cursor: 'pointer' }}>
              Sair
            </button>
          </div>
        </div>

      </div>
    </div>
  </Layout>
  )
}
