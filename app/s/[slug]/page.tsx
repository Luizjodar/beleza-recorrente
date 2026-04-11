'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useParams } from 'next/navigation'

export default function PaginaPublica() {
  const { slug } = useParams()
  const [salao, setSalao] = useState<any>(null)
  const [pacotes, setPacotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pacoteSelecionado, setPacoteSelecionado] = useState<any>(null)
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    async function init() {
      const { data: salaoData } = await supabase
        .from('saloes').select('*').eq('slug', slug).single()

      if (!salaoData) { setLoading(false); return }
      setSalao(salaoData)

      const { data: pacotesData } = await supabase
        .from('pacotes')
        .select('*, pacote_itens(*)')
        .eq('salao_id', salaoData.id)
        .eq('ativo', true)
        .order('preco_mensal', { ascending: true })

      setPacotes(pacotesData || [])
      setLoading(false)
    }
    init()
  }, [slug])
async function assinar() {
  if (!nome || !whatsapp || !pacoteSelecionado) return
  setEnviando(true)

  const { data } = await supabase.from('assinantes').insert({
    salao_id: salao.id,
    pacote_id: pacoteSelecionado.id,
    nome,
    whatsapp,
    email,
    data_inicio: new Date().toISOString().split('T')[0],
  }).select().single()

  if (data) {
    await supabase.rpc('gerar_saldo_mensal', {
      p_assinante_id: data.id,
      p_mes: new Date().toISOString().split('T')[0],
    })

    await fetch('/api/notificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nomeCliente: nome,
        emailCliente: email,
        nomePlano: pacoteSelecionado.nome,
        preco: parseFloat(pacoteSelecionado.preco_mensal).toFixed(0),
        emailSalao: 'luisjodar00@gmail.com',
        nomeSalao: salao.nome,
        whatsappCliente: whatsapp,
      }),
    })

    setSucesso(true)
  }
  setEnviando(false)
}
 
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Carregando...</p>
    </div>
  )

  if (!salao) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Salão não encontrado</p>
    </div>
  )

  if (sucesso) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Assinatura confirmada!</h2>
        <p className="text-sm text-gray-500 mb-1">Olá, <strong>{nome}</strong>!</p>
        <p className="text-sm text-gray-500">
          Você assinou o <strong>{pacoteSelecionado.nome}</strong> do {salao.nome}. Em breve entrarão em contato pelo WhatsApp.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-6 text-center">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 mx-auto mb-3" />
        <h1 className="text-xl font-medium text-gray-900">{salao.nome}</h1>
        {salao.cidade && <p className="text-sm text-gray-400 mt-1">{salao.cidade}</p>}
        <p className="text-sm text-gray-500 mt-2">Escolha um plano de assinatura mensal</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {!pacoteSelecionado ? (
          <>
            <h2 className="text-sm font-medium text-gray-500 mb-4 text-center">Planos disponíveis</h2>
            <div className="space-y-3">
              {pacotes.map(p => (
                <div key={p.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-emerald-300 transition-colors"
                  onClick={() => setPacoteSelecionado(p)}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{p.nome}</h3>
                      {p.descricao && <p className="text-xs text-gray-400 mt-0.5">{p.descricao}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-medium text-emerald-600">
                        R$ {parseFloat(p.preco_mensal).toFixed(0)}
                      </p>
                      <p className="text-xs text-gray-400">por mês</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {p.pacote_itens?.map((item: any) => (
                      <span key={item.id} className="text-xs bg-emerald-50 text-emerald-700 rounded-full px-3 py-1">
                        {item.quantidade}x {item.servico_nome}
                      </span>
                    ))}
                  </div>
                  <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors">
                    Assinar este plano
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md mx-auto">
            <button onClick={() => setPacoteSelecionado(null)}
              className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
              ← Voltar
            </button>

            <div className="bg-emerald-50 rounded-lg px-4 py-3 mb-6">
              <p className="text-xs text-emerald-600 mb-0.5">Plano selecionado</p>
              <p className="font-medium text-emerald-800">{pacoteSelecionado.nome}</p>
              <p className="text-sm text-emerald-700">
                R$ {parseFloat(pacoteSelecionado.preco_mensal).toFixed(0)}/mês
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Seu nome</label>
                <input value={nome} onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Ana Paula"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">WhatsApp</label>
                <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                  placeholder="5519999999999"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Email (opcional)</label>
                <input value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-emerald-400" />
              </div>
              <button onClick={assinar} disabled={enviando || !nome || !whatsapp}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg py-3 text-sm font-medium transition-colors mt-2">
                {enviando ? 'Confirmando...' : 'Confirmar assinatura'}
              </button>
              <p className="text-xs text-gray-400 text-center">
                O pagamento será combinado diretamente com o salão
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}