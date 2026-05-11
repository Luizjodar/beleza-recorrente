'use client'

import { useState, useRef, useEffect } from 'react'
import { useTema } from '@/app/lib/tema'

type Mensagem = {
  role: 'user' | 'assistant'
  content: string
}

const SISTEMA = `Você é um assistente especializado no sistema Beleza Recorrente — uma plataforma SaaS para salões de beleza gerenciarem assinantes, agendamentos e pagamentos recorrentes.

Responda SEMPRE em português do Brasil, de forma clara, direta e amigável. Use linguagem simples, sem jargões técnicos.

Você conhece todas as funcionalidades do sistema:

PACOTES: O dono cria planos de assinatura (ex: "Plano Bronze: 2 cortes/mês por R$ 180"). Pode adicionar arte/imagem, definir serviços incluídos e preço mensal.

ASSINANTES: Clientes vinculados a um pacote. O sistema controla o saldo de serviços de cada cliente por mês automaticamente.

AGENDA: Visualização semanal/mensal dos agendamentos. O dono configura os horários disponíveis (dias da semana, hora início/fim, intervalo em minutos).

PAGAMENTO ONLINE: O dono pode ativar/desativar nas Configurações. Quando ativo, o cliente paga uma taxa de reserva via Stripe ao agendar. O sistema usa Stripe Connect para o salão receber direto na conta dele, com 5% de comissão da plataforma.

STRIPE CONNECT: Nas Configurações, o salão conecta sua conta Stripe para receber pagamentos diretos. Taxa do Stripe: ~3,99% + R$0,39 no cartão, 1% no Pix.

PÁGINA PÚBLICA: Cada salão tem uma URL exclusiva (beleza-recorrente.vercel.app/s/slug-do-salao) para compartilhar com clientes. Mostra promoções, pacotes com imagens e permite agendamento.

PROMOÇÕES: O dono cria promoções com preço original e preço promocional, data de validade e arte/imagem. Aparecem na página pública.

RELATÓRIOS: Gráficos de faturamento (receita, despesas, lucro), crescimento de assinantes, agendamentos e despesas por categoria. Filtra por 3, 6 ou 12 meses.

CLIENTES: Análise detalhada dos clientes — ativos, inativos (sem visita há 30+ dias), inadimplentes.

DESPESAS: Registro de despesas do salão por categoria (aluguel, energia, água, fornecedor, marketing, salário, outros).

FUNCIONÁRIOS: Cadastro com cargo, telefone, email e percentual de comissão.

PRODUTOS: Controle de estoque de produtos de uso interno e revenda.

CONFIGURAÇÕES: Nome do salão, slug (URL), cidade, WhatsApp, email, tema (claro/escuro), taxa de reserva, pagamento online, Stripe Connect.

Quando não souber algo, diga honestamente. Nunca invente funcionalidades que não existem.`

export default function ChatRobo() {
  const { t } = useTema()
  const [aberto, setAberto] = useState(false)
  const [msgs, setMsgs] = useState<Mensagem[]>([
    { role: 'assistant', content: 'Olá! 👋 Sou o assistente do Beleza Recorrente. Como posso te ajudar?' }
  ])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const fimRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (aberto) fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, aberto])

  async function enviarTexto(texto: string) {
    if (!texto.trim() || carregando) return
    setInput('')
    const novasMsgs: Mensagem[] = [...msgs, { role: 'user', content: texto }]
    setMsgs(novasMsgs)
    setCarregando(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SISTEMA,
          messages: novasMsgs.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      const resposta = data.content?.[0]?.text || 'Desculpe, não consegui processar sua pergunta.'
      setMsgs([...novasMsgs, { role: 'assistant', content: resposta }])
    } catch {
      setMsgs([...novasMsgs, { role: 'assistant', content: 'Erro ao conectar. Tente novamente.' }])
    }
    setCarregando(false)
  }

  async function enviar() {
    await enviarTexto(input.trim())
  }

  const sugestoes = [
    'Como criar um pacote?',
    'Como ativar pagamento online?',
    'Como configurar a agenda?',
    'Como compartilhar minha página?',
  ]

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(!aberto)}
        title="Assistente"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 800,
          width: 52, height: 52, borderRadius: '50%',
          background: aberto ? t.text : '#6366f1',
          color: 'white', border: 'none', cursor: 'pointer',
          fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
          transition: 'all 0.2s',
        }}>
        {aberto ? '×' : '🤖'}
      </button>

      {/* Janela do chat */}
      {aberto && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 800,
          width: 340, maxWidth: 'calc(100vw - 48px)',
          background: t.bgCard, border: `0.5px solid ${t.borderCard}`,
          borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 120px)',
        }}>

          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: `0.5px solid ${t.rowBorder}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🤖</div>
            <div>
              <p style={{ color: t.text, fontSize: 13, fontWeight: 500, margin: 0 }}>Assistente</p>
              <p style={{ color: '#22c55e', fontSize: 11, margin: 0 }}>● Online</p>
            </div>
          </div>

          {/* Mensagens */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%',
                  background: m.role === 'user' ? t.text : t.bg,
                  color: m.role === 'user' ? t.bg : t.text,
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '10px 14px',
                  fontSize: 13,
                  lineHeight: 1.5,
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {carregando && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: t.bg, borderRadius: '16px 16px 16px 4px', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: t.textFaint, animation: `bounce 1s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={fimRef} />
          </div>

          {/* Sugestões (só na primeira mensagem) */}
          {msgs.length === 1 && (
            <div style={{ padding: '0 12px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {sugestoes.map(s => (
                <button key={s} onClick={() => enviarTexto(s)}
                  style={{ background: t.bg, border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 20, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '12px', borderTop: `0.5px solid ${t.rowBorder}`, display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
              placeholder="Digite sua dúvida..."
              style={{ flex: 1, background: t.bg, border: `0.5px solid ${t.border}`, borderRadius: 10, padding: '9px 12px', fontSize: 13, color: t.text, outline: 'none' }}
            />
            <button onClick={enviar} disabled={!input.trim() || carregando}
              style={{ background: input.trim() && !carregando ? '#6366f1' : t.border, color: 'white', border: 'none', borderRadius: 10, padding: '9px 14px', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
              →
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </>
  )
}
