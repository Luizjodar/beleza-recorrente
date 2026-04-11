'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

type Item = { id?: string; servico_nome: string; quantidade: number }

export default function PacotesPage() {
  const router = useRouter()
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [pacotes, setPacotes] = useState<any[]>([])
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [itens, setItens] = useState<Item[]>([{ servico_nome: '', quantidade: 1 }])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      let { data: salao } = await supabase.from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) {
        const { data: novo } = await supabase.from('saloes').insert({
          user_id: user.id, nome: 'Meu Salão', slug: user.id.slice(0, 8),
        }).select().single()
        salao = novo
      }
      setSalaoId(salao.id)
      await carregarPacotes(salao.id)
      setLoading(false)
    }
    init()
  }, [])

  async function carregarPacotes(id: string) {
    const { data } = await supabase.from('pacotes')
      .select('*, pacote_itens(*)')
      .eq('salao_id', id)
      .order('criado_em', { ascending: false })
    setPacotes(data || [])
  }

  function addItem() { setItens([...itens, { servico_nome: '', quantidade: 1 }]) }
  function updateItem(i: number, field: keyof Item, value: any) {
    const novos = [...itens]; novos[i] = { ...novos[i], [field]: value }; setItens(novos)
  }
  function removeItem(i: number) { setItens(itens.filter((_, idx) => idx !== i)) }

  function abrirEdicao(p: any) {
    setEditando(p); setNome(p.nome); setDescricao(p.descricao || '')
    setPreco(p.preco_mensal.toString())
    setItens(p.pacote_itens.map((i: any) => ({ id: i.id, servico_nome: i.servico_nome, quantidade: i.quantidade })))
    setCriando(false)
  }

  function abrirCriacao() {
    setEditando(null); setNome(''); setDescricao(''); setPreco('')
    setItens([{ servico_nome: '', quantidade: 1 }]); setCriando(true)
  }

  function cancelar() {
    setCriando(false); setEditando(null); setNome(''); setDescricao(''); setPreco('')
    setItens([{ servico_nome: '', quantidade: 1 }])
  }

  async function salvarPacote() {
    if (!nome || !preco || !salaoId) return
    const itensFiltrados = itens.filter(i => i.servico_nome.trim())
    if (itensFiltrados.length === 0) return
    if (editando) {
      await supabase.from('pacotes').update({ nome, descricao, preco_mensal: parseFloat(preco) }).eq('id', editando.id)
      await supabase.from('pacote_itens').delete().eq('pacote_id', editando.id)
      await supabase.from('pacote_itens').insert(
        itensFiltrados.map((item, i) => ({ pacote_id: editando.id, servico_nome: item.servico_nome, quantidade: item.quantidade, ordem: i }))
      )
    } else {
      const { data: pacote } = await supabase.from('pacotes').insert({
        salao_id: salaoId, nome, descricao, preco_mensal: parseFloat(preco),
      }).select().single()
      if (pacote) {
        await supabase.from('pacote_itens').insert(
          itensFiltrados.map((item, i) => ({ pacote_id: pacote.id, servico_nome: item.servico_nome, quantidade: item.quantidade, ordem: i }))
        )
      }
    }
    await carregarPacotes(salaoId)
    cancelar()
  }

  async function excluirPacote(id: string) {
    if (!confirm('Excluir este pacote?')) return
    await supabase.from('pacotes').delete().eq('id', id)
    setPacotes(pacotes.filter(p => p.id !== id))
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400 text-sm">Carregando...</p></div>
  const formulario = criando || editando
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500" />
          <span className="font-medium text-gray-900">Beleza Recorrente</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-gray-700">Dashboard</button>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-sm text-gray-500 hover:text-gray-700">Sair</button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-medium text-gray-900">Pacotes</h1>
          {!formulario && (
            <button onClick={abrirCriacao} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
              + Novo pacote
            </button>
          )}
        </div>

        {formulario && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="text-base font-medium text-gray-900 mb-4">
              {editando ? `Editando: ${editando.nome}` : 'Novo pacote'}
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nome do pacote</label>
                  <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Plano Prata"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Preço mensal (R$)</label>
                  <input value={preco} onChange={e => setPreco(e.target.value)} placeholder="Ex: 290" type="number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Descrição (opcional)</label>
                <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Ideal para quem vai ao salão todo mês"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-2">Serviços incluídos</label>
                <div className="space-y-2">
                  {itens.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input value={item.servico_nome} onChange={e => updateItem(i, 'servico_nome', e.target.value)}
                        placeholder="Ex: Corte feminino"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                      <input value={item.quantidade} onChange={e => updateItem(i, 'quantidade', parseInt(e.target.value) || 1)}
                        type="number" min="1" max="99"
                        className="w-16 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400 text-center" />
                      <span className="text-xs text-gray-400">x/mês</span>
                      {itens.length > 1 && (
                        <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addItem} className="mt-2 text-sm text-emerald-600 hover:text-emerald-700">
                  + Adicionar serviço
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={salvarPacote} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors">
                  {editando ? 'Salvar alterações' : 'Criar pacote'}
                </button>
                <button onClick={cancelar} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {pacotes.length === 0 && !formulario ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <p className="text-gray-400 text-sm">Nenhum pacote criado ainda</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pacotes.map(p => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{p.nome}</h3>
                    {p.descricao && <p className="text-xs text-gray-400 mt-0.5">{p.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-600 font-medium">
                      R$ {parseFloat(p.preco_mensal).toFixed(2).replace('.', ',')}/mês
                    </span>
                    <button onClick={() => abrirEdicao(p)}
                      className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1">
                      Editar
                    </button>
                    <button onClick={() => excluirPacote(p.id)}
                      className="text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-200 rounded-lg px-3 py-1">
                      Excluir
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.pacote_itens?.map((item: any) => (
                    <span key={item.id} className="text-xs bg-gray-100 text-gray-600 rounded-full px-3 py-1">
                      {item.quantidade}x {item.servico_nome}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}