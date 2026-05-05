'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '@/app/lib/tema'

export default function OnboardingPage() {
  const router = useRouter()
  const { t } = useTema()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [userId, setUserId] = useState('')
  const [salaoId, setSalaoId] = useState('')

  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState('')
  const [cidade, setCidade] = useState('')
  const [slug, setSlug] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [emailContato, setEmailContato] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      setEmailContato(user.email || '')

      // Verifica se salao ja existe e esta configurado
      const { data: salao } = await supabase
        .from('saloes')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (salao?.nome && salao?.whatsapp && salao?.slug && !salao.slug.includes(user.id.slice(0, 8))) {
        // Salao ja configurado — vai para o dashboard
        router.push('/dashboard')
        return
      }

      if (salao) {
        setSalaoId(salao.id)
        setNome(salao.nome || '')
        setCargo(salao.cargo || '')
        setCidade(salao.cidade || '')
        setWhatsapp(salao.whatsapp || '')
        setEmailContato(salao.email_contato || user.email || '')
      }

      setLoading(false)
    }
    init()
  }, [router])

  function gerarSlug(valor: string) {
    return valor.toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-')
  }

  function handleNome(valor: string) {
    setNome(valor)
    setSlug(gerarSlug(valor))
  }

  async function salvarStep1() {
    if (!nome) { setErro('Digite o nome do salao'); return }
    setErro('')
    setStep(2)
  }

  async function salvarStep2() {
    if (!slug) { setErro('Digite o link publico'); return }
    if (!/^[a-z0-9-]+$/.test(slug)) { setErro('Apenas letras minusculas, numeros e hifens'); return }

    // Verifica slug duplicado
    const { data: existente } = await supabase
      .from('saloes').select('id').eq('slug', slug)
      .neq('id', salaoId || '').single()
    if (existente) { setErro('Este link ja esta em uso. Escolha outro.'); return }

    setErro('')
    setStep(3)
  }

  async function finalizar() {
    if (!whatsapp) { setErro('Digite o WhatsApp'); return }
    setSalvando(true)
    setErro('')

    const payload = {
      nome,
      cargo,
      cidade,
      slug,
      whatsapp,
      email_contato: emailContato,
    }

    let error
    if (salaoId) {
      const res = await supabase.from('saloes').update(payload).eq('id', salaoId)
      error = res.error
    } else {
      const res = await supabase.from('saloes').insert({ ...payload, user_id: userId })
      error = res.error
    }

    if (error) {
      setErro('Erro ao salvar. Tente novamente.')
      setSalvando(false)
      return
    }

    router.push('/dashboard')
  }

  const inputStyle = {
    width: '100%', border: `0.5px solid ${t.border}`, borderRadius: 10,
    padding: '13px 16px', background: t.bgInput, fontSize: 14,
    color: t.text, outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = {
    color: t.textFaint, fontSize: 10, letterSpacing: 2,
    textTransform: 'uppercase' as const, display: 'block', marginBottom: 8,
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textFaint, fontSize: 12, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 40, height: 40, background: t.text, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <div style={{ width: 14, height: 14, background: t.bg, borderRadius: 3 }} />
          </div>
          <h1 style={{ color: t.text, fontSize: 24, fontWeight: 300, margin: '0 0 8px', fontFamily: 'Georgia, serif', letterSpacing: -0.5 }}>
            Vamos configurar seu salao
          </h1>
          <p style={{ color: t.textMuted, fontSize: 13, margin: 0 }}>
            Leva menos de 2 minutos
          </p>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, justifyContent: 'center' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: s === step ? t.text : s < step ? t.badgeAtivo : t.bgCard,
                border: `0.5px solid ${s === step ? t.text : s < step ? t.badgeAtivoText : t.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 500,
                color: s === step ? t.bg : s < step ? t.badgeAtivoText : t.textFaint,
                transition: 'all 0.2s',
              }}>
                {s < step ? '✓' : s}
              </div>
              {s < 3 && <div style={{ width: 32, height: 1, background: s < step ? t.badgeAtivoText : t.border }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 20, overflow: 'hidden' }}>

          {/* Step 1 — Identidade */}
          {step === 1 && (
            <div style={{ padding: '32px 32px 28px' }}>
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Passo 1 de 3</p>
              <h2 style={{ color: t.text, fontSize: 18, fontWeight: 400, margin: '0 0 24px' }}>Como se chama seu salao?</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Nome do salao ou profissional *</label>
                  <input value={nome} onChange={e => handleNome(e.target.value)}
                    placeholder="Ex: Marcelo Rissato" autoFocus style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cargo / especialidade</label>
                  <input value={cargo} onChange={e => setCargo(e.target.value)}
                    placeholder="Ex: Hair Designer, Cabeleireira, Barbeiro" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cidade</label>
                  <input value={cidade} onChange={e => setCidade(e.target.value)}
                    placeholder="Ex: Piracicaba, SP" style={inputStyle} />
                </div>
              </div>

              {erro && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 12 }}>{erro}</p>}

              <button onClick={salvarStep1}
                style={{ width: '100%', background: t.text, color: t.bg, border: 'none', borderRadius: 10, padding: 14, fontSize: 12, letterSpacing: 2, cursor: 'pointer', marginTop: 24, fontWeight: 500 }}>
                CONTINUAR
              </button>
            </div>
          )}

          {/* Step 2 — Link publico */}
          {step === 2 && (
            <div style={{ padding: '32px 32px 28px' }}>
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Passo 2 de 3</p>
              <h2 style={{ color: t.text, fontSize: 18, fontWeight: 400, margin: '0 0 8px' }}>Escolha seu link publico</h2>
              <p style={{ color: t.textMuted, fontSize: 13, margin: '0 0 24px', lineHeight: 1.6 }}>
                Este e o link que voce vai compartilhar com seus clientes para eles assinarem seus planos.
              </p>

              <div>
                <label style={labelStyle}>Seu link *</label>
                <div style={{ display: 'flex', alignItems: 'center', border: `0.5px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
                  <span style={{ background: t.bg, padding: '13px 14px', fontSize: 12, color: t.textMuted, borderRight: `0.5px solid ${t.border}`, whiteSpace: 'nowrap' }}>
                    /s/
                  </span>
                  <input value={slug} onChange={e => setSlug(gerarSlug(e.target.value))}
                    placeholder="meu-salao" autoFocus
                    style={{ flex: 1, border: 'none', padding: '13px 14px', background: t.bgInput, fontSize: 14, color: t.text, outline: 'none' }} />
                </div>
                <p style={{ color: t.textFaint, fontSize: 11, marginTop: 8 }}>
                  So letras minusculas, numeros e hifens.
                </p>
              </div>

              {slug && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: t.bg, borderRadius: 10, border: `0.5px solid ${t.border}` }}>
                  <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>
                    Seu link sera: <span style={{ color: t.text, fontWeight: 500 }}>beleza-recorrente.vercel.app/s/{slug}</span>
                  </p>
                </div>
              )}

              {erro && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 12 }}>{erro}</p>}

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button onClick={() => { setStep(1); setErro('') }}
                  style={{ flex: 1, background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 10, padding: 14, fontSize: 12, cursor: 'pointer' }}>
                  Voltar
                </button>
                <button onClick={salvarStep2}
                  style={{ flex: 2, background: t.text, color: t.bg, border: 'none', borderRadius: 10, padding: 14, fontSize: 12, letterSpacing: 2, cursor: 'pointer', fontWeight: 500 }}>
                  CONTINUAR
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Contato */}
          {step === 3 && (
            <div style={{ padding: '32px 32px 28px' }}>
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Passo 3 de 3</p>
              <h2 style={{ color: t.text, fontSize: 18, fontWeight: 400, margin: '0 0 8px' }}>Como seus clientes entram em contato?</h2>
              <p style={{ color: t.textMuted, fontSize: 13, margin: '0 0 24px', lineHeight: 1.6 }}>
                O WhatsApp e usado para seus clientes agendarem via promocoes e para as automacoes de retencao.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>WhatsApp *</label>
                  <div style={{ display: 'flex', alignItems: 'center', border: `0.5px solid ${t.border}`, borderRadius: 10, overflow: 'hidden' }}>
                    <span style={{ background: t.bg, padding: '13px 14px', fontSize: 13, color: t.textMuted, borderRight: `0.5px solid ${t.border}` }}>+</span>
                    <input value={whatsapp} onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                      placeholder="5519999999999" autoFocus
                      style={{ flex: 1, border: 'none', padding: '13px 14px', background: t.bgInput, fontSize: 14, color: t.text, outline: 'none' }} />
                  </div>
                  <p style={{ color: t.textFaint, fontSize: 11, marginTop: 8 }}>Codigo do pais + DDD + numero. Ex: 5519999999999</p>
                </div>
                <div>
                  <label style={labelStyle}>Email para notificacoes</label>
                  <input value={emailContato} onChange={e => setEmailContato(e.target.value)}
                    placeholder="seu@email.com" type="email" style={inputStyle} />
                </div>
              </div>

              {erro && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 12 }}>{erro}</p>}

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button onClick={() => { setStep(2); setErro('') }}
                  style={{ flex: 1, background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 10, padding: 14, fontSize: 12, cursor: 'pointer' }}>
                  Voltar
                </button>
                <button onClick={finalizar} disabled={salvando}
                  style={{ flex: 2, background: t.text, color: t.bg, border: 'none', borderRadius: 10, padding: 14, fontSize: 12, letterSpacing: 2, cursor: 'pointer', fontWeight: 500, opacity: salvando ? 0.5 : 1 }}>
                  {salvando ? 'SALVANDO...' : 'CONCLUIR'}
                </button>
              </div>
            </div>
          )}

        </div>

        <p style={{ textAlign: 'center', color: t.textFaint, fontSize: 11, marginTop: 20, letterSpacing: 2 }}>
          BELEZA RECORRENTE
        </p>

      </div>
    </div>
  )
}
