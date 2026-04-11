'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<any>(null)
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [mrr, setMrr] = useState(0)
  const [totalAtivos, setTotalAtivos] = useState(0)
  const [totalPacotes, setTotalPacotes] = useState(0)
  const [renovacoesHoje, setRenovacoesHoje] = useState(0)
  const [assinantesRecentes, setAssinantesRecentes] = useState<any[]>([])
  const [pagamentosMes, setPagamentosMes] = useState(0)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUsuario(user)

      const { data: salao } = await supabase
        .from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) { setLoading(false); return }
      setSalaoId(salao.id)

      const [
        { data: assinantes },
        { data: pacotes },
        { data: pagamentos },
      ] = await Promise.all([
        supabase.from('assinantes')
          .select('*, pacotes(preco_mensal, nome)')
          .eq('salao_id', salao.id),
        supabase.from('pacotes')
          .select('id').eq('salao_id', salao.id).eq('ativo', true),
        supabase.from('pagamentos')
          .select('valor')
          .eq('status', 'pago')
          .gte('pago_em', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ])

      const ativos = (assinantes || []).filter(a => a.status === 'ativo')
      const mrrTotal = ativos.reduce((acc, a) => acc + parseFloat(a.pacotes?.preco_mensal || 0), 0)
      const hoje = new Date().toISOString().split('T')[0]
      const renovHoje = (assinantes || []).filter(a => a.proxima_cobranca === hoje).length
      const totalPago = (pagamentos || []).reduce((acc, p) => acc + parseFloat(p.valor), 0)

      setMrr(mrrTotal)
      setTotalAtivos(ativos.length)
      setTotalPacotes((pacotes || []).length)
      setRenovacoesHoje(renovHoje)
      setPagamentosMes(totalPago)
      setAssinantesRecentes((assinantes || []).slice(0, 5))
      setLoading(false)
    }
    init()
  }, [])

  async function handleSair() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const statusColor: any = {
    ativo: 'bg-emerald-50 text-emerald-700',
    cancelado: 'bg-red-50 text-red-600',
    inadimplente: 'bg-amber-50 text-amber-700',
    pausado: 'bg-gray-100 text-gray-500',
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Carregando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500" />
          <span className="font-medium text-gray-900">Beleza Recorrente</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/pacotes')} className="text-sm text-gray-500 hover:text-gray-700">Pacotes</button>
          <button onClick={() => router.push('/assinantes')} className="text-sm text-gray-500 hover:text-gray-700">Assinantes</button>
          <button onClick={handleSair} className="text-sm text-gray-500 hover:text-gray-700">Sair</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-medium text-gray-900">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">{usuario?.email}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">MRR (receita mensal recorrente)</p>
            <p className="text-3xl font-medium text-gray-900">
              R$ {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-1">receita garantida todo mês</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">Recebido este mês</p>
            <p className="text-3xl font-medium text-gray-900">
              R$ {pagamentosMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-1">pagamentos confirmados</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">Assinantes ativos</p>
            <p className="text-2xl font-medium text-gray-900">{totalAtivos}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">Pacotes criados</p>
            <p className="text-2xl font-medium text-gray-900">{totalPacotes}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">Renovações hoje</p>
            <p className="text-2xl font-medium text-gray-900">{renovacoesHoje}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">Assinantes recentes</h2>
            <button onClick={() => router.push('/assinantes')}
              className="text-xs text-emerald-600 hover:text-emerald-700">
              Ver todos →
            </button>
          </div>
          {assinantesRecentes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400 text-sm mb-3">Nenhum assinante ainda</p>
              <button onClick={() => router.push('/assinantes')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                Adicionar primeiro assinante
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {assinantesRecentes.map(a => (
                <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-medium text-xs">
                      {a.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">{a.nome}</p>
                      <p className="text-xs text-gray-400">{a.pacotes?.nome}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      R$ {parseFloat(a.pacotes?.preco_mensal || 0).toFixed(0)}/mês
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[a.status]}`}>
                      {a.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}