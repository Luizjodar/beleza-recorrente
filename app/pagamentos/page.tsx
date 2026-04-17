'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function PagamentosPage() {
  const router = useRouter()
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
      const { data: salao } = await supabase
        .from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) { router.push('/dashboard'); return }
      setSalaoId(salao.id)
      await carregar(salao.id)
      setLoading(false)
    }
    init()
  }, [])

  async function carregar(id: string) {
    const [{ data: ass }, { data: pags }] = await Promise.all([
      supabase.from('assinantes')
        .select('*, pacotes(nome, preco_mensal)')
        .eq('salao_id', id)
        .order('criado_em', { ascending: false }),
      supabase.from('pagamentos')
        .select('*, assinantes(nome)')
        .eq('salao_id', id)
        .order('criado_em', { ascending: false })
        .limit(50),
    ])
    setAssinantes(ass || [])
    setPagamentos(pags || [])
  }

  async function confirmarPagamento(assinante: any) {
    if (!salaoId) return
    setProcessando(assinante.id)
    await supabase.from('pagamentos').insert({
      salao_id: salaoId,
      assinante_id: assinante.id,
      valor: assinante.pacotes?.preco_mensal || 0,
      status: 'pago',
      mes_referencia: mesRef,
      pago_em: new Date().toISOString(),
    })
    const proxima = new Date()
    proxima.setMonth(proxima.getMonth() + 1)
    proxima.setDate(1)
    await supabase.from('assinantes').update({
      status: 'ativo',
      proxima_cobranca: proxima.toISOString().split('T')[0],
    }).eq('id', assinante.id)
    await carregar(salaoId)
    setProcessando(null)
  }

  async function alterarStatus(assinante: any, novoStatus: string) {
    if (!salaoId) return
    setProcessando(assinante.id)
    await supabase.from('assinantes')
      .update({ status: novoStatus })
      .eq('id', assinante.id)
    setAssinantes(assinantes.map(a =>
      a.id === assinante.id ? { ...a, status: novoStatus } : a
    ))
    setProcessando(null)
  }

  async function cancelarPagamento(pagamentoId: string) {
    if (!confirm('Cancelar este pagamento?')) return
    await supabase.from('pagamentos')
      .update({ status: 'cancelado' })
      .eq('id', pagamentoId)
    if (salaoId) await carregar(salaoId)
  }

  const statusStyle: any = {
    ativo: 'bg-emerald-50 text-emerald-700',
    cancelado: 'bg-red-50 text-red-600',
    inadimplente: 'bg-amber-50 text-amber-700',
    pausado: 'bg-gray-100 text-gray-500',
  }

  const pagStatusStyle: any = {
    pago: 'bg-emerald-50 text-emerald-700',
    pendente: 'bg-amber-50 text-amber-700',
    cancelado: 'bg-red-50 text-red-500',
  }

  const paracobrar = assinantes.filter(a =>
    a.status === 'ativo' || a.status === 'inadimplente'
  )
  const inadimplentes = assinantes.filter(a => a.status === 'inadimplente')

  const nav = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Pacotes', path: '/pacotes' },
    { label: 'Assinantes', path: '/assinantes' },
    { label: 'Pagamentos', path: '/pagamentos' },
    { label: 'Promocoes', path: '/promocoes' },
    { label: 'Configuracoes', path: '/configuracoes' },
  ]

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Carregando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500" />
          <span className="font-medium text-gray-900">Beleza Recorrente</span>
        </div>
        <div className="flex items-center gap-1">
          {nav.map(item => (
            <button key={item.path} onClick={() => router.push(item.path)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                item.path === '/pagamentos'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {item.label}
            </button>
          ))}
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1.5 ml-2">
            Sair
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-medium text-gray-900">Pagamentos</h1>
            <p className="text-sm text-gray-400 mt-1">{mesAtual}</p>
          </div>
          {inadimplentes.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
              <p className="text-amber-700 font-medium text-lg">{inadimplentes.length}</p>
              <p className="text-amber-600 text-xs">inadimplente{inadimplentes.length > 1 ? 's' : ''}</p>
            </div>
          )}
        </div>

        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          <button onClick={() => setAba('cobrancas')}
            className={`text-sm px-4 py-2 rounded-lg transition-colors ${
              aba === 'cobrancas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}>
            Cobrancas
          </button>
          <button onClick={() => setAba('historico')}
            className={`text-sm px-4 py-2 rounded-lg transition-colors ${
              aba === 'historico' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}>
            Historico
          </button>
        </div>

        {aba === 'cobrancas' && (
          <div className="space-y-3">
            {paracobrar.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
                <p className="text-gray-400 text-sm">Nenhuma cobranca pendente</p>
              </div>
            ) : (
              paracobrar.map(a => {
                const jaPagei = pagamentos.some(p =>
                  p.assinante_id === a.id &&
                  p.mes_referencia === mesRef &&
                  p.status === 'pago'
                )
                return (
                  <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-medium text-sm">
                          {a.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{a.nome}</p>
                          <p className="text-xs text-gray-400">
                            {a.pacotes?.nome} · R$ {parseFloat(a.pacotes?.preco_mensal || 0).toFixed(0)}/mes
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusStyle[a.status]}`}>
                          {a.status}
                        </span>
                        {jaPagei ? (
                          <span className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg font-medium">
                            Pago este mes
                          </span>
                        ) : (
                          <button
                            onClick={() => confirmarPagamento(a)}
                            disabled={processando === a.id}
                            className="text-xs bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 transition-colors">
                            {processando === a.id ? 'Aguarde...' : 'Confirmar pagamento'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mr-auto">Alterar status:</p>
                      {a.status !== 'ativo' && (
                        <button onClick={() => alterarStatus(a, 'ativo')}
                          disabled={processando === a.id}
                          className="text-xs text-emerald-600 border border-emerald-200 hover:bg-emerald-50 rounded-lg px-3 py-1 transition-colors">
                          Ativar
                        </button>
                      )}
                      {a.status !== 'inadimplente' && (
                        <button onClick={() => alterarStatus(a, 'inadimplente')}
                          disabled={processando === a.id}
                          className="text-xs text-amber-600 border border-amber-200 hover:bg-amber-50 rounded-lg px-3 py-1 transition-colors">
                          Inadimplente
                        </button>
                      )}
                      {a.status !== 'pausado' && (
                        <button onClick={() => alterarStatus(a, 'pausado')}
                          disabled={processando === a.id}
                          className="text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-1 transition-colors">
                          Pausar
                        </button>
                      )}
                      {a.status !== 'cancelado' && (
                        <button onClick={() => alterarStatus(a, 'cancelado')}
                          disabled={processando === a.id}
                          className="text-xs text-red-400 border border-red-100 hover:bg-red-50 rounded-lg px-3 py-1 transition-colors">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {aba === 'historico' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {pagamentos.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-gray-400 text-sm">Nenhum pagamento registrado</p>
              </div>
            ) : (
              <div>
                {pagamentos.map((p, i) => (
                  <div key={p.id}
                    className={`px-5 py-4 flex items-center justify-between ${
                      i < pagamentos.length - 1 ? 'border-b border-gray-100' : ''
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-xs">
                        {p.assinantes?.nome?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.assinantes?.nome}</p>
                        <p className="text-xs text-gray-400">
                          {p.pago_em
                            ? new Date(p.pago_em).toLocaleDateString('pt-BR')
                            : new Date(p.criado_em).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-gray-900">
                        R$ {parseFloat(p.valor).toFixed(0)}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${pagStatusStyle[p.status]}`}>
                        {p.status}
                      </span>
                      {p.status === 'pago' && (
                        <button onClick={() => cancelarPagamento(p.id)}
                          className="text-xs text-red-400 hover:text-red-600">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
