import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
const resend = new Resend('re_J4ouKRaL_4dgY1SMwUFyfc53fFZZiFCNd')
  const body = await req.json()
  const { nomeCliente, emailCliente, nomePlano, preco, emailSalao, nomeSalao } = body

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: emailSalao,
      subject: `Novo assinante — ${nomeCliente}`,
      html: `<div style="font-family:sans-serif;padding:32px"><h2 style="color:#059669">Novo assinante no ${nomeSalao}!</h2><p>Cliente: <strong>${nomeCliente}</strong></p><p>Plano: <strong>${nomePlano}</strong></p><p>Valor: <strong>R$ ${preco}/mês</strong></p></div>`,
    })

    if (emailCliente) {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: emailCliente,
        subject: `Assinatura confirmada — ${nomePlano}`,
        html: `<div style="font-family:sans-serif;padding:32px"><h2 style="color:#059669">Assinatura confirmada!</h2><p>Olá, <strong>${nomeCliente}</strong>!</p><p>Salão: <strong>${nomeSalao}</strong></p><p>Plano: <strong>${nomePlano}</strong></p><p>Valor: <strong>R$ ${preco}/mês</strong></p></div>`,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro email:', error)
    return NextResponse.json({ error }, { status: 500 })
  }
}