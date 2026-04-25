'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '../../lib/tema'
import Navbar from '../../components/Navbar'

const DIAS_FULL = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']

export default function HorariosPage() {
  const router = useRouter()
  const { t } = useTema()
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const [horarios, setHorarios] = useState(
    Array.from({ length: 7 }, (_, i) => ({
      dia_semana: i,
      ativo: i >= 1 && i <= 6, // Seg a Sab por padrao
      hora_inicio: '09:00',
      hora_fim: '18:00',
      intervalo_min: 60,
    }))
  )

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) { router.push('/dashboard'); return }
      setSalaoId(salao.id)

      const { data: horariosExistentes } = await supabase
        .from('horarios_salao').select('*').eq('salao_id', salao.id)

      if (horariosExistentes && horariosExistentes.length > 0) {
        setHorarios(Array.from({ length: 7 }, (_, i) => {
          const h = horariosExistentes.find(x => x.dia_semana === i)
          return h ? { dia_semana: i, ativo: h.ativo, hora_inicio: h.hora_inicio, hora_fim: h.hora_fim, intervalo_min: h.intervalo_min } :
            { dia_semana: i, ativo: i >= 1 && i <= 6, hora_inicio: '09:00', hora_fim: '18:00', intervalo_min: 60 }
        }))
      }
      setLoading(false)
    }
    init()
  }, [])

  function atualizar(dia: number, campo: string, valor: any) {
    setHorarios(horarios.map(h => h.dia_semana === dia ? { ...h, [campo]: valor } : h))
  }

  async function salvar() {
    if (!salaoId) return
    setSalvando(true)

    await supabase.from('horarios_salao').delete().eq('salao_id', salaoId)
    await supabase.from('horarios_salao').insert(
      horarios.map(h => ({ ...h, salao_id: salaoId }))
    )

    setSucesso(true)
    setTimeout(() => setSucesso(false), 3000)
    setSalvando(false)
  }

  const inputStyle = { border: `0.5px solid ${t.border}`, borderRadius: 8, padding: '8px 10px', background: t.bgInput, fontSize: 12, color: t.text, outline: 'none' }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textFaint, fontSize: 12, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: 32 }}>
          <button onClick={() => router.push('/agenda')}
            style={{ background: 'none', border: 'none', color: t.textMuted, fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
            ← Voltar para agenda
          </button>
          <p style={{ color: t.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 6px' }}>Agenda</p>
          <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Horarios de atendimento</h1>
          <p style={{ color: t.textMuted, fontSize: 13, marginTop: 8 }}>Configure os dias e horarios que seu salao atende</p>
        </div>

        <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, overflow: 'hidden', marginBottom: 20 }}>
          {horarios.map((h, i) => (
            <div key={i} style={{ padding: '16px 24px', borderBottom: i < 6 ? `0.5px solid ${t.rowBorder}` : 'none', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

              {/* Toggle ativo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
                <div onClick={() => atualizar(i, 'ativo', !h.ativo)}
                  style={{ width: 36, height: 20, borderRadius: 10, background: h.ativo ? t.text : t.border, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: h.ativo ? 18 : 2, transition: 'left 0.2s' }} />
                </div>
                <span style={{ color: h.ativo ? t.text : t.textFaint, fontSize: 13, fontWeight: h.ativo ? 500 : 400 }}>
                  {DIAS_FULL[i]}
                </span>
              </div>

              {h.ativo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                  <input type="time" value={h.hora_inicio} onChange={e => atualizar(i, 'hora_inicio', e.target.value)} style={inputStyle} />
                  <span style={{ color: t.textFaint, fontSize: 12 }}>ate</span>
                  <input type="time" value={h.hora_fim} onChange={e => atualizar(i, 'hora_fim', e.target.value)} style={inputStyle} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: t.textFaint, fontSize: 11 }}>intervalo:</span>
                    <select value={h.intervalo_min} onChange={e => atualizar(i, 'intervalo_min', parseInt(e.target.value))}
                      style={{ ...inputStyle, appearance: 'none' as const }}>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1h</option>
                      <option value={90}>1h30</option>
                      <option value={120}>2h</option>
                    </select>
                  </div>
                </div>
              ) : (
                <span style={{ color: t.textFaint, fontSize: 12 }}>Fechado</span>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {sucesso && <p style={{ color: '#16a34a', fontSize: 13, margin: 0 }}>Salvo com sucesso!</p>}
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={salvar} disabled={salvando}
              style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 10, padding: '11px 28px', fontSize: 12, cursor: 'pointer', opacity: salvando ? 0.5 : 1 }}>
              {salvando ? 'Salvando...' : 'Salvar horarios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
