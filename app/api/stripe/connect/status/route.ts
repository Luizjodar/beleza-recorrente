import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

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

  const { data: salao } = await supabase
    .from('saloes')
    .select('stripe_account_id')
    .eq('id', salaoId)
    .single()

  if (!salao?.stripe_account_id) {
    return NextResponse.json({ conectado: false, detalhes_completos: false })
  }

  const account = await stripe.accounts.retrieve(salao.stripe_account_id)
  const conectado = account.details_submitted && account.charges_enabled

  return NextResponse.json({
    conectado,
    detalhes_completos: account.details_submitted,
    charges_enabled: account.charges_enabled,
    account_id: salao.stripe_account_id,
  })
}
