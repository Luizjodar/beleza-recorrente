// Utilitário para montar e abrir links de WhatsApp

type MensagemVars = {
  nome?: string
  salao?: string
  data?: string
  horario?: string
  servico?: string
  plano?: string
  pontos?: number | string
  link?: string
}

type MsgConfig = {
  confirmacao?: string
  lembrete?: string
  aniversario?: string
  inadimplente?: string
  boas_vindas?: string
}

const PADROES = {
  confirmacao: `Olá, {nome}! 🎉\n\nSeu agendamento foi confirmado no *{salao}*!\n\n📅 *Data:* {data}\n🕐 *Horário:* {horario}\n✂️ *Serviço:* {servico}\n\nQualquer dúvida, é só chamar. Te esperamos! 😊`,
  lembrete: `Oi, {nome}! 👋\n\nPassando para lembrar do seu horário *amanhã* no *{salao}*!\n\n📅 *{data}* às *{horario}*\n✂️ {servico}\n\nConfirma sua presença? Responda aqui! ✅`,
  aniversario: `🎂 *Feliz Aniversário, {nome}!* 🎉\n\nO *{salao}* deseja um dia incrível!\n\nVocê ganhou *{pontos} pontos* de fidelidade como presente! 🎁\n\nCom carinho, equipe {salao} 💛`,
  inadimplente: `Olá, {nome}! 😊\n\nSua mensalidade do *{salao}* está em aberto.\n\nRenove seu plano *{plano}*:\n🔗 {link}\n\nDúvidas? Estamos aqui! 💬`,
  boas_vindas: `Seja bem-vinda(o), *{nome}*! 🌟\n\nFicamos felizes em ter você no *{salao}*!\n\nVocê agora faz parte do plano *{plano}*. ✨`,
}

function renderizar(template: string, vars: MensagemVars): string {
  return template
    .replace(/{nome}/g, vars.nome || '')
    .replace(/{salao}/g, vars.salao || '')
    .replace(/{data}/g, vars.data || '')
    .replace(/{horario}/g, vars.horario || '')
    .replace(/{servico}/g, vars.servico || '')
    .replace(/{plano}/g, vars.plano || '')
    .replace(/{pontos}/g, String(vars.pontos || 0))
    .replace(/{link}/g, vars.link || '')
}

function limparWhats(num: string): string {
  const digits = num.replace(/\D/g, '')
  if (digits.startsWith('55')) return digits
  if (digits.startsWith('0')) return '55' + digits.slice(1)
  return '55' + digits
}

export function abrirWhatsApp(telefone: string, tipo: keyof typeof PADROES, vars: MensagemVars, msgsCustom?: MsgConfig) {
  const template = msgsCustom?.[tipo] || PADROES[tipo]
  const texto = renderizar(template, vars)
  const num = limparWhats(telefone)
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(texto)}`, '_blank')
}

export function linkWhatsApp(telefone: string, tipo: keyof typeof PADROES, vars: MensagemVars, msgsCustom?: MsgConfig): string {
  const template = msgsCustom?.[tipo] || PADROES[tipo]
  const texto = renderizar(template, vars)
  const num = limparWhats(telefone)
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`
}

export function formatarData(data: string): string {
  return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}
