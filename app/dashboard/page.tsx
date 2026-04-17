'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<any>(null)
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

  const nav = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Pacotes', path: '/pacotes' },
  { label: 'Assinantes', path: '/assinantes' },
  { label: 'Pagamentos', path: '/pagamentos' },
  { label: 'Promocoes', path: '/promocoes' },
  { label: 'Configuracoes', path: '/configuracoes' },
]

  const statusStyle: any = {
    ativo: { background: '#f0fdf4', color: '#15803d' },
    cancelado: { background: '#fef2f2', color: '#b91c1c' },
    inadimplente: { background: '#fffbeb', color: '#b45309' },
    pausado: { background: '#f9fafb', color: '#6b7280' },
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#ccc', fontSize: 13, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )
  return (
    <div style={{ minHeight: '100vh', background: '#f9f9f9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      
      <div style={{ background: 'white', borderBottom: '1px solid #f0f0f0', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 24, height: 24, background: '#111', borderRadius: 5 }} />
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1, color: '#111' }}>MARCELO RISSATO</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {nav.map(item => (
            <button key={item.path} onClick={() => router.push(item.path)}
              style={{ background: 'none', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer', padding: '6px 12px', borderRadius: 6, letterSpacing: 0.5 }}>
              {item.label}
            </button>
          ))}
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            style={{ background: '#f5f5f5', border: 'none', color: '#888', fontSize: 11, cursor: 'pointer', padding: '6px 12px', borderRadius: 6, marginLeft: 8 }}>
            Sair
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: 36 }}>
          <p style={{ color: '#bbb', fontSize: 12, margin: '0 0 4px' }}>Bem-vindo de volta</p>
          <h1 style={{ color: '#111', fontSize: 24, fontWeight: 300, margin: 0, letterSpacing: -0.5 }}>Dashboard</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 16, padding: '28px 32px' }}>
            <p style={{ color: '#bbb', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 16px' }}>Receita mensal recorrente</p>
            <p style={{ color: '#111', fontSize: 48, fontWeight: 200, letterSpacing: -2, margin: '0 0 4px', lineHeight: 1 }}>
              {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p style={{ color: '#ccc', fontSize: 12, margin: 0 }}>reais / mês</p>
          </div>
          <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 16, padding: '28px 32px' }}>
            <p style={{ color: '#bbb', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 16px' }}>Recebido este mês</p>
            <p style={{ color: '#111', fontSize: 48, fontWeight: 200, letterSpacing: -2, margin: '0 0 4px', lineHeight: 1 }}>
              {pagamentosMes.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p style={{ color: '#ccc', fontSize: 12, margin: 0 }}>reais confirmados</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 32 }}>
          {[
            { label: 'Assinantes ativos', value: totalAtivos, unit: 'clientes' },
            { label: 'Pacotes criados', value: totalPacotes, unit: 'planos' },
            { label: 'Renovações hoje', value: renovacoesHoje, unit: 'cobranças' },
          ].map(card => (
            <div key={card.label} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 16, padding: '24px 28px' }}>
              <p style={{ color: '#bbb', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 12px' }}>{card.label}</p>
              <p style={{ color: '#111', fontSize: 40, fontWeight: 200, letterSpacing: -1, margin: '0 0 4px', lineHeight: 1 }}>{card.value}</p>
              <p style={{ color: '#ccc', fontSize: 12, margin: 0 }}>{card.unit}</p>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #f8f8f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#111', fontSize: 13, fontWeight: 500, margin: 0 }}>Assinantes recentes</p>
            <button onClick={() => router.push('/assinantes')}
              style={{ background: 'none', border: 'none', color: '#bbb', fontSize: 12, cursor: 'pointer' }}>
              Ver todos →
            </button>
          </div>
          {assinantesRecentes.length === 0 ? (
            <div style={{ padding: '48px 28px', textAlign: 'center' }}>
              <p style={{ color: '#ccc', fontSize: 13, marginBottom: 16 }}>Nenhum assinante ainda</p>
              <button onClick={() => router.push('/assinantes')}
                style={{ background: '#111', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 12, cursor: 'pointer' }}>
                Adicionar assinante
              </button>
            </div>
          ) : (
            <div>
              {assinantesRecentes.map((a, i) => (
                <div key={a.id} style={{ padding: '14px 28px', borderBottom: i < assinantesRecentes.length - 1 ? '1px solid #f8f8f8' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111', fontSize: 13, fontWeight: 500 }}>
                      {a.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ color: '#111', fontSize: 14, margin: '0 0 2px', fontWeight: 400 }}>{a.nome}</p>
                      <p style={{ color: '#bbb', fontSize: 12, margin: 0 }}>{a.pacotes?.nome}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <p style={{ color: '#111', fontSize: 14, margin: 0, fontWeight: 300 }}>
                      R$ {parseFloat(a.pacotes?.preco_mensal || 0).toFixed(0)}/mês
                    </p>
                    <span style={{ ...statusStyle[a.status], fontSize: 11, padding: '3px 10px', borderRadius: 20 }}>
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
