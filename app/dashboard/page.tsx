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
      const { data: salao } = await supabase.from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) { setLoading(false); return }
      setSalaoId(salao.id)
      const [{ data: assinantes }, { data: pacotes }, { data: pagamentos }] = await Promise.all([
        supabase.from('assinantes').select('*, pacotes(preco_mensal, nome)').eq('salao_id', salao.id),
        supabase.from('pacotes').select('id').eq('salao_id', salao.id).eq('ativo', true),
        supabase.from('pagamentos').select('valor').eq('status', 'pago')
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

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#999', fontSize: 14, letterSpacing: 2 }}>Carregando...</p>
    </div>
  )
