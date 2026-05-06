import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

function getBaseUrl(req: Request) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return req.headers.get('origin') || 'http://localhost:3000'
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Configuracao incompleta' }, { status: 500 })
  }

  const { salaoId } = await req.json()
  if (!salaoId) return NextResponse.json({ error: 'salaoId obrigatorio' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const baseUrl = getBaseUrl(req)

  // Busca ou cria a conta Connect do salão
  const { data: salao } = await supabase
    .from('saloes')
    .select('stripe_account_id, nome, email_contato')
    .eq('id', salaoId)
    .single()

  let accountId = salao?.stripe_account_id

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'BR',
      email: salao?.email_contato || undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: salao?.nome || undefined,
        mcc: '7299', // Serviços pessoais
      },
      settings: {
        payouts: {
          schedule: { interval: 'daily' },
        },
      },
    })
    accountId = account.id

    await supabase
      .from('saloes')
      .update({ stripe_account_id: accountId })
      .eq('id', salaoId)
  }

  // Cria o link de onboarding
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/configuracoes?stripe=refresh`,
    return_url: `${baseUrl}/configuracoes?stripe=sucesso`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}
