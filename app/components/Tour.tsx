'use client'

import { useState, useEffect } from 'react'
import { useTema } from '@/app/lib/tema'

type Passo = {
  titulo: string
  descricao: string
  emoji: string
  path?: string
}

const PASSOS: Passo[] = [
  {
    emoji: '👋',
    titulo: 'Bem-vindo ao Beleza Recorrente!',
    descricao: 'Este é o seu sistema completo para gerenciar assinantes, agendamentos e pagamentos do seu salão. Vamos te mostrar como tudo funciona em poucos passos.',
  },
  {
    emoji: '📦',
    titulo: 'Crie seus Pacotes',
    descricao: 'Em Pacotes você cria os planos que seus clientes vão assinar — por exemplo "Plano Bronze: 2 cortes/mês por R$ 180". Você pode adicionar uma arte/imagem e definir os serviços incluídos.',
    path: '/pacotes',
  },
  {
    emoji: '👥',
    titulo: 'Gerencie Assinantes',
    descricao: 'Em Assinantes você cadastra seus clientes e vincula cada um a um plano. O sistema controla automaticamente o saldo de serviços de cada cliente no mês.',
    path: '/assinantes',
  },
  {
    emoji: '📅',
    titulo: 'Use a Agenda',
    descricao: 'Na Agenda você visualiza e gerencia todos os agendamentos por semana ou mês. Configure os horários disponíveis do seu salão em "Configurar horários".',
    path: '/agenda',
  },
  {
    emoji: '💳',
    titulo: 'Pagamento Online',
    descricao: 'Ative o pagamento online nas Configurações para que seus clientes paguem uma taxa de reserva ao agendar — evitando faltas e cancelamentos de última hora.',
    path: '/configuracoes',
  },
  {
    emoji: '🔗',
    titulo: 'Sua Página Pública',
    descricao: 'Cada salão tem uma página pública exclusiva (ex: beleza-recorrente.vercel.app/s/seu-salao) para compartilhar com clientes. Eles podem ver promoções, pacotes e agendar diretamente.',
  },
  {
    emoji: '📊',
    titulo: 'Acompanhe os Relatórios',
    descricao: 'Em Relatórios você vê gráficos de faturamento, crescimento de assinantes, agendamentos e despesas. Filtre por 3, 6 ou 12 meses.',
    path: '/relatorios',
  },
  {
    emoji: '🤖',
    titulo: 'Assistente sempre disponível',
    descricao: 'O botão roxo no canto inferior direito é o seu assistente. Clique nele a qualquer momento para tirar dúvidas sobre o sistema.',
  },
]

export default function Tour() {
  const { t } = useTema()
  const [passo, setPasso] = useState(0)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const visto = localStorage.getItem('tour_concluido')
    if (!visto) {
      setTimeout(() => setVisivel(true), 800)
    }
  }, [])

  function fechar() {
    localStorage.setItem('tour_concluido', '1')
    setVisivel(false)
  }

  function proximo() {
    if (passo < PASSOS.length - 1) setPasso(passo + 1)
    else fechar()
  }

  function anterior() {
    if (passo > 0) setPasso(passo - 1)
  }

  if (!visivel) return null

  const atual = PASSOS[passo]
  const progresso = ((passo + 1) / PASSOS.length) * 100

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 24, padding: '36px 32px', maxWidth: 440, width: '100%', position: 'relative' }}>

        {/* Fechar */}
        <button onClick={fechar} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: t.textFaint, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>

        {/* Progresso */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28 }}>
          {PASSOS.map((_, i) => (
            <div key={i} onClick={() => setPasso(i)} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= passo ? t.text : t.border, cursor: 'pointer', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* Conteúdo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>{atual.emoji}</div>
          <h2 style={{ color: t.text, fontSize: 20, fontWeight: 500, margin: '0 0 12px', fontFamily: 'Georgia, serif' }}>{atual.titulo}</h2>
          <p style={{ color: t.textMuted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{atual.descricao}</p>
        </div>

        {/* Navegação */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {passo > 0 && (
            <button onClick={anterior} style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 10, padding: '11px 18px', fontSize: 13, cursor: 'pointer' }}>
              ← Voltar
            </button>
          )}
          <button onClick={proximo} style={{ flex: 1, background: t.text, color: t.bg, border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
            {passo === PASSOS.length - 1 ? 'Começar agora!' : `Próximo →`}
          </button>
        </div>

        {/* Contador */}
        <p style={{ color: t.textFaint, fontSize: 11, textAlign: 'center', margin: '12px 0 0' }}>{passo + 1} de {PASSOS.length}</p>
      </div>
    </div>
  )
}

// Botão para reabrir o tour
export function BotaoTour() {
  const { t } = useTema()
  const [visivel, setVisivel] = useState(false)

  return (
    <>
      <button onClick={() => { localStorage.removeItem('tour_concluido'); setVisivel(true); window.location.reload() }}
        title="Ver tour do sistema"
        style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textFaint, borderRadius: 8, padding: '6px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
        📖 Tour
      </button>
    </>
  )
}
