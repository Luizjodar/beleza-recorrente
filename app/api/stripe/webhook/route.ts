import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

function proximaCobranca() {
  const proxima = new Date()
  proxima.setMonth(proxima.getMonth() + 1)
  proxima.setDate(1)
  return proxima.toISOString().split('T')[0]
}

async function registrarPagamento(session: Stripe.Checkout.Session) {
  if (session.metadata?.tipo && session.metadata.tipo !== 'plano') {
    return
  }

  const assinanteId = session.metadata?.assinante_id
  const salaoId = session.metadata?.salao_id
  const mesReferencia = session.metadata?.mes_referencia

  if (!assinanteId || !salaoId || !mesReferencia || session.payment_status !== 'paid') {
    return
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: existente } = await supabase
    .from('pagamentos')
    .select('id')
    .eq('assinante_id', assinanteId)
    .eq('mes_referencia', mesReferencia)
    .eq('status', 'pago')
    .maybeSingle()

  if (!existente) {
    await supabase.from('pagamentos').insert({
      salao_id: salaoId,
      assinante_id: assinanteId,
      valor: (session.amount_total || 0) / 100,
      status: 'pago',
      mes_referencia: mesReferencia,
      pago_em: new Date().toISOString(),
    })
  }

  await supabase
    .from('assinantes')
    .update({ status: 'ativo', proxima_cobranca: proximaCobranca() })
    .eq('id', assinanteId)

  await supabase.rpc('gerar_saldo_mensal', {
    p_assinante_id: assinanteId,
    p_mes: mesReferencia,
  })

  // Criar agendamento se data e horário foram informados
  const dataAgendamento = session.metadata?.data_agendamento
  const horarioAgendamento = session.metadata?.horario_agendamento
  if (dataAgendamento && horarioAgendamento) {
    const { data: assinante } = await supabase
      .from('assinantes')
      .select('nome, whatsapp')
      .eq('id', assinanteId)
      .single()

    await supabase.from('agendamentos').insert({
      salao_id: salaoId,
      assinante_id: assinanteId,
      cliente_nome: assinante?.nome || session.metadata?.nome_cliente || '',
      whatsapp: assinante?.whatsapp || session.metadata?.whatsapp_cliente || '',
      data: dataAgendamento,
      horario: horarioAgendamento,
      status: 'confirmado',
      origem: 'online',
    })
  }
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe webhook nao configurado' }, { status: 500 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY nao configurada' }, { status: 500 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  if (!signature) {
    return NextResponse.json({ error: 'Assinatura ausente' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Assinatura invalida' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    await registrarPagamento(event.data.object as Stripe.Checkout.Session)
  }

  return NextResponse.json({ received: true })
}
