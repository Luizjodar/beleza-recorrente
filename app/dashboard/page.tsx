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
const statusColor: any = {
    ativo: { bg: '#f0fdf4', color: '#166534' },
    cancelado: { bg: '#fef2f2', color: '#991b1b' },
    inadimplente: { bg: '#fffbeb', color: '#92400e' },
    pausado: { bg: '#f9fafb', color: '#6b7280' },
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f4', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'white', borderBottom: '1px solid #e8e8e8', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, background: '#111', borderRadius: 6 }} />
          <span style={{ fontFamily: 'Georgia, serif', fontSize: 15, letterSpacing: 2, color: '#111' }}>MARCELO RISSATO</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Pacotes', path: '/pacotes' },
            { label: 'Assinantes', path: '/assinantes' },
            { label: 'Promoções', path: '/promocoes' },
          ].map(item => (
            <button key={item.path} onClick={() => router.push(item.path)}
              style={{ background: 'none', border: 'none', color: '#888', fontSize: 12, letterSpacing: 1, cursor: 'pointer', padding: '4px 0' }}>
              {item.label.toUpperCase()}
            </button>
          ))}
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            style={{ background: 'none', border: '1px solid #e8e8e8', color: '#888', fontSize: 11, letterSpacing: 1, cursor: 'pointer', padding: '6px 14px', borderRadius: 6 }}>
            SAIR
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: 40 }}>
          <p style={{ color: '#aaa', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>Painel de gestão</p>
          <h1 style={{ color: '#111', fontSize: 28, fontWeight: 300, fontFamily: 'Georgia, serif', letterSpacing: 2, margin: 0 }}>Dashboard</h1>
          <p style={{ color: '#bbb', fontSize: 13, marginTop: 6 }}>{usuario?.email}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {[
            { label: 'Receita mensal recorrente', value: `R$ ${mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'garantida todo mês' },
            { label: 'Recebido este mês', value: `R$ ${pagamentosMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, sub: 'pagamentos confirmados' },
          ].map(card => (
            <div key={card.label} style={{ background: 'white', border: '1px solid #e8e8e8', borderRadius: 12, padding: '24px 28px' }}>
              <p style={{ color: '#aaa', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>{card.label}</p>
              <p style={{ color: '#111', fontSize: 32, fontWeight: 300, fontFamily: 'Georgia, serif', margin: '0 0 6px' }}>{card.value}</p>
              <p style={{ color: '#ccc', fontSize: 12, margin: 0 }}>{card.sub}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 40 }}>
          {[
            { label: 'Assinantes ativos', value: totalAtivos },
            { label: 'Pacotes criados', value: totalPacotes },
            { label: 'Renovações hoje', value: renovacoesHoje },
          ].map(card => (
            <div key={card.label} style={{ background: 'white', border: '1px solid #e8e8e8', borderRadius: 12, padding: '20px 24px' }}>
              <p style={{ color: '#aaa', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>{card.label}</p>
              <p style={{ color: '#111', fontSize: 28, fontWeight: 300, fontFamily: 'Georgia, serif', margin: 0 }}>{card.value}</p>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: '#111', fontSize: 13, fontWeight: 500, letterSpacing: 1, margin: 0 }}>ASSINANTES RECENTES</p>
            <button onClick={() => router.push('/assinantes')}
              style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 12, cursor: 'pointer', letterSpacing: 1 }}>
              VER TODOS →
            </button>
          </div>
          {assinantesRecentes.length === 0 ? (
            <div style={{ padding: '48px 28px', textAlign: 'center' }}>
              <p style={{ color: '#ccc', fontSize: 13, marginBottom: 16 }}>Nenhum assinante ainda</p>
              <button onClick={() => router.push('/assinantes')}
                style={{ background: '#111', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 12, letterSpacing: 2, cursor: 'pointer' }}>
                ADICIONAR ASSINANTE
              </button>
            </div>
          ) : (
            <div>
              {assinantesRecentes.map((a, i) => (
                <div key={a.id} style={{ padding: '16px 28px', borderBottom: i < assinantesRecentes.length - 1 ? '1px solid #f8f8f8' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f8f7f4', border: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111', fontSize: 13, fontFamily: 'Georgia, serif' }}>
                      {a.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ color: '#111', fontSize: 14, margin: '0 0 2px' }}>{a.nome}</p>
                      <p style={{ color: '#bbb', fontSize: 12, margin: 0 }}>{a.pacotes?.nome}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <p style={{ color: '#111', fontSize: 14, margin: 0 }}>R$ {parseFloat(a.pacotes?.preco_mensal || 0).toFixed(0)}/mês</p>
                    <span style={{ background: statusColor[a.status]?.bg, color: statusColor[a.status]?.color, fontSize: 11, padding: '3px 10px', borderRadius: 20, letterSpacing: 1 }}>
                      {a.status.toUpperCase()}
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
