'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '@/app/lib/tema'
import Layout from '../components/Layout'

type Produto = {
  id: string
  nome: string
  categoria: 'uso_interno' | 'revenda'
  preco_custo?: number
  preco_venda?: number
  estoque_atual: number
  estoque_minimo: number
  unidade: string
  ativo: boolean
}

export default function ProdutosPage() {
  const router = useRouter()
  const { t } = useTema()
  const [loading, setLoading] = useState(true)
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [aba, setAba] = useState<'todos' | 'uso_interno' | 'revenda'>('todos')
  const [criando, setCriando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [movimentando, setMovimentando] = useState<Produto | null>(null)
  const [qtdMovimento, setQtdMovimento] = useState('')
  const [tipoMovimento, setTipoMovimento] = useState<'entrada' | 'saida' | 'uso'>('entrada')

  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState<'uso_interno' | 'revenda'>('uso_interno')
  const [precoCusto, setPrecoCusto] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [estoqueAtual, setEstoqueAtual] = useState('')
  const [estoqueMinimo, setEstoqueMinimo] = useState('5')
  const [unidade, setUnidade] = useState('un')

  const carregar = useCallback(async (id: string) => {
    const { data } = await supabase.from('produtos').select('*').eq('salao_id', id).eq('ativo', true).order('nome')
    setProdutos((data as Produto[]) || [])
  }, [])

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

  async function salvar() {
    if (!nome || !salaoId) return
    setSalvando(true)
    await supabase.from('produtos').insert({
      salao_id: salaoId, nome, categoria,
      preco_custo: precoCusto ? parseFloat(precoCusto) : null,
      preco_venda: precoVenda ? parseFloat(precoVenda) : null,
      estoque_atual: parseInt(estoqueAtual) || 0,
      estoque_minimo: parseInt(estoqueMinimo) || 5,
      unidade,
    })
    await carregar(salaoId)
    setNome(''); setPrecoCusto(''); setPrecoVenda(''); setEstoqueAtual(''); setEstoqueMinimo('5'); setUnidade('un')
    setCriando(false)
    setSalvando(false)
  }

  async function registrarMovimento() {
    if (!movimentando || !qtdMovimento || !salaoId) return
    const qtd = parseInt(qtdMovimento)
    const novoEstoque = tipoMovimento === 'entrada'
      ? movimentando.estoque_atual + qtd
      : Math.max(0, movimentando.estoque_atual - qtd)

    await supabase.from('estoque_movimentacoes').insert({
      produto_id: movimentando.id, salao_id: salaoId,
      tipo: tipoMovimento, quantidade: qtd,
    })
    await supabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', movimentando.id)
    setProdutos(produtos.map(p => p.id === movimentando.id ? { ...p, estoque_atual: novoEstoque } : p))
    setMovimentando(null); setQtdMovimento('')
  }

  async function excluir(id: string) {
    if (!confirm('Excluir produto?')) return
    await supabase.from('produtos').update({ ativo: false }).eq('id', id)
    setProdutos(produtos.filter(p => p.id !== id))
  }

  const filtrados = produtos.filter(p => aba === 'todos' || p.categoria === aba)
  const emFalta = produtos.filter(p => p.estoque_atual <= p.estoque_minimo)
  const valorEstoque = produtos.filter(p => p.categoria === 'revenda').reduce((acc, p) => acc + (p.estoque_atual * (p.preco_custo || 0)), 0)

  const inputStyle = { width: '100%', border: `0.5px solid ${t.border}`, borderRadius: 10, padding: '11px 14px', background: t.bgInput, fontSize: 13, color: t.text, outline: 'none', boxSizing: 'border-box' as const }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textFaint, fontSize: 12, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )

  return (
    <Layout>
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
<div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 24px' }}>

        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: t.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 6px' }}>Gestao</p>
            <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Produtos</h1>
          </div>
          {!criando && (
            <button onClick={() => setCriando(true)}
              style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
              + Novo produto
            </button>
          )}
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {([
            { label: 'Total produtos', value: produtos.length, unit: 'cadastrados', warn: false },
            { label: 'Em falta', value: emFalta.length, unit: 'abaixo do minimo', warn: emFalta.length > 0 },
            { label: 'Uso interno', value: produtos.filter(p => p.categoria === 'uso_interno').length, unit: 'produtos', warn: false },
            { label: 'Valor em estoque', value: `R$ ${valorEstoque.toFixed(0)}`, unit: 'revenda', warn: false },
          ] as { label: string; value: string | number; unit: string; warn: boolean }[]).map(card => (
            <div key={card.label} style={{ background: card.warn ? t.badgeInadimplente : t.bgCard, border: `0.5px solid ${card.warn ? t.badgeInadimplenteText : t.borderCard}`, borderRadius: 16, padding: '18px 20px' }}>
              <p style={{ color: card.warn ? t.badgeInadimplenteText : t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px' }}>{card.label}</p>
              <p style={{ color: card.warn ? t.badgeInadimplenteText : t.text, fontSize: 28, fontWeight: 200, margin: '0 0 2px', lineHeight: 1 }}>{card.value}</p>
              <p style={{ color: card.warn ? t.badgeInadimplenteText : t.textFaint, fontSize: 11, margin: 0 }}>{card.unit}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        {criando && (
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '28px 32px', marginBottom: 20 }}>
            <h2 style={{ color: t.text, fontSize: 16, fontWeight: 400, margin: '0 0 20px' }}>Novo produto</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Nome *</label>
                  <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Shampoo Profissional" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Categoria</label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value as 'uso_interno' | 'revenda')} style={{ ...inputStyle, appearance: 'none' as const }}>
                    <option value="uso_interno">Uso interno</option>
                    <option value="revenda">Revenda</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Preco custo</label>
                  <input value={precoCusto} onChange={e => setPrecoCusto(e.target.value)} placeholder="R$ 0,00" type="number" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Preco venda</label>
                  <input value={precoVenda} onChange={e => setPrecoVenda(e.target.value)} placeholder="R$ 0,00" type="number" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Estoque atual</label>
                  <input value={estoqueAtual} onChange={e => setEstoqueAtual(e.target.value)} placeholder="0" type="number" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Estoque minimo</label>
                  <input value={estoqueMinimo} onChange={e => setEstoqueMinimo(e.target.value)} placeholder="5" type="number" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={salvar} disabled={salvando || !nome}
                  style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 12, cursor: 'pointer' }}>
                  {salvando ? 'Salvando...' : 'Salvar produto'}
                </button>
                <button onClick={() => setCriando(false)} style={{ background: 'none', border: 'none', color: t.textMuted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Abas */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: t.bgCard, border: `0.5px solid ${t.border}`, padding: 3, borderRadius: 10, width: 'fit-content' }}>
          {(['todos', 'uso_interno', 'revenda'] as const).map(a => (
            <button key={a} onClick={() => setAba(a)}
              style={{ background: aba === a ? t.text : 'none', color: aba === a ? t.bg : t.textMuted, border: 'none', padding: '6px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: aba === a ? 500 : 400 }}>
              {a === 'todos' ? 'Todos' : a === 'uso_interno' ? 'Uso interno' : 'Revenda'}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, overflow: 'hidden' }}>
          {filtrados.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <p style={{ color: t.textFaint, fontSize: 13 }}>Nenhum produto cadastrado</p>
            </div>
          ) : filtrados.map((p, i) => {
            const emFalta = p.estoque_atual <= p.estoque_minimo
            return (
              <div key={p.id} style={{ padding: '14px 24px', borderBottom: i < filtrados.length - 1 ? `0.5px solid ${t.rowBorder}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <p style={{ color: t.text, fontSize: 13, fontWeight: 500, margin: 0 }}>{p.nome}</p>
                    <span style={{ background: p.categoria === 'revenda' ? t.badgeAtivo : t.bg, color: p.categoria === 'revenda' ? t.badgeAtivoText : t.textFaint, fontSize: 9, padding: '1px 7px', borderRadius: 20, border: `0.5px solid ${t.border}` }}>
                      {p.categoria === 'revenda' ? 'revenda' : 'uso interno'}
                    </span>
                  </div>
                  {p.preco_custo && <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>Custo: R$ {(p.preco_custo).toFixed(2)}{p.preco_venda ? ` · Venda: R$ ${(p.preco_venda).toFixed(2)}` : ''}</p>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: emFalta ? t.badgeInadimplenteText : t.text, fontSize: 18, fontWeight: 300, margin: 0, lineHeight: 1 }}>{p.estoque_atual}</p>
                    <p style={{ color: t.textFaint, fontSize: 10, margin: '2px 0 0' }}>{p.unidade}</p>
                  </div>
                  {emFalta && (
                    <span style={{ background: t.badgeInadimplente, color: t.badgeInadimplenteText, fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>Em falta</span>
                  )}
                  <button onClick={() => { setMovimentando(p); setTipoMovimento('entrada') }}
                    style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>
                    Movimentar
                  </button>
                  <button onClick={() => excluir(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Modal movimentacao */}
        {movimentando && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 20, padding: '32px', width: '100%', maxWidth: 360 }}>
              <h2 style={{ color: t.text, fontSize: 16, fontWeight: 400, margin: '0 0 6px' }}>Movimentar estoque</h2>
              <p style={{ color: t.textFaint, fontSize: 13, margin: '0 0 24px' }}>{movimentando.nome} · Atual: {movimentando.estoque_atual} {movimentando.unidade}</p>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {(['entrada', 'saida', 'uso'] as const).map(tipo => (
                  <button key={tipo} onClick={() => setTipoMovimento(tipo)}
                    style={{ flex: 1, background: tipoMovimento === tipo ? t.text : 'none', color: tipoMovimento === tipo ? t.bg : t.textMuted, border: `0.5px solid ${t.border}`, borderRadius: 8, padding: '8px', fontSize: 12, cursor: 'pointer' }}>
                    {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Quantidade</label>
                <input value={qtdMovimento} onChange={e => setQtdMovimento(e.target.value)} placeholder="Ex: 5" type="number" min="1" style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={registrarMovimento} disabled={!qtdMovimento}
                  style={{ flex: 1, background: t.text, color: t.bg, border: 'none', borderRadius: 10, padding: 12, fontSize: 12, cursor: 'pointer' }}>
                  Registrar
                </button>
                <button onClick={() => { setMovimentando(null); setQtdMovimento('') }}
                  style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 10, padding: '12px 16px', fontSize: 12, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </Layout>
  )
}
