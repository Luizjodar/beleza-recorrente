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
    <div style={{ minHeight: '100vh', background: '#f7f6f3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: 820, borderRadius: 20, overflow: 'hidden', border: '0.5px solid #e8e6e0', boxShadow: '0 8px 40px rgba(0,0,0,0.06)' }}>

        {/* Painel esquerdo */}
        <div style={{ flex: 1, background: '#111', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: 32, height: 32, border: '1.5px solid #333', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 40 }}>
              <div style={{ width: 12, height: 12, background: '#fff', borderRadius: 2 }} />
            </div>
            <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 300, letterSpacing: -0.5, margin: '0 0 12px', fontFamily: 'Georgia, serif', lineHeight: 1.4 }}>
              Gerencie seu salao com inteligencia
            </h2>
            <p style={{ color: '#666', fontSize: 13, margin: 0, lineHeight: 1.7 }}>
              Assinaturas, pagamentos e clientes — tudo em um so lugar.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['Controle total de assinantes', 'Pagamentos automatizados', 'Retencao via WhatsApp'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 6, height: 6, background: '#444', borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ color: '#555', fontSize: 12, letterSpacing: 0.3 }}>{item}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, paddingTop: 20, borderTop: '0.5px solid #222' }}>
              <span style={{ fontSize: 10, color: '#333', letterSpacing: 3, textTransform: 'uppercase' }}>Beleza Recorrente</span>
            </div>
          </div>
        </div>

        {/* Painel direito */}
        <div style={{ flex: 1, background: '#fff', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 22, fontWeight: 400, color: '#111', margin: '0 0 6px', letterSpacing: -0.3 }}>
              {modo === 'login' ? 'Entrar na conta' : 'Criar conta'}
            </h1>
            <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>
              {modo === 'login' ? 'Bem-vindo de volta' : 'Comece gratuitamente'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 10, letterSpacing: 2, color: '#bbb', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                style={{ width: '100%', border: '0.5px solid #e5e3de', borderRadius: 10, padding: '11px 14px', background: '#fafaf9', fontSize: 13, color: '#111', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, letterSpacing: 2, color: '#bbb', textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ width: '100%', border: '0.5px solid #e5e3de', borderRadius: 10, padding: '11px 14px', background: '#fafaf9', fontSize: 13, color: '#111', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {erro && (
            <p style={{ fontSize: 12, color: erro.includes('Verifique') ? '#059669' : '#dc2626', background: erro.includes('Verifique') ? '#f0fdf4' : '#fef2f2', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
              {erro}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: '100%', background: loading ? '#999' : '#111', color: '#fff', border: 'none', borderRadius: 10, padding: 13, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer', transition: 'background 0.2s' }}
          >
            {loading ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Criar conta'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#ccc', marginTop: 20 }}>
            {modo === 'login' ? 'Nao tem conta? ' : 'Ja tem conta? '}
            <span
              onClick={() => { setModo(modo === 'login' ? 'cadastro' : 'login'); setErro('') }}
              style={{ color: '#111', textDecoration: 'underline', cursor: 'pointer' }}
            >
              {modo === 'login' ? 'Cadastre-se' : 'Entre'}
            </span>
          </p>
        </div>

      </div>
    </div>
  )
}
