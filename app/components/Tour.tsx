'use client'

import { useState, useEffect } from 'react'
import { useTema } from '@/app/lib/tema'

type Passo = {
  titulo: string
  subtitulo: string
  descricao: string
  dicas: string[]
  emoji: string
  cor: string
  path?: string
}

const PASSOS: Passo[] = [
  {
    emoji: '✨',
    cor: '#6366f1',
    titulo: 'Bem-vindo ao Beleza Recorrente!',
    subtitulo: 'Seu sistema completo de gestão',
    descricao: 'Aqui você gerencia tudo do seu salão em um só lugar — assinantes, agendamentos, pagamentos e muito mais. Este tour vai te mostrar cada parte do sistema em detalhes.',
    dicas: [
      '💡 Use o menu lateral para navegar entre as seções',
      '🌙 Você pode alternar entre modo claro e escuro no topo da tela',
      '🤖 O assistente roxo no canto inferior direito responde suas dúvidas a qualquer hora',
    ],
  },
  {
    emoji: '📦',
    cor: '#8b5cf6',
    titulo: 'Pacotes',
    subtitulo: 'Crie os planos de assinatura do seu salão',
    descricao: 'Os pacotes são os planos mensais que seus clientes assinam. Cada pacote tem nome, preço mensal e uma lista de serviços incluídos com quantidade.',
    dicas: [
      '✂️ Exemplo: "Plano Ouro — 4 cortes/mês por R$ 280"',
      '🖼️ Adicione uma arte/imagem para o pacote aparecer bonito na página do cliente',
      '🎯 Crie planos diferentes para diferentes perfis de clientes (Bronze, Prata, Ouro)',
    ],
    path: '/pacotes',
  },
  {
    emoji: '🎁',
    cor: '#ec4899',
    titulo: 'Promoções',
    subtitulo: 'Atraia novos clientes com ofertas especiais',
    descricao: 'Crie promoções com preço especial e data de validade. Elas aparecem em destaque na sua página pública para atrair novos clientes.',
    dicas: [
      '📸 Faça upload da arte da promoção — igual ao story de campanha do seu salão!',
      '⏰ Defina uma data de validade para criar senso de urgência',
      '💸 O sistema calcula e mostra o % de desconto automaticamente para o cliente',
    ],
    path: '/promocoes',
  },
  {
    emoji: '👥',
    cor: '#0ea5e9',
    titulo: 'Assinantes',
    subtitulo: 'Gerencie seus clientes e planos',
    descricao: 'Aqui ficam todos os clientes que assinam um plano. Cada assinante tem seu saldo de serviços do mês — você marca o uso a cada atendimento realizado.',
    dicas: [
      '✅ Clique em "Ver saldo" para ver e marcar os serviços utilizados no mês pelo cliente',
      '📱 O sistema cria o assinante automaticamente quando ele paga pela página pública',
      '🔴 Clientes com status "inadimplente" precisam renovar o pagamento para usar os serviços',
    ],
    path: '/assinantes',
  },
  {
    emoji: '📅',
    cor: '#10b981',
    titulo: 'Agenda',
    subtitulo: 'Visualize e gerencie todos os horários',
    descricao: 'A agenda mostra todos os agendamentos por semana ou mês. Clique em qualquer horário disponível para adicionar um novo agendamento manualmente.',
    dicas: [
      '⚙️ Configure os horários em "Configurar horários" — escolha os dias, hora início/fim e o intervalo entre atendimentos',
      '🟢 Verde = confirmado · 🟡 Amarelo = pendente · ⚫ Cinza = cancelado',
      '📲 Agendamentos feitos pela página pública aparecem aqui automaticamente',
    ],
    path: '/agenda',
  },
  {
    emoji: '💳',
    cor: '#f59e0b',
    titulo: 'Pagamento Online',
    subtitulo: 'Receba reservas pagas antecipadamente',
    descricao: 'Ative o pagamento online nas Configurações para cobrar uma taxa de reserva quando o cliente agendar. Isso elimina faltas e cancelamentos de última hora.',
    dicas: [
      '🔒 O cliente paga via cartão ou Pix antes de confirmar o horário — garantia real de comparecimento',
      '💰 Configure a taxa de reserva (ex: R$ 50) — esse valor é descontado no dia do serviço',
      '🏦 Conecte sua conta Stripe para receber o dinheiro direto na sua conta bancária',
    ],
    path: '/configuracoes',
  },
  {
    emoji: '🔗',
    cor: '#06b6d4',
    titulo: 'Sua Página Pública',
    subtitulo: 'A vitrine online do seu salão',
    descricao: 'Seu salão tem uma página exclusiva para compartilhar com clientes. Eles visualizam pacotes e promoções, escolhem data e horário, e podem pagar online na hora.',
    dicas: [
      '📋 Encontre o link em Configurações — campo "Slug do salão" (ex: /s/luiz-hair)',
      '📲 Compartilhe no WhatsApp, bio do Instagram, Google Meu Negócio e onde quiser',
      '🗓️ A página mostra apenas os dias e horários configurados por você na agenda',
    ],
    path: '/configuracoes',
  },
  {
    emoji: '💰',
    cor: '#84cc16',
    titulo: 'Faturamento & Relatórios',
    subtitulo: 'Acompanhe o crescimento do seu negócio',
    descricao: 'No Dashboard você vê a receita mensal recorrente (MRR), assinantes ativos e agendamentos do dia. Em Relatórios há gráficos de faturamento, despesas, lucro e crescimento.',
    dicas: [
      '📈 MRR = Receita Mensal Recorrente — o total fixo que entra todo mês dos assinantes',
      '📊 Em Relatórios filtre por 3, 6 ou 12 meses para analisar tendências do negócio',
      '💸 Cadastre as despesas do salão para ver o lucro real nos gráficos',
    ],
    path: '/relatorios',
  },
  {
    emoji: '👔',
    cor: '#a855f7',
    titulo: 'Equipe & Produtos',
    subtitulo: 'Gerencie funcionários e estoque',
    descricao: 'Em Funcionários você cadastra sua equipe com cargo e percentual de comissão. Em Produtos você controla o estoque de materiais de uso interno e produtos para revenda.',
    dicas: [
      '👩‍💼 Cadastre cada profissional com sua comissão para controle financeiro',
      '📦 Gerencie o estoque mínimo de produtos — o sistema avisa quando está acabando',
      '🏷️ Separe produtos de "uso interno" dos de "revenda" para análise correta',
    ],
    path: '/funcionarios',
  },
  {
    emoji: '⚙️',
    cor: '#64748b',
    titulo: 'Configurações',
    subtitulo: 'Personalize seu salão no sistema',
    descricao: 'Em Configurações você define o nome, cidade, WhatsApp, e-mail e a URL da sua página pública. É também onde você ativa pagamento online e conecta sua conta bancária.',
    dicas: [
      '🔤 O "Slug" define a URL da sua página pública — escolha algo fácil de lembrar',
      '🌙 Alterne entre tema claro e escuro conforme a hora do dia',
      '💳 Conecte o Stripe para receber os pagamentos online diretamente na sua conta',
    ],
    path: '/configuracoes',
  },
  {
    emoji: '🚀',
    cor: '#6366f1',
    titulo: 'Tudo pronto para começar!',
    subtitulo: 'Você conhece o sistema completo',
    descricao: 'Agora você sabe como tudo funciona. O caminho recomendado para começar é criar os pacotes, cadastrar os primeiros assinantes, configurar a agenda e compartilhar sua página pública.',
    dicas: [
      '1️⃣ Comece criando seus Pacotes de assinatura',
      '2️⃣ Configure os horários da Agenda',
      '3️⃣ Compartilhe sua Página Pública com os clientes',
      '🤖 Lembre-se: o assistente roxo está sempre ali para ajudar!',
    ],
  },
]

