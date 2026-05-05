'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '@/app/lib/tema'
import Layout from '../components/Layout'

type Promocao = {
  id: string
  titulo: string
  descricao?: string
  preco_original?: number
  preco_promo?: number
  data_fim?: string
  ativo: boolean
}

export default function PromocoesPage() {
  const router = useRouter()
  const { t } = useTema()
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [promocoes, setPromocoes] = useState<Promocao[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<Promocao | null>(null)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [precoOriginal, setPrecoOriginal] = useState('')
  const [precoPromo, setPrecoPromo] = useState('')
  const [dataFim, setDataFim] = useState('')

  const carregar = useCallback(async (id: string) => {
    const { data } = await supabase.from('promocoes').select('*').eq('salao_id', id).order('criado_em', { ascending: false })
    setPromocoes((data as Promocao[]) || [])
  }, [])

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
  }, [carregar, router])

  function cancelar() {
    setCriando(false); setEditando(null)
    setTitulo(''); setDescricao(''); setPrecoOriginal(''); setPrecoPromo(''); setDataFim('')
  }

  function abrirEdicao(p: Promocao) {
    setEditando(p); setTitulo(p.titulo); setDescricao(p.descricao || '')
    setPrecoOriginal(p.preco_original?.toString() || '')
    setPrecoPromo(p.preco_promo?.toString() ?? ''); setDataFim(p.data_fim ?? ''); setCriando(false)
  }

  async function salvar() {
    if (!titulo || !precoPromo || !dataFim || !salaoId) return
    const payload = { salao_id: salaoId, titulo, descricao, preco_original: precoOriginal ? parseFloat(precoOriginal) : null, preco_promo: parseFloat(precoPromo), data_fim: dataFim }
    if (editando) await supabase.from('promocoes').update(payload).eq('id', editando.id)
    else await supabase.from('promocoes').insert(payload)
    await carregar(salaoId)
    cancelar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta promocao?')) return
    await supabase.from('promocoes').delete().eq('id', id)
    setPromocoes(promocoes.filter(p => p.id !== id))
  }

  async function toggleAtivo(p: Promocao) {
    await supabase.from('promocoes').update({ ativo: !p.ativo }).eq('id', p.id)
    setPromocoes(promocoes.map(x => x.id === p.id ? { ...x, ativo: !x.ativo } : x))
  }

  const hoje = new Date().toISOString().split('T')[0]
  const ativas = promocoes.filter(p => p.ativo && (p.data_fim ?? '') >= hoje)
  const expiradas = promocoes.filter(p => !p.ativo || (p.data_fim ?? '') < hoje)
  const formulario = criando || editando

  const inputStyle = { width: '100%', border: `0.5px solid ${t.border}`, borderRadius: 10, padding: '11px 14px', background: t.bgInput, fontSize: 13, color: t.text, outline: 'none', boxSizing: 'border-box' as const }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textFaint, fontSize: 12, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )

  return (
    <Layout>
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
<div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: t.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 6px' }}>Marketing</p>
            <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Promocoes</h1>
          </div>
          {!formulario && (
            <button onClick={() => setCriando(true)}
              style={{ background: t.text, color: t.navBg, border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 12, cursor: 'pointer' }}>
              + Nova promocao
            </button>
          )}
        </div>

        {formulario && (
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '28px 32px', marginBottom: 20 }}>
            <h2 style={{ color: t.text, fontSize: 16, fontWeight: 400, margin: '0 0 20px' }}>
              {editando ? 'Editando promocao' : 'Nova promocao'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Titulo</label>
                <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Escova + Hidratacao especial" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Descricao (opcional)</label>
                <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Inclui escova modeladora e hidratacao profunda" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Preco original (R$)</label>
                  <input value={precoOriginal} onChange={e => setPrecoOriginal(e.target.value)} placeholder="Ex: 350" type="number" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Preco promo (R$)</label>
                  <input value={precoPromo} onChange={e => setPrecoPromo(e.target.value)} placeholder="Ex: 250" type="number" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Valida ate</label>
                  <input value={dataFim} onChange={e => setDataFim(e.target.value)} type="date" min={hoje} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
                <button onClick={salvar}
                  style={{ background: t.text, color: t.navBg, border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 12, cursor: 'pointer' }}>
                  {editando ? 'Salvar alteracoes' : 'Criar promocao'}
                </button>
                <button onClick={cancelar} style={{ background: 'none', border: 'none', color: t.textMuted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {ativas.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>Ativas agora</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ativas.map(p => (
                <div key={p.id} style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: t.accentBar }} />
                  <div style={{ paddingLeft: 12, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ background: t.badgeAtivo, color: t.badgeAtivoText, fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>Ativa</span>
                        <span style={{ color: t.textFaint, fontSize: 11 }}>ate {new Date(p.data_fim + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>
                      </div>
                      <h3 style={{ color: t.text, fontSize: 15, fontWeight: 400, margin: '0 0 4px' }}>{p.titulo}</h3>
                      {p.descricao && <p style={{ color: t.textFaint, fontSize: 12, margin: '0 0 10px' }}>{p.descricao}</p>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.preco_original && <span style={{ color: t.textFaint, fontSize: 13, textDecoration: 'line-through' }}>R$ {(p.preco_original).toFixed(0)}</span>}
                        <span style={{ color: t.text, fontSize: 20, fontWeight: 300 }}>R$ {(p.preco_promo ?? 0).toFixed(0)}</span>
                        {p.preco_original && (
                          <span style={{ background: t.text, color: t.navBg, fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>
                            -{Math.round((1 - (p.preco_promo ?? 0) / p.preco_original) * 100)}% OFF
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                      <button onClick={() => toggleAtivo(p)} style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>Pausar</button>
                      <button onClick={() => abrirEdicao(p)} style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>Editar</button>
                      <button onClick={() => excluir(p.id)} style={{ background: 'none', border: `0.5px solid ${t.border}`, color: '#ef4444', borderRadius: 8, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>Excluir</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {expiradas.length > 0 && (
          <div>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>Expiradas / Pausadas</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {expiradas.map(p => (
                <div key={p.id} style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '16px 24px', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ background: t.bg, color: t.textMuted, fontSize: 10, padding: '2px 8px', borderRadius: 20, marginBottom: 6, display: 'inline-block' }}>
                      {(p.data_fim ?? '') < hoje ? 'Expirada' : 'Pausada'}
                    </span>
                    <p style={{ color: t.text, fontSize: 14, margin: '4px 0 0' }}>{p.titulo}</p>
                  </div>
                  <button onClick={() => excluir(p.id)} style={{ background: 'none', border: `0.5px solid ${t.border}`, color: '#ef4444', borderRadius: 8, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>Excluir</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {promocoes.length === 0 && !formulario && (
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: 48, textAlign: 'center' }}>
            <p style={{ color: t.textFaint, fontSize: 13, marginBottom: 16 }}>Nenhuma promocao criada ainda</p>
            <button onClick={() => setCriando(true)}
              style={{ background: t.text, color: t.navBg, border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 12, cursor: 'pointer' }}>
              Criar primeira promocao
            </button>
          </div>
        )}
      </div>
    </div>
  </Layout>
  )
}
