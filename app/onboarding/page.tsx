'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'

type Step = { id: number; titulo: string; subtitulo: string; emoji: string; cor: string }

const STEPS: Step[] = [
  { id: 1, emoji: '✨', cor: '#6366f1', titulo: 'Bem-vindo!',      subtitulo: 'Vamos começar' },
  { id: 2, emoji: '🏪', cor: '#8b5cf6', titulo: 'Seu salão',       subtitulo: 'Identidade' },
  { id: 3, emoji: '🔗', cor: '#ec4899', titulo: 'Link público',    subtitulo: 'Sua vitrine' },
  { id: 4, emoji: '💬', cor: '#10b981', titulo: 'Contato',         subtitulo: 'WhatsApp' },
  { id: 5, emoji: '💳', cor: '#f59e0b', titulo: 'Pagamentos',      subtitulo: 'Opcional' },
  { id: 6, emoji: '🚀', cor: '#6366f1', titulo: 'Tudo pronto!',    subtitulo: 'Concluído' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [animando, setAnimando] = useState(false)
  const [userId, setUserId] = useState('')
  const [salaoId, setSalaoId] = useState('')

  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState('')
  const [cidade, setCidade] = useState('')
  const [descricao, setDescricao] = useState('')
  const [slug, setSlug] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [emailContato, setEmailContato] = useState('')
  const [taxaReserva, setTaxaReserva] = useState('50')
  const [pagOnline, setPagOnline] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      setEmailContato(user.email || '')
      const { data: salao } = await supabase.from('saloes').select('*').eq('user_id', user.id).single()
      if (salao?.nome && salao?.whatsapp && salao?.slug && !salao.slug.includes(user.id.slice(0, 8))) {
        router.push('/dashboard'); return
      }
      if (salao) {
        setSalaoId(salao.id); setNome(salao.nome || ''); setCargo(salao.cargo || '')
        setCidade(salao.cidade || ''); setDescricao(salao.descricao || ''); setSlug(salao.slug || '')
        setWhatsapp(salao.whatsapp || ''); setEmailContato(salao.email_contato || user.email || '')
        setTaxaReserva(salao.taxa_reserva?.toString() || '50'); setPagOnline(salao.pagamento_online || false)
      }
      setLoading(false)
    }
    init()
  }, [router])

  function ir(para: number) {
    setAnimando(true)
    setTimeout(() => { setStep(para); setErro(''); setAnimando(false) }, 200)
  }

  function gerarSlug(v: string) {
    return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
  }

  function handleNome(v: string) {
    setNome(v)
    if (!slug || slug === gerarSlug(nome)) setSlug(gerarSlug(v))
  }

  async function avancar() {
    setErro('')
    if (step === 2 && !nome.trim()) { setErro('Digite o nome do salão'); return }
    if (step === 3) {
      if (!slug.trim()) { setErro('Escolha um link público'); return }
      if (!/^[a-z0-9-]+$/.test(slug)) { setErro('Apenas letras minúsculas, números e hifens'); return }
      const { data: exist } = await supabase.from('saloes').select('id').eq('slug', slug).neq('id', salaoId || '').single()
      if (exist) { setErro('Este link já está em uso. Escolha outro.'); return }
    }
    if (step === 4 && !whatsapp.trim()) { setErro('Digite o WhatsApp'); return }
    if (step === 5) {
      setSalvando(true)
      const payload = { nome, cargo, cidade, descricao, slug, whatsapp, email_contato: emailContato, taxa_reserva: taxaReserva ? parseFloat(taxaReserva) : null, pagamento_online: pagOnline }
      const { error } = salaoId
        ? await supabase.from('saloes').update(payload).eq('id', salaoId)
        : await supabase.from('saloes').insert({ ...payload, user_id: userId })
      setSalvando(false)
      if (error) { setErro('Erro ao salvar. Tente novamente.'); return }
    }
    if (step < 6) ir(step + 1)
    else router.push('/dashboard')
  }

  const s = STEPS[step - 1]
  const progresso = ((step - 1) / (STEPS.length - 1)) * 100
  const inp = { width: '100%', border: '1px solid #e2e8f0', borderRadius: 12, padding: '13px 16px', fontSize: 14, color: '#111', outline: 'none', background: 'white', boxSizing: 'border-box' as const }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, border: '2px solid #e2e8f0', borderTop: '2px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4ff 0%, #fdf2ff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } } @keyframes spin { to { transform:rotate(360deg) } }`}</style>
      <div style={{ width: '100%', maxWidth: 520, animation: 'slideUp 0.4s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(99,102,241,0.3)' }}>
            <span style={{ fontSize: 22 }}>✂️</span>
          </div>
          <p style={{ color: '#6366f1', fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>Beleza Recorrente</p>
        </div>

        <div style={{ background: 'white', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          {/* Progresso */}
          <div style={{ height: 4, background: '#f1f5f9' }}>
            <div style={{ height: '100%', background: `linear-gradient(90deg,${s.cor},${s.cor}cc)`, width: `${progresso}%`, transition: 'width 0.5s ease, background 0.3s' }} />
          </div>
          {/* Dots */}
          <div style={{ padding: '20px 28px 0', display: 'flex', alignItems: 'center' }}>
            {STEPS.map((st, i) => (
              <div key={st.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: st.id < step ? '#22c55e' : st.id === step ? s.cor : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: st.id < step ? 12 : 14, flexShrink: 0, boxShadow: st.id === step ? `0 0 0 4px ${s.cor}25` : 'none', transition: 'all 0.3s' }}>
                  {st.id < step ? '✓' : st.emoji}
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, background: st.id < step ? '#22c55e' : '#f1f5f9', margin: '0 4px', transition: 'background 0.3s' }} />}
              </div>
            ))}
          </div>

          <div style={{ padding: '24px 28px 28px', opacity: animando ? 0 : 1, transform: animando ? 'translateY(8px)' : 'translateY(0)', transition: 'opacity 0.2s, transform 0.2s' }}>
            <div style={{ marginBottom: 24 }}>
              <p style={{ color: s.cor, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 4px' }}>{step < 6 ? `Passo ${step - 1} de ${STEPS.length - 2}` : 'Concluído!'}</p>
              <h1 style={{ color: '#111', fontSize: 22, fontWeight: 600, margin: '0 0 4px', fontFamily: 'Georgia, serif' }}>{s.titulo}</h1>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>{s.subtitulo}</p>
            </div>

            {step === 1 && (
              <div>
                <div style={{ background: 'linear-gradient(135deg,#f0f4ff,#fdf2ff)', borderRadius: 16, padding: 24, marginBottom: 16 }}>
                  <p style={{ color: '#111', fontSize: 14, fontWeight: 500, margin: '0 0 10px', lineHeight: 1.5 }}>🎉 Bem-vindo ao sistema de gestão para salões mais completo!</p>
                  <p style={{ color: '#64748b', fontSize: 12, margin: 0, lineHeight: 1.7 }}>Em menos de 2 minutos você vai configurar seu salão e já pode começar a usar tudo.</p>
                </div>
                {[
                  { emoji: '👥', texto: 'Gerenciar assinantes e planos mensais' },
                  { emoji: '📅', texto: 'Controlar sua agenda de atendimentos' },
                  { emoji: '💳', texto: 'Receber pagamentos online automaticamente' },
                  { emoji: '📊', texto: 'Acompanhar faturamento e relatórios' },
                  { emoji: '🔗', texto: 'Ter sua própria página pública de vendas' },
                ].map(item => (
                  <div key={item.emoji} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9', marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>{item.emoji}</span>
                    <span style={{ color: '#374151', fontSize: 13 }}>{item.texto}</span>
                  </div>
                ))}
              </div>
            )}

            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Nome do salão *</label>
                  <input value={nome} onChange={e => handleNome(e.target.value)} placeholder="Ex: Studio Luiz Hair" autoFocus style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Especialidade</label>
                    <input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Hair Designer" style={inp} />
                  </div>
                  <div>
                    <label style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Cidade</label>
                    <input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Ex: Piracicaba, SP" style={inp} />
                  </div>
                </div>
                <div>
                  <label style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Descrição (opcional)</label>
                  <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Conte um pouco sobre seu trabalho..." rows={3} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#f0f4ff', borderRadius: 12, padding: '14px 16px', border: '1px solid #e0e7ff' }}>
                  <p style={{ color: '#4338ca', fontSize: 12, margin: 0, lineHeight: 1.6 }}>💡 Este link você compartilha com clientes no WhatsApp e Instagram para eles verem seus planos e agendarem online.</p>
                </div>
                <div>
                  <label style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Seu link público *</label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: 'white' }}>
                    <span style={{ background: '#f8fafc', padding: '13px 14px', fontSize: 12, color: '#94a3b8', borderRight: '1px solid #e2e8f0', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>/s/</span>
                    <input value={slug} onChange={e => setSlug(gerarSlug(e.target.value))} placeholder="luiz-hair" autoFocus style={{ flex: 1, border: 'none', padding: '13px 14px', fontSize: 14, color: '#111', outline: 'none', background: 'transparent', fontFamily: 'monospace' }} />
                  </div>
                </div>
                {slug && <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', border: '1px solid #bbf7d0' }}><p style={{ color: '#166534', fontSize: 12, margin: 0 }}>✓ <strong>beleza-recorrente.vercel.app/s/{slug}</strong></p></div>}
              </div>
            )}

            {step === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '14px 16px', border: '1px solid #bbf7d0' }}>
                  <p style={{ color: '#166534', fontSize: 12, margin: 0, lineHeight: 1.6 }}>💬 O WhatsApp é usado para confirmações de agendamento, lembretes e comunicação com clientes.</p>
                </div>
                <div>
                  <label style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>WhatsApp *</label>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: 'white' }}>
                    <span style={{ background: '#f8fafc', padding: '13px 14px', fontSize: 13, color: '#94a3b8', borderRight: '1px solid #e2e8f0' }}>+</span>
                    <input value={whatsapp} onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))} placeholder="5519999999999" autoFocus style={{ flex: 1, border: 'none', padding: '13px 14px', fontSize: 14, color: '#111', outline: 'none', background: 'transparent' }} />
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: 11, margin: '6px 0 0' }}>País + DDD + número. Ex: 5519999999999</p>
                </div>
                <div>
                  <label style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>E-mail</label>
                  <input value={emailContato} onChange={e => setEmailContato(e.target.value)} placeholder="seu@email.com" type="email" style={inp} />
                </div>
              </div>
            )}

            {step === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: '#fef9ec', borderRadius: 12, padding: '14px 16px', border: '1px solid #fde68a' }}>
                  <p style={{ color: '#92400e', fontSize: 12, margin: 0, lineHeight: 1.6 }}>💡 Você pode pular e configurar depois em <strong>Configurações</strong>. A taxa de reserva evita faltas e cancelamentos.</p>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 14, padding: 16, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ color: '#111', fontSize: 13, fontWeight: 600, margin: '0 0 3px' }}>Aceitar pagamento online</p>
                    <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>Clientes pagam ao agendar</p>
                  </div>
                  <div onClick={() => setPagOnline(!pagOnline)} style={{ width: 44, height: 24, borderRadius: 12, background: pagOnline ? '#6366f1' : '#e2e8f0', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 2, left: pagOnline ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                  </div>
                </div>
                {pagOnline && (
                  <div>
                    <label style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Taxa de reserva (R$)</label>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                      <span style={{ background: '#f8fafc', padding: '13px 14px', fontSize: 13, color: '#94a3b8', borderRight: '1px solid #e2e8f0' }}>R$</span>
                      <input value={taxaReserva} onChange={e => setTaxaReserva(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="50" style={{ flex: 1, border: 'none', padding: '13px 14px', fontSize: 14, color: '#111', outline: 'none', background: 'white' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 6 && (
              <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg,#22c55e,#16a34a)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}>
                  <span style={{ fontSize: 36 }}>🎉</span>
                </div>
                <h2 style={{ color: '#111', fontSize: 20, fontWeight: 600, margin: '0 0 8px', fontFamily: 'Georgia, serif' }}>Seu salão está pronto!</h2>
                <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px', lineHeight: 1.7 }}>Agora crie seus pacotes, cadastre clientes e comece a receber agendamentos online.</p>
                {[
                  { emoji: '1️⃣', texto: 'Crie seus pacotes de assinatura' },
                  { emoji: '2️⃣', texto: 'Configure os horários da agenda' },
                  { emoji: '3️⃣', texto: 'Compartilhe sua página pública' },
                ].map(item => (
                  <div key={item.emoji} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', marginBottom: 8, textAlign: 'left' }}>
                    <span style={{ fontSize: 16 }}>{item.emoji}</span>
                    <span style={{ color: '#166534', fontSize: 12, fontWeight: 500 }}>{item.texto}</span>
                  </div>
                ))}
              </div>
            )}

            {erro && <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '10px 14px', marginTop: 12 }}><p style={{ color: '#be123c', fontSize: 12, margin: 0 }}>⚠️ {erro}</p></div>}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              {step > 1 && step < 6 && (
                <button onClick={() => ir(step - 1)} style={{ flex: 1, background: 'none', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 12, padding: '13px 0', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>← Voltar</button>
              )}
              <button onClick={avancar} disabled={salvando}
                style={{ flex: step > 1 && step < 6 ? 2 : 1, background: `linear-gradient(135deg,${s.cor},${s.cor}cc)`, color: 'white', border: 'none', borderRadius: 12, padding: '13px 0', fontSize: 13, cursor: 'pointer', fontWeight: 600, boxShadow: `0 4px 14px ${s.cor}40`, opacity: salvando ? 0.7 : 1 }}>
                {salvando ? '⏳ Salvando...' : step === 1 ? '✨ Começar' : step === 5 ? '✓ Finalizar' : step === 6 ? '🚀 Acessar o painel' : 'Próximo →'}
              </button>
            </div>
            {step === 5 && <button onClick={avancar} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', padding: 8 }}>Pular e configurar depois</button>}
          </div>
        </div>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 20, letterSpacing: 2 }}>BELEZA RECORRENTE © 2026</p>
      </div>
    </div>
  )
}
