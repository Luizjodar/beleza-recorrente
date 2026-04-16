'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ConfiguracoesPage() {
  const router = useRouter()
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [nome, setNome] = useState('')
  const [slug, setSlug] = useState('')
  const [slugOriginal, setSlugOriginal] = useState('')
  const [cargo, setCargo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [cidade, setCidade] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [emailContato, setEmailContato] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase
        .from('saloes').select('*').eq('user_id', user.id).single()
      if (!salao) { router.push('/dashboard'); return }
      setSalaoId(salao.id)
      setNome(salao.nome || '')
      setSlug(salao.slug || '')
      setSlugOriginal(salao.slug || '')
      setCargo(salao.cargo || '')
      setDescricao(salao.descricao || '')
      setCidade(salao.cidade || '')
      setWhatsapp(salao.whatsapp || '')
      setEmailContato(salao.email_contato || '')
      setLoading(false)
    }
    init()
  }, [])

  function gerarSlug(valor: string) {
    return valor.toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '')
      .trim().replace(/\s+/g, '-')
  }

  function handleNome(valor: string) {
    setNome(valor)
    if (slug === slugOriginal) setSlug(gerarSlug(valor))
  }

  async function salvar() {
    if (!nome || !slug || !whatsapp) {
      setErro('Nome, link público e WhatsApp são obrigatórios.')
      return
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setErro('O link público só pode ter letras minúsculas, números e hífens.')
      return
    }
    if (slug !== slugOriginal) {
      const { data: existente } = await supabase
        .from('saloes').select('id').eq('slug', slug).neq('id', salaoId).single()
      if (existente) { setErro('Este link já está em uso. Escolha outro.'); return }
    }
    setSalvando(true)
    setErro('')
    const { error } = await supabase.from('saloes').update({
      nome, slug, cargo, descricao, cidade, whatsapp, email_contato: emailContato,
    }).eq('id', salaoId)
    if (error) {
      setErro('Erro ao salvar. Tente novamente.')
    } else {
      setSlugOriginal(slug)
      setSucesso(true)
      setTimeout(() => setSucesso(false), 3000)
    }
    setSalvando(false)
  }

  const nav = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Pacotes', path: '/pacotes' },
    { label: 'Assinantes', path: '/assinantes' },
    { label: 'Promocoes', path: '/promocoes' },
    { label: 'Configuracoes', path: '/configuracoes' },
  ]

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Carregando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500" />
          <span className="font-medium text-gray-900">Beleza Recorrente</span>
        </div>
        <div className="flex items-center gap-1">
          {nav.map(item => (
            <button key={item.path} onClick={() => router.push(item.path)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                item.path === '/configuracoes'
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}>
              {item.label}
            </button>
          ))}
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
            className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1.5 ml-2">
            Sair
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-medium text-gray-900">Configuracoes do salao</h1>
          <p className="text-sm text-gray-400 mt-1">Informacoes exibidas na sua pagina publica</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

          <div className="px-6 py-5 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Identidade</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1.5">Nome do salao</label>
                <input value={nome} onChange={e => handleNome(e.target.value)}
                  placeholder="Ex: Marcelo Rissato"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1.5">Cargo</label>
                <input value={cargo} onChange={e => setCargo(e.target.value)}
                  placeholder="Ex: Hair Designer"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1.5">Descricao</label>
                <input value={descricao} onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Planos de assinatura exclusivos"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1.5">Cidade</label>
                <input value={cidade} onChange={e => setCidade(e.target.value)}
                  placeholder="Ex: Piracicaba, SP"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
              </div>
            </div>
          </div>

          <div className="px-6 py-5 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Link publico</p>
            <div>
              <label className="text-sm text-gray-600 block mb-1.5">Endereco da sua pagina</label>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-emerald-400">
                <span className="bg-gray-50 px-3 py-2 text-sm text-gray-400 border-r border-gray-200 whitespace-nowrap">
                  beleza-recorrente.vercel.app/s/
                </span>
                <input value={slug} onChange={e => setSlug(gerarSlug(e.target.value))}
                  placeholder="meu-salao"
                  className="flex-1 px-3 py-2 text-sm outline-none bg-white" />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">So letras minusculas, numeros e hifens.</p>
            </div>
            {slug && (
              <div className="mt-3 flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-400">Seu link:</span>
                <span className="text-xs text-emerald-600 font-medium">
                  beleza-recorrente.vercel.app/s/{slug}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://beleza-recorrente.vercel.app/s/' + slug)
                    setSucesso(true)
                    setTimeout(() => setSucesso(false), 2000)
                  }}
                  className="ml-auto text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-0.5">
                  Copiar
                </button>
              </div>
            )}
          </div>

          <div className="px-6 py-5 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Contato</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1.5">WhatsApp</label>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-emerald-400">
                  <span className="bg-gray-50 px-3 py-2 text-sm text-gray-400 border-r border-gray-200">+</span>
                  <input value={whatsapp} onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                    placeholder="5519999999999"
                    className="flex-1 px-3 py-2 text-sm outline-none bg-white" />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Codigo do pais + DDD + numero. Ex: 5519999999999</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1.5">Email para notificacoes</label>
                <input value={emailContato} onChange={e => setEmailContato(e.target.value)}
                  placeholder="seu@email.com" type="email"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400" />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              {erro && <p className="text-sm text-red-500">{erro}</p>}
              {sucesso && <p className="text-sm text-emerald-600">Salvo com sucesso!</p>}
            </div>
            <button onClick={salvar} disabled={salvando}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg px-6 py-2 text-sm font-medium transition-colors">
              {salvando ? 'Salvando...' : 'Salvar alteracoes'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mt-6">
          <div className="px-6 py-5">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Conta</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Sair da conta</p>
                <p className="text-xs text-gray-400 mt-0.5">Voce sera redirecionado para o login</p>
              </div>
              <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))}
                className="text-sm text-red-400 hover:text-red-600 border border-red-100 hover:border-red-200 rounded-lg px-4 py-2 transition-colors">
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
