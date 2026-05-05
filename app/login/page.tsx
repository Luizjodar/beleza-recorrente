'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'
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
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) { setErro('Email ou senha incorretos'); setLoading(false); return }

    const { data: salao } = await supabase
      .from('saloes').select('nome, whatsapp').eq('user_id', data.user.id).single()

    if (!salao || !salao.whatsapp || !salao.nome) {
      router.push('/onboarding')
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .login-left { display: none !important; }
          .login-right { border-radius: 0 !important; min-height: 100vh !important; padding: 48px 28px !important; }
          .login-wrap { border-radius: 0 !important; box-shadow: none !important; border: none !important; min-height: 100vh !important; }
        }
      `}</style>
      <div style={{ minHeight: '100vh', background: '#f7f6f3', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="login-wrap" style={{ display: 'flex', width: '100%', maxWidth: 960, minHeight: 580, borderRadius: 24, overflow: 'hidden', border: '0.5px solid #e8e6e0', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>

          {/* Painel esquerdo — esconde no mobile */}
          <div className="login-left" style={{ flex: 1, background: '#111', padding: '56px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ width: 36, height: 36, border: '1.5px solid #333', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 48 }}>
                <div style={{ width: 14, height: 14, background: '#fff', borderRadius: 3 }} />
              </div>
              <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 300, letterSpacing: -0.5, margin: '0 0 16px', fontFamily: 'Georgia, serif', lineHeight: 1.4 }}>
                Gerencie seu salao com inteligencia
              </h2>
              <p style={{ color: '#888', fontSize: 15, margin: 0, lineHeight: 1.8 }}>
                Assinaturas, pagamentos e clientes — tudo em um so lugar.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {['Controle total de assinantes', 'Pagamentos automatizados', 'Retencao via WhatsApp'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 7, height: 7, background: '#444', borderRadius: '50%', flexShrink: 0 }} />
                  <span style={{ color: '#777', fontSize: 14 }}>{item}</span>
                </div>
              ))}
              <div style={{ marginTop: 8, paddingTop: 24, borderTop: '0.5px solid #222' }}>
                <span style={{ fontSize: 11, color: '#444', letterSpacing: 4, textTransform: 'uppercase' }}>Beleza Recorrente</span>
              </div>
            </div>
          </div>

          {/* Painel direito */}
          <div className="login-right" style={{ flex: 1, background: '#fff', padding: '56px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ marginBottom: 36 }}>
              <div style={{ width: 32, height: 32, background: '#111', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <div style={{ width: 11, height: 11, background: '#fff', borderRadius: 2 }} />
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 400, color: '#111', margin: '0 0 8px', letterSpacing: -0.5 }}>
                {modo === 'login' ? 'Entrar na conta' : 'Criar conta'}
              </h1>
              <p style={{ fontSize: 14, color: '#555', margin: 0 }}>
                {modo === 'login' ? 'Bem-vindo de volta' : 'Comece gratuitamente'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24 }}>
              <div>
                <label style={{ fontSize: 11, letterSpacing: 2, color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  style={{ width: '100%', border: '0.5px solid #e0deda', borderRadius: 10, padding: '13px 16px', background: '#fafaf9', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, letterSpacing: 2, color: '#999', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Senha</label>
                <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  style={{ width: '100%', border: '0.5px solid #e0deda', borderRadius: 10, padding: '13px 16px', background: '#fafaf9', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {erro && (
              <p style={{ fontSize: 13, color: erro.includes('Verifique') ? '#059669' : '#dc2626', background: erro.includes('Verifique') ? '#f0fdf4' : '#fef2f2', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
                {erro}
              </p>
            )}

            <button onClick={handleSubmit} disabled={loading}
              style={{ width: '100%', background: loading ? '#999' : '#111', color: '#fff', border: 'none', borderRadius: 10, padding: 15, fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', cursor: 'pointer' }}>
              {loading ? 'AGUARDE...' : modo === 'login' ? 'ENTRAR' : 'CRIAR CONTA'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#555', marginTop: 24 }}>
              {modo === 'login' ? 'Nao tem conta? ' : 'Ja tem conta? '}
              <span onClick={() => { setModo(modo === 'login' ? 'cadastro' : 'login'); setErro('') }}
                style={{ color: '#111', textDecoration: 'underline', cursor: 'pointer', fontWeight: 500 }}>
                {modo === 'login' ? 'Cadastre-se' : 'Entre'}
              </span>
            </p>
          </div>

        </div>
      </div>
    </>
  )
}
