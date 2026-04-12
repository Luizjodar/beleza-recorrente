'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function PromocoesPage() {
  const router = useRouter()
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [promocoes, setPromocoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<any | null>(null)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [precoOriginal, setPrecoOriginal] = useState('')
  const [precoPromo, setPrecoPromo] = useState('')
  const [dataFim, setDataFim] = useState('')

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
  }, [])

  async function carregar(id: string) {
    const { data } = await supabase.from('promocoes')
      .select('*').eq('salao_id', id)
      .order('criado_em', { ascending: false })
    setPromocoes(data || [])
  }

  function cancelar() {
    setCriando(false); setEditando(null)
    setTitulo(''); setDescricao(''); setPrecoOriginal(''); setPrecoPromo(''); setDataFim('')
  }

  function abrirEdicao(p: any) {
    setEditando(p); setTitulo(p.titulo); setDescricao(p.descricao || '')
    setPrecoOriginal(p.preco_original?.toString() || '')
    setPrecoPromo(p.preco_promo.toString())
    setDataFim(p.data_fim); setCriando(false)
  }

  async function salvar() {
    if (!titulo || !precoPromo || !dataFim || !salaoId) return
    const payload = {
      salao_id: salaoId,
      titulo, descricao,
      preco_original: precoOriginal ? parseFloat(precoOriginal) : null,
      preco_promo: parseFloat(precoPromo),
      data_fim: dataFim,
    }
    if (editando) {
      await supabase.from('promocoes').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('promocoes').insert(payload)
    }
    await carregar(salaoId)
    cancelar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esta promoção?')) return
    await supabase.from('promocoes').delete().eq('id', id)
    setPromocoes(promocoes.filter(p => p.id !== id))
  }

  async function toggleAtivo(p: any) {
    await supabase.from('promocoes').update({ ativo: !p.ativo }).eq('id', p.id)
    setPromocoes(promocoes.map(x => x.id === p.id ? { ...x, ativo: !x.ativo } : x))
  }

  const hoje = new Date().toISOString().split('T')[0]
  const ativas = promocoes.filter(p => p.ativo && p.data_fim >= hoje)
  const expiradas = promocoes.filter(p => !p.ativo || p.data_fim < hoje)
  const formulario = criando || editando

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
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-gray-700">Dashboard</button>
          <button onClick={() => router.push('/pacotes')} className="text-sm text-gray-500 hover:text-gray-700">Pacotes</button>
          <button onClick={() => router.push('/assinantes')} className="text-sm text-gray-500 hover:text-gray-700">Assinantes</button>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-sm text-gray-500 hover:text-gray-700">Sair</button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-medium text-gray-900">Promoções</h1>
          {!formulario && (
            <button onClick={() => setCriando(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
              + Nova promoção
            </button>
          )}
        </div>

        {formulario && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="text-base font-medium text-gray-900 mb-4">
              {editando ? 'Editando promoção' : 'Nova promoção'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Título da promoção</label>
                <input value={titulo} onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Escova + Hidratação especial"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Descrição (opcional)</label>
                <input value={descricao} onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Inclui escova modeladora e hidratação profunda"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Preço original (R$)</label>
                  <input value={precoOriginal} onChange={e => setPrecoOriginal(e.target.value)}
                    placeholder="Ex: 350" type="number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Preço promocional (R$)</label>
                  <input value={precoPromo} onChange={e => setPrecoPromo(e.target.value)}
                    placeholder="Ex: 250" type="number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Válida até</label>
                  <input value={dataFim} onChange={e => setDataFim(e.target.value)}
                    type="date" min={hoje}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={salvar}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors">
                  {editando ? 'Salvar alterações' : 'Criar promoção'}
                </button>
                <button onClick={cancelar} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {ativas.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Ativas agora</p>
            <div className="space-y-3">
              {ativas.map(p => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Ativa</span>
                        <span className="text-xs text-gray-400">até {new Date(p.data_fim).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <h3 className="font-medium text-gray-900">{p.titulo}</h3>
                      {p.descricao && <p className="text-xs text-gray-400 mt-1">{p.descricao}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        {p.preco_original && (
                          <span className="text-sm text-gray-400 line-through">R$ {parseFloat(p.preco_original).toFixed(0)}</span>
                        )}
                        <span className="text-lg font-medium text-emerald-600">R$ {parseFloat(p.preco_promo).toFixed(0)}</span>
                        {p.preco_original && (
                          <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                            -{Math.round((1 - p.preco_promo / p.preco_original) * 100)}% off
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button onClick={() => toggleAtivo(p)} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1">Pausar</button>
                      <button onClick={() => abrirEdicao(p)} className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1">Editar</button>
                      <button onClick={() => excluir(p.id)} className="text-xs text-red-400 hover:text-red-600 border border-red-100 rounded-lg px-3 py-1">Excluir</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {expiradas.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Expiradas / Pausadas</p>
            <div className="space-y-3">
              {expiradas.map(p => (
                <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 opacity-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p.data_fim < hoje ? 'Expirada' : 'Pausada'}</span>
                      </div>
                      <h3 className="font-medium text-gray-900">{p.titulo}</h3>
                      <span className="text-sm text-gray-600">R$ {parseFloat(p.preco_promo).toFixed(0)}</span>
                    </div>
                    <button onClick={() => excluir(p.id)} className="text-xs text-red-400 hover:text-red-600 border border-red-100 rounded-lg px-3 py-1">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {promocoes.length === 0 && !formulario && (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <p className="text-gray-400 text-sm mb-3">Nenhuma promoção criada ainda</p>
            <button onClick={() => setCriando(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
              Criar primeira promoção
            </button>
          </div>
        )}
      </div>
    </div>
  )
}