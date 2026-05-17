'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '@/app/lib/tema'
import Layout from '../components/Layout'

type MensagemConfig = {
  confirmacao: string
  lembrete: string
  aniversario: string
  inadimplente: string
  boas_vindas: string
}

const PADROES: MensagemConfig = {
  confirmacao: `Olá, {nome}! 🎉

Seu agendamento foi confirmado no *{salao}*!

📅 *Data:* {data}
🕐 *Horário:* {horario}
✂️ *Serviço:* {servico}

Qualquer dúvida, é só chamar. Te esperamos! 😊`,

  lembrete: `Oi, {nome}! 👋

Passando para lembrar do seu horário *amanhã* no *{salao}*!

📅 *{data}* às *{horario}*
✂️ {servico}

Confirma sua presença? Responda aqui! ✅`,

  aniversario: `🎂 *Feliz Aniversário, {nome}!* 🎉

O *{salao}* deseja um dia incrível cheio de amor e alegria!

Como presente especial, você ganhou *{pontos} pontos* de fidelidade. 🎁

Com carinho, equipe {salao} 💛`,

  inadimplente: `Olá, {nome}! 😊

Notamos que sua mensalidade do *{salao}* está em aberto.

Para continuar aproveitando todos os benefícios do seu plano *{plano}*, basta renovar clicando no link abaixo:

🔗 {link}

Dúvidas? Estamos aqui! 💬`,

  boas_vindas: `Seja bem-vinda(o), *{nome}*! 🌟

Ficamos felizes em ter você como cliente do *{salao}*!

Você agora faz parte do plano *{plano}* e já pode aproveitar todos os benefícios.

Qualquer dúvida é só chamar. Até breve! ✨`,
}

const VARIAVEIS = [
  { tag: '{nome}', desc: 'Nome do cliente' },
  { tag: '{salao}', desc: 'Nome do salão' },
  { tag: '{data}', desc: 'Data do agendamento' },
  { tag: '{horario}', desc: 'Horário do agendamento' },
  { tag: '{servico}', desc: 'Serviço agendado' },
  { tag: '{plano}', desc: 'Nome do plano' },
  { tag: '{pontos}', desc: 'Pontos de fidelidade' },
  { tag: '{link}', desc: 'Link de pagamento' },
]

