'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '@/app/lib/tema'
import Layout from '../components/Layout'

const CATEGORIAS = ['aluguel', 'energia', 'agua', 'fornecedor', 'marketing', 'salario', 'outros']

type Despesa = {
  id: string
  descricao: string
  categoria: string
  tipo: 'fixa' | 'variavel'
  valor: number
  data: string
  recorrente: boolean
}

export default function DespesasPage() {
  const router = useRouter()
  const { t } = useTema()
  const [loading, setLoading] = useState(true)
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [criando, setCriando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mesOffset, setMesOffset] = useState(0)

  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('outros')
  const [tipo, setTipo] = useState<'fixa' | 'variavel'>('fixa')
  const [valor, setValor] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [recorrente, setRecorrente] = useState(false)

  const mesRef = new Date()
  mesRef.setMonth(mesRef.getMonth() + mesOffset)
  const mesAtual = `${mesRef.getFullYear()}-${String(mesRef.getMonth() + 1).padStart(2, '0')}`
  const labelMes = mesRef.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  const carregar = useCallback(async (id: string) => {
    const inicio = `${mesAtual}-01`
    const fim = new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 0).toISOString().split('T')[0]
    const { data } = await supabase.from('despesas').select('*').eq('salao_id', id)
      .gte('data', inicio).lte('data', fim).order('data', { ascending: false })
    setDespesas((data as Despesa[]) || [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesAtual])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) return
      setSalaoId(salao.id)
      await carregar(salao.id)
      setLoading(false)
    }
    init()
  }, [carregar, router])

  useEffect(() => {
    if (salaoId) carregar(salaoId)
  }, [mesOffset, salaoId, carregar])

  async function salvar() {
    if (!descricao || !valor || !data || !salaoId) return
    setSalvando(true)
    await supabase.from('despesas').insert({
      salao_id: salaoId, descricao, categoria, tipo,
      valor: parseFloat(valor), data, recorrente,
    })
    await carregar(salaoId)
    setDescricao(''); setValor(''); setCategoria('outros'); setTipo('fixa'); setRecorrente(false)
    setCriando(false)
    setSalvando(false)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir despesa?')) return
    await supabase.from('despesas').delete().eq('id', id)
    setDespesas(despesas.filter(d => d.id !== id))
  }

  const totalMes = despesas.reduce((acc, d) => acc + d.valor, 0)
  const totalFixas = despesas.filter(d => d.tipo === 'fixa').reduce((acc, d) => acc + d.valor, 0)
  const totalVariaveis = despesas.filter(d => d.tipo === 'variavel').reduce((acc, d) => acc + d.valor, 0)

  const porCategoria = CATEGORIAS.map(cat => ({
    cat,
    total: despesas.filter(d => d.categoria === cat).reduce((acc, d) => acc + d.valor, 0)
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total)

  const maxCategoria = Math.max(...porCategoria.map(c => c.total), 1)

  const inputStyle = { width: '100%', border: `0.5px solid ${t.border}`, borderRadius: 10, padding: '11px 14px', background: t.bgInput, fontSize: 13, color: t.text, outline: 'none', boxSizing: 'border-box' as const }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textFaint, fontSize: 12, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )

  return (
    <Layout>
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
<div style={{ maxWidth: 960, margin: '0 auto', padding: '36px 24px' }}>

        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: t.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 6px' }}>Financeiro</p>
            <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Despesas</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setMesOffset(mesOffset - 1)} style={{ background: t.bgCard, border: `0.5px solid ${t.border}`, color: t.text, borderRadius: 8, padding: '7px 12px', fontSize: 13, cursor: 'pointer' }}>←</button>
            <span style={{ color: t.text, fontSize: 13, fontWeight: 500, minWidth: 140, textAlign: 'center' }}>{labelMes}</span>
            <button onClick={() => setMesOffset(mesOffset + 1)} style={{ background: t.bgCard, border: `0.5px solid ${t.border}`, color: t.text, borderRadius: 8, padding: '7px 12px', fontSize: 13, cursor: 'pointer' }}>→</button>
            {!criando && (
              <button onClick={() => setCriando(true)} style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                + Nova despesa
              </button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          {([
            { label: 'Total do mes', value: `R$ ${totalMes.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, unit: labelMes, accent: true },
            { label: 'Fixas', value: `R$ ${totalFixas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, unit: `${despesas.filter(d => d.tipo === 'fixa').length} lancamentos`, accent: false },
            { label: 'Variaveis', value: `R$ ${totalVariaveis.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, unit: `${despesas.filter(d => d.tipo === 'variavel').length} lancamentos`, accent: false },
          ] as { label: string; value: string; unit: string; accent: boolean }[]).map(card => (
            <div key={card.label} style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '22px 26px', position: 'relative', overflow: 'hidden' }}>
              {card.accent && <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: '#ef4444' }} />}
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 10px' }}>{card.label}</p>
              <p style={{ color: t.text, fontSize: 32, fontWeight: 200, margin: '0 0 4px', lineHeight: 1 }}>{card.value}</p>
              <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>{card.unit}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        {criando && (
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '28px 32px', marginBottom: 20 }}>
            <h2 style={{ color: t.text, fontSize: 16, fontWeight: 400, margin: '0 0 20px' }}>Nova despesa</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Descricao *</label>
                  <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Aluguel do salao" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Valor *</label>
                  <input value={valor} onChange={e => setValor(e.target.value)} placeholder="R$ 0,00" type="number" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Categoria</label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value)} style={{ ...inputStyle, appearance: 'none' as const }}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Tipo</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value as 'fixa' | 'variavel')} style={{ ...inputStyle, appearance: 'none' as const }}>
                    <option value="fixa">Fixa</option>
                    <option value="variavel">Variavel</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Data</label>
                  <input type="date" value={data} onChange={e => setData(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div onClick={() => setRecorrente(!recorrente)}
                  style={{ width: 36, height: 20, borderRadius: 10, background: recorrente ? t.text : t.border, cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: recorrente ? 18 : 2, transition: 'left 0.2s' }} />
                </div>
                <span style={{ color: t.textMuted, fontSize: 13 }}>Despesa recorrente mensal</span>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={salvar} disabled={salvando || !descricao || !valor}
                  style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 12, cursor: 'pointer' }}>
                  {salvando ? 'Salvando...' : 'Salvar despesa'}
                </button>
                <button onClick={() => setCriando(false)} style={{ background: 'none', border: 'none', color: t.textMuted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
          {/* Lista de despesas */}
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '14px 24px', borderBottom: `0.5px solid ${t.rowBorder}` }}>
              <p style={{ color: t.text, fontSize: 13, fontWeight: 500, margin: 0 }}>Lancamentos de {labelMes}</p>
            </div>
            {despesas.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <p style={{ color: t.textFaint, fontSize: 13, marginBottom: 12 }}>Nenhuma despesa lancada</p>
                <button onClick={() => setCriando(true)} style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, cursor: 'pointer' }}>
                  Lancar despesa
                </button>
              </div>
            ) : despesas.map((d, i) => (
              <div key={d.id} style={{ padding: '13px 24px', borderBottom: i < despesas.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.tipo === 'fixa' ? '#3b82f6' : '#f59e0b', flexShrink: 0 }} />
                  <div>
                    <p style={{ color: t.text, fontSize: 13, margin: '0 0 2px', fontWeight: 400 }}>{d.descricao}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: t.textFaint, fontSize: 11 }}>{d.categoria}</span>
                      <span style={{ color: t.textFaint, fontSize: 11 }}>·</span>
                      <span style={{ color: t.textFaint, fontSize: 11 }}>{new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      {d.recorrente && <span style={{ color: '#3b82f6', fontSize: 10 }}>recorrente</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <p style={{ color: '#ef4444', fontSize: 14, fontWeight: 400, margin: 0 }}>-R$ {d.valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                  <span style={{ background: d.tipo === 'fixa' ? '#eff6ff' : '#fffbeb', color: d.tipo === 'fixa' ? '#2563eb' : '#b45309', fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>
                    {d.tipo}
                  </span>
                  <button onClick={() => excluir(d.id)} style={{ background: 'none', border: 'none', color: t.textFaint, fontSize: 12, cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* Grafico por categoria */}
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '20px' }}>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 20px' }}>Por categoria</p>
            {porCategoria.length === 0 ? (
              <p style={{ color: t.textFaint, fontSize: 12 }}>Sem dados</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {porCategoria.map(c => (
                  <div key={c.cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ color: t.textMuted, fontSize: 12 }}>{c.cat.charAt(0).toUpperCase() + c.cat.slice(1)}</span>
                      <span style={{ color: t.text, fontSize: 12, fontWeight: 500 }}>R$ {c.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div style={{ background: t.bg, borderRadius: 4, height: 6, overflow: 'hidden' }}>
                      <div style={{ background: '#ef4444', height: '100%', width: `${(c.total / maxCategoria) * 100}%`, borderRadius: 4, opacity: 0.7 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </Layout>
  )
}