export default function Tour() {
  const { t } = useTema()
  const [passo, setPasso] = useState(0)
  const [visivel, setVisivel] = useState(false)
  const [animando, setAnimando] = useState(false)

  useEffect(() => {
    const visto = localStorage.getItem('tour_concluido')
    if (!visto) setTimeout(() => setVisivel(true), 800)
  }, [])

  function fechar() {
    localStorage.setItem('tour_concluido', '1')
    setVisivel(false)
  }

  function irPara(i: number) {
    if (animando) return
    setAnimando(true)
    setTimeout(() => { setPasso(i); setAnimando(false) }, 150)
  }

  function proximo() {
    if (passo < PASSOS.length - 1) irPara(passo + 1)
    else fechar()
  }

  function anterior() {
    if (passo > 0) irPara(passo - 1)
  }

  if (!visivel) return null

  const atual = PASSOS[passo]
  const isUltimo = passo === PASSOS.length - 1
  const isPrimeiro = passo === 0

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
      <div style={{
        background: t.bgCard,
        border: `0.5px solid ${t.borderCard}`,
        borderRadius: 24,
        maxWidth: 500,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        opacity: animando ? 0 : 1,
        transform: animando ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 0.15s, transform 0.15s',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Barra de progresso colorida */}
        <div style={{ height: 4, background: atual.cor, width: `${((passo + 1) / PASSOS.length) * 100}%`, transition: 'width 0.4s, background 0.3s' }} />

        {/* Header com dots */}
        <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxWidth: 320 }}>
            {PASSOS.map((_, i) => (
              <div key={i} onClick={() => irPara(i)}
                style={{ width: i === passo ? 18 : 6, height: 6, borderRadius: 3, background: i === passo ? atual.cor : i < passo ? atual.cor + '50' : t.border, cursor: 'pointer', transition: 'all 0.3s' }} />
            ))}
          </div>
          <button onClick={fechar} style={{ background: 'none', border: 'none', color: t.textFaint, fontSize: 18, cursor: 'pointer', padding: '4px 6px', lineHeight: 1 }}>×</button>
        </div>

        {/* Conteúdo */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

          {/* Ícone + título */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ width: 54, height: 54, borderRadius: 16, background: atual.cor + '18', border: `1px solid ${atual.cor}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 14 }}>
              {atual.emoji}
            </div>
            <p style={{ color: atual.cor, fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', margin: '0 0 6px' }}>{atual.subtitulo}</p>
            <h2 style={{ color: t.text, fontSize: 21, fontWeight: 500, margin: 0, fontFamily: 'Georgia, serif', lineHeight: 1.25 }}>{atual.titulo}</h2>
          </div>

          {/* Descrição */}
          <p style={{ color: t.textMuted, fontSize: 14, lineHeight: 1.7, margin: '0 0 18px' }}>{atual.descricao}</p>

          {/* Dicas */}
          <div style={{ background: t.bg, borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, border: `0.5px solid ${t.border}` }}>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 600 }}>Detalhes</p>
            {atual.dicas.map((dica, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: atual.cor, marginTop: 7, flexShrink: 0 }} />
                <p style={{ color: t.textMuted, fontSize: 13, lineHeight: 1.55, margin: 0 }}>{dica}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div style={{ padding: '14px 24px 22px', borderTop: `0.5px solid ${t.rowBorder}` }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isPrimeiro && (
              <button onClick={anterior}
                style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 10, padding: '11px 16px', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                ←
              </button>
            )}
            <button onClick={proximo}
              style={{ flex: 1, background: atual.cor, color: 'white', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              {isUltimo ? '🚀 Começar agora!' : 'Próximo →'}
            </button>
          </div>
          <p style={{ color: t.textFaint, fontSize: 11, textAlign: 'center', margin: '10px 0 0' }}>
            {passo + 1} de {PASSOS.length} &nbsp;·&nbsp;
            <span onClick={fechar} style={{ cursor: 'pointer', textDecoration: 'underline' }}>pular tour</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export function BotaoTour() {
  const { t } = useTema()
  return (
    <button onClick={() => { localStorage.removeItem('tour_concluido'); window.location.reload() }}
      title="Ver tour do sistema"
      style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textFaint, borderRadius: 8, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>
      ? Tour
    </button>
  )
}