export default function WhatsAppPage() {
  const router = useRouter()
  const { t } = useTema()
  const [loading, setLoading] = useState(true)
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [salaoNome, setSalaoNome] = useState('')
  const [salaoWhats, setSalaoWhats] = useState('')
  const [msgs, setMsgs] = useState<MensagemConfig>(PADROES)
  const [abaAtiva, setAbaAtiva] = useState<keyof MensagemConfig>('confirmacao')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [testando, setTestando] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('id, nome, whatsapp, msgs_whatsapp').eq('user_id', user.id).single()
      if (!salao) return
      setSalaoId(salao.id)
      setSalaoNome(salao.nome || '')
      setSalaoWhats(salao.whatsapp || '')
      if (salao.msgs_whatsapp) {
        setMsgs({ ...PADROES, ...salao.msgs_whatsapp })
      }
      setLoading(false)
    }
    init()
  }, [router])

  async function salvar() {
    if (!salaoId) return
    setSalvando(true)
    await supabase.from('saloes').update({ msgs_whatsapp: msgs }).eq('id', salaoId)
    setSalvando(false)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  function testar() {
    if (!salaoWhats) { alert('Configure o WhatsApp do salão nas Configurações primeiro.'); return }
    setTestando(true)
    const texto = msgs[abaAtiva]
      .replace('{nome}', 'Maria Silva')
      .replace('{salao}', salaoNome || 'Salão')
      .replace('{data}', new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }))
      .replace('{horario}', '14:00')
      .replace('{servico}', 'Corte + Escova')
      .replace('{plano}', 'Plano Ouro')
      .replace('{pontos}', '30')
      .replace('{link}', 'https://beleza-recorrente.vercel.app')
    window.open(`https://wa.me/55${salaoWhats.replace(/\D/g,'')}?text=${encodeURIComponent(texto)}`, '_blank')
    setTestando(false)
  }

  const ABAS: { key: keyof MensagemConfig; label: string; emoji: string; desc: string }[] = [
    { key: 'confirmacao', label: 'Confirmação', emoji: '✅', desc: 'Enviada ao confirmar um agendamento' },
    { key: 'lembrete', label: 'Lembrete', emoji: '⏰', desc: 'Enviada 24h antes do agendamento' },
    { key: 'boas_vindas', label: 'Boas-vindas', emoji: '🌟', desc: 'Enviada ao cadastrar novo cliente' },
    { key: 'aniversario', label: 'Aniversário', emoji: '🎂', desc: 'Enviada no dia do aniversário' },
    { key: 'inadimplente', label: 'Cobrança', emoji: '💳', desc: 'Enviada para clientes inadimplentes' },
  ]

  const inputStyle = { width: '100%', border: `0.5px solid ${t.border}`, borderRadius: 10, padding: '10px 14px', background: t.bgInput, fontSize: 13, color: t.text, outline: 'none', boxSizing: 'border-box' as const }
  const card = { background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18 }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: `2px solid ${t.border}`, borderTop: `2px solid ${t.text}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  return (
    <Layout>
      <style>{`
        .wa-pad { max-width: 1000px; margin: 0 auto; padding: 28px 20px; }
        .wa-grid { display: grid; grid-template-columns: 240px 1fr; gap: 20px; }
        @media (max-width: 768px) {
          .wa-pad { padding: 16px 14px; }
          .wa-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="wa-pad">

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: t.textFaint, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Comunicação</p>
            <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>WhatsApp</h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={testar} disabled={testando}
              style={{ background: '#25D366', color: 'white', border: 'none', borderRadius: 10, padding: '9px 16px', fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              💬 Testar mensagem
            </button>
            <button onClick={salvar} disabled={salvando}
              style={{ background: salvo ? '#22c55e' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              {salvo ? '✓ Salvo!' : salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Aviso wa.me */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
          <div>
            <p style={{ color: '#15803d', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>Como funciona</p>
            <p style={{ color: '#166534', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
              Ao clicar em enviar, o WhatsApp abre automaticamente com a mensagem pré-preenchida — você só confirma o envio. Nenhuma API necessária, funciona direto no celular ou computador.
            </p>
          </div>
        </div>

        <div className="wa-grid">
          {/* Sidebar — abas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ABAS.map(aba => (
              <button key={aba.key} onClick={() => setAbaAtiva(aba.key)}
                style={{
                  background: abaAtiva === aba.key ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : t.bgCard,
                  color: abaAtiva === aba.key ? 'white' : t.text,
                  border: `0.5px solid ${abaAtiva === aba.key ? 'transparent' : t.borderCard}`,
                  borderRadius: 12, padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                  boxShadow: abaAtiva === aba.key ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
                  transition: 'all 0.2s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{aba.emoji}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{aba.label}</p>
                    <p style={{ fontSize: 10, opacity: 0.7, margin: 0 }}>{aba.desc}</p>
                  </div>
                </div>
              </button>
            ))}

            {/* Variáveis disponíveis */}
            <div style={{ ...card, padding: '16px', marginTop: 8 }}>
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 12px', fontWeight: 600 }}>Variáveis</p>
              {VARIAVEIS.map(v => (
                <div key={v.tag} style={{ marginBottom: 6 }}>
                  <code style={{ background: '#6366f120', color: '#6366f1', fontSize: 11, padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>{v.tag}</code>
                  <span style={{ color: t.textFaint, fontSize: 11, marginLeft: 6 }}>{v.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Editor + Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Editor */}
            <div style={card}>
              <div style={{ padding: '16px 20px', borderBottom: `0.5px solid ${t.rowBorder}` }}>
                <p style={{ color: t.text, fontSize: 14, fontWeight: 500, margin: 0 }}>
                  {ABAS.find(a => a.key === abaAtiva)?.emoji} Mensagem de {ABAS.find(a => a.key === abaAtiva)?.label}
                </p>
                <p style={{ color: t.textFaint, fontSize: 11, margin: '4px 0 0' }}>
                  {ABAS.find(a => a.key === abaAtiva)?.desc}
                </p>
              </div>
              <div style={{ padding: '20px' }}>
                <textarea
                  value={msgs[abaAtiva]}
                  onChange={e => setMsgs({ ...msgs, [abaAtiva]: e.target.value })}
                  rows={10}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  <button onClick={() => setMsgs({ ...msgs, [abaAtiva]: PADROES[abaAtiva] })}
                    style={{ background: 'none', border: 'none', color: t.textFaint, fontSize: 12, cursor: 'pointer' }}>
                    ↺ Restaurar padrão
                  </button>
                  <span style={{ color: t.textFaint, fontSize: 11 }}>{msgs[abaAtiva].length} caracteres</span>
                </div>
              </div>
            </div>

            {/* Preview estilo WhatsApp */}
            <div style={card}>
              <div style={{ padding: '14px 20px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16 }}>💬</div>
                <div>
                  <p style={{ color: t.text, fontSize: 13, fontWeight: 600, margin: 0 }}>Preview</p>
                  <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>Como o cliente vai ver</p>
                </div>
              </div>
              <div style={{ padding: '20px', background: '#e5ddd5', minHeight: 120, borderRadius: '0 0 18px 18px' }}>
                <div style={{ background: 'white', borderRadius: '0 12px 12px 12px', padding: '10px 14px', maxWidth: '85%', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: -8, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 8px 8px 0', borderColor: 'transparent white transparent transparent' }} />
                  <p style={{ color: '#111', fontSize: 13, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msgs[abaAtiva]
                      .replace('{nome}', 'Maria Silva')
                      .replace('{salao}', salaoNome || 'Salão')
                      .replace('{data}', new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }))
                      .replace('{horario}', '14:00')
                      .replace('{servico}', 'Corte + Escova')
                      .replace('{plano}', 'Plano Ouro')
                      .replace('{pontos}', '30')
                      .replace('{link}', 'https://beleza-recorrente.vercel.app')
                      .replace(/\*(.*?)\*/g, '$1')
                    }
                  </p>
                  <p style={{ color: '#aaa', fontSize: 10, margin: '6px 0 0', textAlign: 'right' }}>
                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ✓✓
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
