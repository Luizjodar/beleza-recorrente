'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function AssinantesPage() {
  const router = useRouter()
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [assinantes, setAssinantes] = useState<any[]>([])
  const [pacotes, setPacotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [saldoAberto, setSaldoAberto] = useState<string | null>(null)
  const [saldos, setSaldos] = useState<any[]>([])

  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [pacoteId, setPacoteId] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: salao } = await supabase
        .from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) { router.push('/dashboard'); return }

      setSalaoId(salao.id)

      const [{ data: ass }, { data: pacs }] = await Promise.all([
        supabase.from('assinantes')
          .select('*, pacotes(nome, preco_mensal)')
          .eq('salao_id', salao.id)
          .order('criado_em', { ascending: false }),
        supabase.from('pacotes')
          .select('id, nome, preco_mensal')
          .eq('salao_id', salao.id)
          .eq('ativo', true)
      ])

      setAssinantes(ass || [])
      setPacotes(pacs || [])
      setLoading(false)
    }
    init()
  }, [])

  async function salvarAssinante() {
    if (!nome || !whatsapp || !pacoteId || !salaoId) return

    const { data } = await supabase.from('assinantes').insert({
      salao_id: salaoId,
      pacote_id: pacoteId,
      nome,
      whatsapp,
      email,
      data_inicio: new Date().toISOString().split('T')[0],
    }).select('*, pacotes(nome, preco_mensal)').single()

    if (data) {
      await supabase.rpc('gerar_saldo_mensal', {
        p_assinante_id: data.id,
        p_mes: new Date().toISOString().split('T')[0],
      })
      setAssinantes([data, ...assinantes])
    }

    setNome(''); setWhatsapp(''); setEmail(''); setPacoteId('')
    setCriando(false)
  }

  async function abrirSaldo(assinanteId: string) {
    if (saldoAberto === assinanteId) { setSaldoAberto(null); return }
    const mes = new Date().toISOString().slice(0, 7) + '-01'
    const { data } = await supabase.from('saldo_mensal')
      .select('*')
      .eq('assinante_id', assinanteId)
      .eq('mes_referencia', mes)
    setSaldos(data || [])
    setSaldoAberto(assinanteId)
  }

  async function marcarUso(saldo: any) {
    if (saldo.quantidade_usada >= saldo.quantidade_total) return
    await supabase.from('usos').insert({
      saldo_id: saldo.id,
      assinante_id: saldo.assinante_id,
      servico_nome: saldo.servico_nome,
    })
    setSaldos(saldos.map(s =>
      s.id === saldo.id ? { ...s, quantidade_usada: s.quantidade_usada + 1 } : s
    ))
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
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-gray-700">Dashboard</button>
          <button onClick={() => router.push('/pacotes')} className="text-sm text-gray-500 hover:text-gray-700">Pacotes</button>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-sm text-gray-500 hover:text-gray-700">Sair</button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-medium text-gray-900">Assinantes</h1>
          <button onClick={() => setCriando(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
            + Novo assinante
          </button>
        </div>

        {criando && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="text-base font-medium text-gray-900 mb-4">Novo assinante</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nome</label>
                  <input value={nome} onChange={e => setNome(e.target.value)}
                    placeholder="Ex: Ana Paula"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">WhatsApp</label>
                  <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                    placeholder="5519999999999"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Email (opcional)</label>
                  <input value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="ana@email.com"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Pacote</label>
                  <select value={pacoteId} onChange={e => setPacoteId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400 bg-white">
                    <option value="">Selecione...</option>
                    {pacotes.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nome} — R$ {parseFloat(p.preco_mensal).toFixed(0)}/mês
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={salvarAssinante}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors">
                  Salvar
                </button>
                <button onClick={() => setCriando(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {assinantes.length === 0 && !criando ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
            <p className="text-gray-400 text-sm">Nenhum assinante ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assinantes.map(a => (
              <div key={a.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-medium text-sm">
                      {a.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{a.nome}</p>
                      <p className="text-xs text-gray-400">{a.pacotes?.nome} · R$ {parseFloat(a.pacotes?.preco_mensal).toFixed(0)}/mês</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[a.status]}`}>
                      {a.status}
                    </span>
                    <button onClick={() => abrirSaldo(a.id)}
                      className="text-xs text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded-lg px-3 py-1">
                      {saldoAberto === a.id ? 'Fechar' : 'Ver saldo'}
                    </button>
                  </div>
                </div>

                {saldoAberto === a.id && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    <p className="text-xs text-gray-500 mb-3">Saldo do mês atual</p>
                    {saldos.length === 0 ? (
                      <p className="text-xs text-gray-400">Nenhum saldo gerado ainda</p>
                    ) : (
                      <div className="space-y-2">
                        {saldos.map(s => (
                          <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-gray-200">
                            <div>
                              <p className="text-sm text-gray-800">{s.servico_nome}</p>
                              <p className="text-xs text-gray-400">{s.quantidade_usada} de {s.quantidade_total} usados</p>
                            </div>
                            <button
                              onClick={() => marcarUso(s)}
                              disabled={s.quantidade_usada >= s.quantidade_total}
                              className="text-xs bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg px-3 py-1.5 transition-colors">
                              {s.quantidade_usada >= s.quantidade_total ? 'Esgotado' : 'Marcar uso'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}