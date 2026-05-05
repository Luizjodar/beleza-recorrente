import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

type AssinanteCheckout = {
  id: string
  salao_id: string
  nome: string
  email: string | null
  pacotes: {
    nome: string | null
    preco_mensal: string | number | null
  } | {
    nome: string | null
    preco_mensal: string | number | null
  }[] | null
}

function pacoteDoAssinante(assinante: AssinanteCheckout) {
  return Array.isArray(assinante.pacotes) ? assinante.pacotes[0] : assinante.pacotes
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

  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Sessao expirada. Entre novamente.' }, { status: 401 })
  }

  const { assinanteId } = await req.json() as { assinanteId?: string }
  if (!assinanteId) {
    return NextResponse.json({ error: 'Assinante obrigatorio' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    }
  )

  const { data: assinante, error } = await supabase
    .from('assinantes')
    .select('id, salao_id, nome, email, pacotes(nome, preco_mensal)')
    .eq('id', assinanteId)
    .single()

  if (error || !assinante) {
    return NextResponse.json({ error: 'Assinante nao encontrado' }, { status: 404 })
  }

  const row = assinante as unknown as AssinanteCheckout
  const pacote = pacoteDoAssinante(row)
  const valor = Number(pacote?.preco_mensal || 0)
  if (!valor || valor <= 0) {
    return NextResponse.json({ error: 'O pacote deste assinante nao tem valor valido' }, { status: 400 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const baseUrl = getBaseUrl(req)
  const mesReferencia = mesReferenciaAtual()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    locale: 'pt-BR',
    client_reference_id: row.id,
    customer_email: row.email || undefined,
    success_url: `${baseUrl}/pagamentos?pagamento=sucesso`,
    cancel_url: `${baseUrl}/pagamentos?pagamento=cancelado`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'brl',
          unit_amount: Math.round(valor * 100),
          product_data: {
            name: pacote?.nome || 'Plano mensal',
            description: `Assinante: ${row.nome}`,
          },
        },
      },
    ],
    metadata: {
      assinante_id: row.id,
      salao_id: row.salao_id,
      mes_referencia: mesReferencia,
    },
    payment_intent_data: {
      metadata: {
        assinante_id: row.id,
        salao_id: row.salao_id,
        mes_referencia: mesReferencia,
      },
    },
  })

  return NextResponse.json({ url: session.url })
}
