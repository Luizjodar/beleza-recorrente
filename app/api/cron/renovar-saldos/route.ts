import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const hoje = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`

  const { data: assinantes, error } = await supabase
    .from('assinantes')
    .select('id, nome, salao_id')
    .eq('status', 'ativo')

  if (error) {
    return NextResponse.json({ error: 'Erro ao buscar assinantes' }, { status: 500 })
  }

  if (!assinantes || assinantes.length === 0) {
    return NextResponse.json({ ok: true, renovados: 0 })
  }

  let renovados = 0
  let erros = 0

  for (const assinante of assinantes) {
    const { data: saldoExistente } = await supabase
      .from('saldo_mensal')
      .select('id')
      .eq('assinante_id', assinante.id)
      .eq('mes_referencia', mesAtual)
      .single()

    if (saldoExistente) continue

    const { error: rpcError } = await supabase.rpc('gerar_saldo_mensal', {
      p_assinante_id: assinante.id,
      p_mes: mesAtual,
    })

    if (rpcError) {
      erros++
    } else {
      renovados++
    }
  }

  return NextResponse.json({
    ok: true,
    mes: mesAtual,
    total: assinantes.length,
    renovados,
    erros,
  })
}
