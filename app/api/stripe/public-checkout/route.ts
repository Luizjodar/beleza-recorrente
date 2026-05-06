import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

type CheckoutBody = {
  tipo?: 'plano' | 'promocao'
  salaoId?: string
  pacoteId?: string
  promocaoId?: string
  slug?: string
  nome?: string
  whatsapp?: string
  email?: string
  horario?: string
  dataSelecionada?: string
  horarioSelecionado?: string
}

function getBaseUrl(req: Request) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return req.headers.get('origin') || 'http://localhost:3000'
}

function mesReferenciaAtual() {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY nao configurada' }, { status: 500 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY nao configurada' }, { status: 500 })
  }

  const body = await req.json() as CheckoutBody
  const { tipo, salaoId, nome, whatsapp, email } = body

  if (!tipo || !salaoId || !nome || !whatsapp) {
    return NextResponse.json({ error: 'Dados obrigatorios ausentes' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const baseUrl = getBaseUrl(req)
  const retornoPublico = `${baseUrl}/s/${body.slug || salaoId}`

  if (tipo === 'plano') {
    if (!body.pacoteId) {
      return NextResponse.json({ error: 'Pacote obrigatorio' }, { status: 400 })
    }

    const { data: pacote, error: pacoteError } = await supabase
      .from('pacotes')
      .select('id, salao_id, nome, preco_mensal')
      .eq('id', body.pacoteId)
      .eq('salao_id', salaoId)
      .eq('ativo', true)
      .single()

    if (pacoteError || !pacote) {
      return NextResponse.json({ error: 'Pacote nao encontrado' }, { status: 404 })
    }

    const { data: salaoData } = await supabase
      .from('saloes')
      .select('taxa_reserva, stripe_account_id')
      .eq('id', salaoId)
      .single()

    const valorCheio = Number(pacote.preco_mensal || 0)
    const taxaReserva = salaoData?.taxa_reserva ? Number(salaoData.taxa_reserva) : null
    const valorCobrado = taxaReserva ?? valorCheio
    const descricaoCobranca = taxaReserva
      ? `Taxa de reserva (R$ ${taxaReserva.toFixed(0)} descontado no dia) — Plano: ${pacote.nome}`
      : `Plano: ${pacote.nome}`

    // Calcular comissão de 5% para a plataforma
    const comissaoPlataforma = Math.round(valorCobrado * 100 * 0.05)

    const { data: assinante, error: assinanteError } = await supabase
      .from('assinantes')
      .insert({
        salao_id: salaoId,
        pacote_id: pacote.id,
        nome,
        whatsapp,
        email: email || null,
        status: 'inadimplente',
        data_inicio: new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single()

    if (assinanteError || !assinante) {
      return NextResponse.json({ error: 'Nao foi possivel criar a assinatura' }, { status: 500 })
    }

    const valor = valorCobrado

    // Configuração base da sessão
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      locale: 'pt-BR',
      client_reference_id: assinante.id,
      customer_email: email || undefined,
      success_url: `${retornoPublico}?pagamento=sucesso`,
      cancel_url: `${retornoPublico}?pagamento=cancelado`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: Math.round(valor * 100),
            product_data: {
              name: taxaReserva ? `Taxa de Reserva — ${pacote.nome}` : (pacote.nome || 'Plano mensal'),
              description: descricaoCobranca,
            },
          },
        },
      ],
      metadata: {
        tipo: 'plano',
        assinante_id: assinante.id,
        salao_id: salaoId,
        mes_referencia: mesReferenciaAtual(),
        data_agendamento: body.dataSelecionada || '',
        horario_agendamento: body.horarioSelecionado || '',
        nome_cliente: nome,
        whatsapp_cliente: whatsapp,
      },
      payment_intent_data: {
        metadata: {
          tipo: 'plano',
          assinante_id: assinante.id,
          salao_id: salaoId,
          mes_referencia: mesReferenciaAtual(),
          data_agendamento: body.dataSelecionada || '',
          horario_agendamento: body.horarioSelecionado || '',
        },
      },
    }

    // Se o salão tem conta Connect configurada, usar repasse automático
    if (salaoData?.stripe_account_id) {
      const account = await stripe.accounts.retrieve(salaoData.stripe_account_id)
      if (account.charges_enabled) {
        sessionConfig.payment_intent_data = {
          ...sessionConfig.payment_intent_data,
          application_fee_amount: comissaoPlataforma,
          transfer_data: {
            destination: salaoData.stripe_account_id,
          },
        }
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)
    return NextResponse.json({ url: session.url })
  }

  if (!body.promocaoId) {
    return NextResponse.json({ error: 'Promocao obrigatoria' }, { status: 400 })
  }

  const hoje = new Date().toISOString().split('T')[0]
  const { data: promocao, error: promocaoError } = await supabase
    .from('promocoes')
    .select('id, salao_id, titulo, preco_promo')
    .eq('id', body.promocaoId)
    .eq('salao_id', salaoId)
    .eq('ativo', true)
    .gte('data_fim', hoje)
    .single()

  if (promocaoError || !promocao) {
    return NextResponse.json({ error: 'Promocao nao encontrada' }, { status: 404 })
  }

  const valor = Number(promocao.preco_promo || 0)
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    locale: 'pt-BR',
    customer_email: email || undefined,
    success_url: `${retornoPublico}?pagamento=sucesso`,
    cancel_url: `${retornoPublico}?pagamento=cancelado`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'brl',
          unit_amount: Math.round(valor * 100),
          product_data: {
            name: promocao.titulo || 'Promocao',
            description: `Cliente: ${nome}`,
          },
        },
      },
    ],
    metadata: {
      tipo: 'promocao',
      promocao_id: promocao.id,
      salao_id: salaoId,
      nome,
      whatsapp,
      email: email || '',
      horario: body.horario || '',
    },
  })

  return NextResponse.json({ url: session.url })
}
