'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [modo, setModo] = useState<'login' | 'cadastro'>('login')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setErro('')
    setLoading(true)

    if (modo === 'cadastro') {
      const { error } = await supabase.auth.signUp({ email, password: senha })
      if (error) { setErro(error.message); setLoading(false); return }
      setErro('Verifique seu email para confirmar o cadastro!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) { setErro('Email ou senha incorretos'); setLoading(false); return }
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-md">

        <div className="mb-8">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 mb-4" />
          <h1 className="text-2xl font-medium text-gray-900">Beleza Recorrente</h1>
          <p className="text-gray-500 text-sm mt-1">
            {modo === 'login' ? 'Entre na sua conta' : 'Crie sua conta grátis'}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
          </div>

          {erro && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar conta'}
          </button>

          <button
            onClick={() => setModo(modo === 'login' ? 'cadastro' : 'login')}
            className="w-full text-sm text-gray-500 hover:text-gray-700"
          >
            {modo === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
          </button>
        </div>
      </div>
    </div>
  )
}