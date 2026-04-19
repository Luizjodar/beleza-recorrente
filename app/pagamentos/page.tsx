'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '../lib/tema'
import Navbar from '../components/Navbar'

export default function PagamentosPage() {
  const router = useRouter()
  const { t } = useTema()
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [assinantes, setAssinantes] = useState<any[]>([])
  const [pagamentos, setPagamentos] = useState<any[]>([])
  const [aba, setAba] = useState<'cobrancas' | 'historico'>('cobrancas')
  const [processando, setProcessando] = useState<string | null>(null)

  const mesAtual = new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  const mesRef = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) { router.push('/dashboard'); return }
      setSalaoId(salao.id)
      await carregar(salao.id)
      setLoading(false)
    }
    init()
  }, [])

  async function carregar(id: string) {
    const [{ data: ass }, { data: pags }] = await Promise.all([
      supabase.from('assinantes').select('*, pacotes(nome, preco_mensal)').eq('salao_id', id).order('criado_em', { ascending: false }),
      supabase.from('pagamentos').select('*, assinantes(nome)').eq('salao_id', id).order('criado_em', { ascending: false }).limit(50),
    ])
    setAssinantes(ass || [])
    setPagamentos(pags || [])
  }

  async function confirmarPagamento(assinante: any) {
    if (!salaoId) return
    setProcessando(assinante.id)
    await supabase.from('pagamentos').insert({
      salao_id: salaoId, assinante_id: assinante.id,
      valor: assinante.pacotes?.preco_mensal || 0,
      status: 'pago', mes_referencia: mesRef, pago_em: new Date().toISOString(),
    })
    const proxima = new Date()
    proxima.setMonth(proxima.getMonth() + 1)
    proxima.setDate(1)
    await supabase.from('assinantes').update({ status: 'ativo', proxima_cobranca: proxima.toISOString().split('T')[0] }).eq('id', assinante.id)
    await carregar(salaoId)
    setProcessando(null)
  }

  async function alterarStatus(assinante: any, novoStatus: string) {
    if (!salaoId) return
    setProcessando(assinante.id)
    await supabase.from('assinantes').update({ status: novoStatus }).eq('id', assinante.id)
    setAssinantes(assinantes.map(a => a.id === assinante.id ? { ...a, status: novoStatus } : a))
    setProcessando(null)
  }

  async function cancelarPagamento(pagamentoId: string) {
    if (!confirm('Cancelar este pagamento?')) return
    await supabase.from('pagamentos').update({ status: 'cancelado' }).eq('id', pagamentoId)
    if (salaoId) await carregar(salaoId)
  }

  const statusBg: any = { ativo: t.badgeAtivo, cancelado: t.badgeCancelado, inadimplente: t.badgeInadimplente, pausado: t.badgePausado }
  const statusText: any = { ativo: t.badgeAtivoText, cancelado: t.badgeCanceladoText, inadimplente: t.badgeInadimplenteText, pausado: t.badgePausadoText }
  const pagStatusBg: any = { pago: t.badgeAtivo, pendente: t.badgeInadimplente, cancelado: t.badgeCancelado }
  const pagStatusText: any = { pago: t.badgeAtivoText, pendente: t.badgeInadimplenteText, cancelado: t.badgeCanceladoText }

  const paracobrar = assinantes.filter(a => a.status === 'ativo' || a.status === 'inadimplente')
  const inadimplentes = assinantes.filter(a => a.status === 'inadimplente')

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textFaint, fontSize: 12, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: t.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 6px' }}>Financeiro</p>
            <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Pagamentos</h1>
            <p style={{ color: t.textFaint, fontSize: 12, margin: '6px 0 0' }}>{mesAtual}</p>
          </div>
          {inadimplentes.length > 0 && (
            <div style={{ background: t.badgeInadimplente, border: `0.5px solid ${t.border}`, borderRadius: 14, padding: '12px 20px', textAlign: 'center' }}>
              <p style={{ color: t.badgeInadimplenteText, fontWeight: 500, fontSize: 22, margin: 0, lineHeight: 1 }}>{inadimplentes.length}</p>
              <p style={{ color: t.badgeInadimplenteText, fontSize: 11, margin: '4px 0 0' }}>inadimplente{inadimplentes.length > 1 ? 's' : ''}</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: t.bgCard, border: `0.5px solid ${t.border}`, padding: 4, borderRadius: 12, width: 'fit-content' }}>
          {(['cobrancas', 'historico'] as const).map(a => (
            <button key={a} onClick={() => setAba(a)}
              style={{ background: aba === a ? t.bg : 'none', color: aba === a ? t.text : t.textMuted, border: 'none', padding: '7px 20px', borderRadius: 9, fontSize: 12, cursor: 'pointer', fontWeight: aba === a ? 500 : 400, transition: 'all 0.15s' }}>
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </button>
          ))}
        </div>

        {aba === 'cobrancas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {paracobrar.length === 0 ? (
              <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: 48, textAlign: 'center' }}>
                <p style={{ color: t.textFaint, fontSize: 13 }}>Nenhuma cobranca pendente</p>
              </div>
            ) : paracobrar.map(a => {
              const jaPagei = pagamentos.some(p => p.assinante_id === a.id && p.mes_referencia === mesRef && p.status === 'pago')
              return (
                <div key={a.id} style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '18px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text, fontSize: 13, fontWeight: 500 }}>
                        {a.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ color: t.text, fontSize: 14, margin: '0 0 2px' }}>{a.nome}</p>
                        <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{a.pacotes?.nome} · R$ {parseFloat(a.pacotes?.preco_mensal || 0).toFixed(0)}/mes</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ background: statusBg[a.status], color: statusText[a.status], fontSize: 10, padding: '3px 10px', borderRadius: 20 }}>{a.status}</span>
                      {jaPagei ? (
                        <span style={{ background: t.badgeAtivo, color: t.badgeAtivoText, fontSize: 11, padding: '5px 12px', borderRadius: 8 }}>Pago este mes</span>
                      ) : (
                        <button onClick={() => confirmarPagamento(a)} disabled={processando === a.id}
                          style={{ background: t.text, color: t.navBg, border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 11, cursor: 'pointer', opacity: processando === a.id ? 0.5 : 1 }}>
                          {processando === a.id ? 'Aguarde...' : 'Confirmar pagamento'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: `0.5px solid ${t.rowBorder}`, alignItems: 'center' }}>
                    <p style={{ color: t.textFaint, fontSize: 11, margin: 0, marginRight: 'auto' }}>Alterar status:</p>
                    {(['ativo', 'inadimplente', 'pausado', 'cancelado'] as const).filter(s => s !== a.status).map(s => (
                      <button key={s} onClick={() => alterarStatus(a, s)} disabled={processando === a.id}
                        style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: '4px 12px', fontSize: 11, cursor: 'pointer' }}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {aba === 'historico' && (
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, overflow: 'hidden' }}>
            {pagamentos.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <p style={{ color: t.textFaint, fontSize: 13 }}>Nenhum pagamento registrado</p>
              </div>
            ) : pagamentos.map((p, i) => (
              <div key={p.id} style={{ padding: '14px 24px', borderBottom: i < pagamentos.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text, fontSize: 11, fontWeight: 500 }}>
                    {p.assinantes?.nome?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: t.text, fontSize: 13, margin: '0 0 2px', fontWeight: 400 }}>{p.assinantes?.nome}</p>
                    <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>
                      {p.pago_em ? new Date(p.pago_em).toLocaleDateString('pt-BR') : new Date(p.criado_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <p style={{ color: t.text, fontSize: 13, margin: 0, fontWeight: 400 }}>R$ {parseFloat(p.valor).toFixed(0)}</p>
                  <span style={{ background: pagStatusBg[p.status], color: pagStatusText[p.status], fontSize: 10, padding: '3px 10px', borderRadius: 20 }}>{p.status}</span>
                  {p.status === 'pago' && (
                    <button onClick={() => cancelarPagamento(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>Cancelar</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
