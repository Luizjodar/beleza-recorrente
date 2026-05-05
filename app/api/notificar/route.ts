import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // ✅ Chave vem da variável de ambiente — nunca hard-coded
  const resend = new Resend(process.env.RESEND_API_KEY)

  const body = await req.json()
  const {
    nomeCliente,
    emailCliente,
    nomePlano,
    preco,
    emailSalao,
    nomeSalao,
  } = body

  // Validação básica
  if (!emailSalao || !nomeCliente || !nomePlano) {
    return NextResponse.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 })
  }

  try {
    // Email para o dono do salão
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: emailSalao,
      subject: `Novo assinante — ${nomeCliente}`,
      html: `
        <div style="font-family:sans-serif;padding:32px;max-width:480px">
          <h2 style="color:#059669">Novo assinante no ${nomeSalao}!</h2>
          <p>Cliente: <strong>${nomeCliente}</strong></p>
          <p>Plano: <strong>${nomePlano}</strong></p>
          <p>Valor: <strong>R$ ${preco}/mês</strong></p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="color:#999;font-size:12px">Acesse o dashboard para gerenciar este assinante.</p>
        </div>
      `,
    })

    // Email para o cliente (opcional)
    if (emailCliente) {
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: emailCliente,
        subject: `Assinatura confirmada — ${nomePlano}`,
        html: `
          <div style="font-family:sans-serif;padding:32px;max-width:480px">
            <h2 style="color:#059669">Assinatura confirmada!</h2>
            <p>Olá, <strong>${nomeCliente}</strong>!</p>
            <p>Salão: <strong>${nomeSalao}</strong></p>
            <p>Plano: <strong>${nomePlano}</strong></p>
            <p>Valor: <strong>R$ ${preco}/mês</strong></p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
            <p style="color:#999;font-size:12px">Em breve o salão entrará em contato para combinar os detalhes.</p>
          </div>
        `,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro ao enviar email:', error)
    return NextResponse.json({ error: 'Falha ao enviar email' }, { status: 500 })
  }
}
