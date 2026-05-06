'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '@/app/lib/tema'
import Layout from '../components/Layout'
import ImageEditor from '../components/ImageEditor'

type Item = { id?: string; servico_nome: string; quantidade: number }
type PacoteItem = { id: string; servico_nome: string; quantidade: number }
type Pacote = { id: string; nome: string; descricao?: string; preco_mensal: number; imagem_url?: string; pacote_itens: PacoteItem[] }

export default function PacotesPage() {
  const router = useRouter()
  const { t } = useTema()
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<Pacote | null>(null)
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [itens, setItens] = useState<Item[]>([{ servico_nome: '', quantidade: 1 }])
  const [imagemFile, setImagemFile] = useState<File | null>(null)
  const [imagemPreview, setImagemPreview] = useState<string>('')
  const [uploadando, setUploadando] = useState(false)
  const [editandoImagem, setEditandoImagem] = useState<string>('')

  const carregarPacotes = useCallback(async (id: string) => {
    const { data } = await supabase.from('pacotes')
      .select('*, pacote_itens(*)')
      .eq('salao_id', id)
      .order('criado_em', { ascending: false })
    setPacotes((data as Pacote[]) || [])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      let { data: salao } = await supabase.from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) {
        const { data: novo } = await supabase.from('saloes').insert({
          user_id: user.id, nome: 'Meu Salao', slug: user.id.slice(0, 8),
        }).select().single()
        salao = novo
      }
      setSalaoId(salao!.id)
      await carregarPacotes(salao!.id)
      setLoading(false)
    }
    init()
  }, [carregarPacotes, router])

  function addItem() { setItens([...itens, { servico_nome: '', quantidade: 1 }]) }
  function updateItem(i: number, field: keyof Item, value: string | number) {
    const novos = [...itens]; novos[i] = { ...novos[i], [field]: value }; setItens(novos)
  }
  function removeItem(i: number) { setItens(itens.filter((_, idx) => idx !== i)) }

  function abrirEdicao(p: Pacote) {
    setEditando(p); setNome(p.nome); setDescricao(p.descricao || '')
    setPreco(p.preco_mensal.toString())
    setItens(p.pacote_itens.map((i) => ({ id: i.id, servico_nome: i.servico_nome, quantidade: i.quantidade })))
    setImagemPreview(p.imagem_url || '')
    setImagemFile(null)
    setCriando(false)
  }

  function abrirCriacao() {
    setEditando(null); setNome(''); setDescricao(''); setPreco('')
    setItens([{ servico_nome: '', quantidade: 1 }])
    setImagemFile(null); setImagemPreview('')
    setCriando(true)
  }

  function cancelar() {
    setCriando(false); setEditando(null); setNome(''); setDescricao(''); setPreco('')
    setItens([{ servico_nome: '', quantidade: 1 }])
    setImagemFile(null); setImagemPreview('')
  }

  function handleImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setEditandoImagem(url)
  }

  function confirmarCrop(blob: Blob, url: string) {
    setImagemFile(new File([blob], 'arte.jpg', { type: 'image/jpeg' }))
    setImagemPreview(url)
    setEditandoImagem('')
  }

  async function salvarPacote() {
    if (!nome || !preco || !salaoId) return
    const itensFiltrados = itens.filter(i => i.servico_nome.trim())
    if (itensFiltrados.length === 0) return
    setUploadando(true)

    let imagem_url = editando?.imagem_url || null

    // Upload da imagem se houver nova
    if (imagemFile && salaoId) {
      const ext = imagemFile.name.split('.').pop()
      const path = `pacotes/${salaoId}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('artes').upload(path, imagemFile, { upsert: true })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('artes').getPublicUrl(path)
        imagem_url = urlData.publicUrl
      }
    }

    if (editando) {
      await supabase.from('pacotes').update({ nome, descricao, preco_mensal: parseFloat(preco), imagem_url }).eq('id', editando.id)
      await supabase.from('pacote_itens').delete().eq('pacote_id', editando.id)
      await supabase.from('pacote_itens').insert(
        itensFiltrados.map((item, i) => ({ pacote_id: editando.id, servico_nome: item.servico_nome, quantidade: item.quantidade, ordem: i }))
      )
    } else {
      const { data: pacote } = await supabase.from('pacotes').insert({
        salao_id: salaoId, nome, descricao, preco_mensal: parseFloat(preco), imagem_url,
      }).select().single()
      if (pacote) {
        await supabase.from('pacote_itens').insert(
          itensFiltrados.map((item, i) => ({ pacote_id: pacote.id, servico_nome: item.servico_nome, quantidade: item.quantidade, ordem: i }))
        )
      }
    }
    await carregarPacotes(salaoId)
    setUploadando(false)
    cancelar()
  }

  async function excluirPacote(id: string) {
    if (!confirm('Excluir este pacote?')) return
    await supabase.from('pacotes').delete().eq('id', id)
    setPacotes(pacotes.filter(p => p.id !== id))
  }

  const inputStyle = {
    width: '100%', border: `0.5px solid ${t.border}`, borderRadius: 10,
    padding: '11px 14px', background: t.bgInput, fontSize: 13,
    color: t.text, outline: 'none', boxSizing: 'border-box' as const,
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textFaint, fontSize: 12, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )

  const formulario = criando || editando

  return (
    <Layout>
    {editandoImagem && (
      <ImageEditor
        imageSrc={editandoImagem}
        onConfirm={confirmarCrop}
        onCancel={() => setEditandoImagem('')}
      />
    )}
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
<div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: t.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 6px' }}>Gestao</p>
            <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Pacotes</h1>
          </div>
          {!formulario && (
            <button onClick={abrirCriacao}
              style={{ background: t.text, color: t.navBg, border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 12, cursor: 'pointer', letterSpacing: 0.5 }}>
              + Novo pacote
            </button>
          )}
        </div>

        {formulario && (
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '28px 32px', marginBottom: 20 }}>
            <h2 style={{ color: t.text, fontSize: 16, fontWeight: 400, margin: '0 0 20px' }}>
              {editando ? `Editando: ${editando.nome}` : 'Novo pacote'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Nome</label>
                  <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Plano Prata" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Preco mensal (R$)</label>
                  <input value={preco} onChange={e => setPreco(e.target.value)} placeholder="Ex: 290" type="number" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Descricao (opcional)</label>
                <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Ideal para quem vai ao salao todo mes" style={inputStyle} />
              </div>
              <div>
                <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Servicos incluidos</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {itens.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input value={item.servico_nome} onChange={e => updateItem(i, 'servico_nome', e.target.value)}
                        placeholder="Ex: Corte feminino" style={{ ...inputStyle, flex: 1 }} />
                      <input value={item.quantidade} onChange={e => updateItem(i, 'quantidade', parseInt(e.target.value) || 1)}
                        type="number" min="1" max="99" style={{ ...inputStyle, width: 64, textAlign: 'center' }} />
                      <span style={{ color: t.textFaint, fontSize: 11 }}>x/mes</span>
                      {itens.length > 1 && (
                        <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: t.textMuted, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>x</button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addItem} style={{ background: 'none', border: 'none', color: t.textMuted, fontSize: 13, cursor: 'pointer', marginTop: 8, padding: 0 }}>
                  + Adicionar servico
                </button>
              </div>
              <div>
                <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Arte / Imagem (opcional)</label>
                <div style={{ border: `0.5px dashed ${t.border}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                  onClick={() => document.getElementById('upload-pacote')?.click()}>
                  {imagemPreview ? (
                    <img src={imagemPreview} alt="Arte" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ padding: '24px', textAlign: 'center' }}>
                      <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>Clique para fazer upload da arte do pacote</p>
                      <p style={{ color: t.textFaint, fontSize: 11, margin: '4px 0 0' }}>JPG, PNG ou WEBP · Recomendado 9:16 (stories)</p>
                    </div>
                  )}
                  {imagemPreview && (
                    <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 11, padding: '4px 10px', borderRadius: 6 }}>
                      Trocar imagem
                    </div>
                  )}
                </div>
                <input id="upload-pacote" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagem} />
              </div>
              <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
                <button onClick={salvarPacote} disabled={uploadando}
                  style={{ background: t.text, color: t.navBg, border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 12, cursor: 'pointer', opacity: uploadando ? 0.6 : 1 }}>
                  {uploadando ? 'Salvando...' : editando ? 'Salvar alteracoes' : 'Criar pacote'}
                </button>
                <button onClick={cancelar}
                  style={{ background: 'none', border: 'none', color: t.textMuted, fontSize: 13, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {pacotes.length === 0 && !formulario ? (
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '48px', textAlign: 'center' }}>
            <p style={{ color: t.textFaint, fontSize: 13 }}>Nenhum pacote criado ainda</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {pacotes.map(p => (
              <div key={p.id} style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, overflow: 'hidden' }}>
                {p.imagem_url && (
                  <img src={p.imagem_url} alt={p.nome} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                )}
                <div style={{ padding: '22px 28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ color: t.text, fontSize: 15, fontWeight: 500, margin: '0 0 3px' }}>{p.nome}</h3>
                    {p.descricao && <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>{p.descricao}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: t.textMuted, fontSize: 15, fontWeight: 300 }}>
                      R$ {p.preco_mensal.toFixed(0)}/mes
                    </span>
                    <button onClick={() => abrirEdicao(p)}
                      style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>
                      Editar
                    </button>
                    <button onClick={() => excluirPacote(p.id)}
                      style={{ background: 'none', border: `0.5px solid ${t.border}`, color: '#ef4444', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer' }}>
                      Excluir
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {p.pacote_itens?.map((item: PacoteItem) => (
                    <span key={item.id} style={{ background: t.bg, color: t.textMuted, fontSize: 11, border: `0.5px solid ${t.border}`, borderRadius: 20, padding: '4px 12px' }}>
                      {item.quantidade}x {item.servico_nome}
                    </span>
                  ))}
                </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </Layout>
  )
}
