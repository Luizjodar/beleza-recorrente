'use client'

import { useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    async function confirmar() {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Verifica se salao ja esta configurado
        const { data: salao } = await supabase
          .from('saloes').select('nome, whatsapp').eq('user_id', user.id).single()

        if (!salao || !salao.whatsapp || !salao.nome) {
          router.push('/onboarding')
        } else {
          router.push('/dashboard')
        }
      } else {
        router.push('/login')
      }
    }
    confirmar()
  }, [router])

  return (
    <div style={{ minHeight: '100vh', background: '#f7f6f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#888', fontSize: 13, letterSpacing: 2 }}>CONFIRMANDO CONTA...</p>
      </div>
    </div>
  )
}
