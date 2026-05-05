'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '@/app/lib/tema'
import Layout from '../components/Layout'

type Pacote = { id: string; nome: string; preco_mensal: number }
type Assinante = {
  id: string
  nome: string
  whatsapp: string
  email?: string
  status: 'ativo' | 'cancelado' | 'inadimplente' | 'pausado'
  data_inicio?: string
  pacote_id: string
  pacotes?: Pacote
}
type Saldo = {
  id: string
  assinante_id: string
  servico_nome: string
  quantidade_total: number
  quantidade_usada: number
  mes_referencia: string
}

export default function AssinantesPage() {
  const router = useRouter()
  const { t } = useTema()
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [assinantes, setAssinantes] = useState<Assinante[]>([])
  const [pacotes, setPacotes] = useState<Pacote[]>([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [saldoAberto, setSaldoAberto] = useState<string | null>(null)
  const [saldos, setSaldos] = useState<Saldo[]>([])
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [pacoteId, setPacoteId] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) { router.push('/dashboard'); return }
      setSalaoId(salao.id)
      const [{ data: ass }, { data: pacs }] = await Promise.all([
        supabase.from('assinantes').select('*, pacotes(nome, preco_mensal)').eq('salao_id', salao.id).order('criado_em', { ascending: false }),
        supabase.from('pacotes').select('id, nome, preco_mensal').eq('salao_id', salao.id).eq('ativo', true),
      ])
      setAssinantes((ass as Assinante[]) || [])
      setPacotes((pacs as Pacote[]) || [])
      setLoading(false)
    }
    init()
  }, [router])

  async function salvarAssinante() {
    if (!nome || !whatsapp || !pacoteId || !salaoId) return
    const { data } = await supabase.from('assinantes').insert({
      salao_id: salaoId, pacote_id: pacoteId, nome, whatsapp, email,
      data_inicio: new Date().toISOString().split('T')[0],
    }).select('*, pacotes(nome, preco_mensal)').single()
    if (data) {
      await supabase.rpc('gerar_saldo_mensal', { p_assinante_id: data.id, p_mes: new Date().toISOString().split('T')[0] })
      setAssinantes([data as Assinante, ...assinantes])
    }
    setNome(''); setWhatsapp(''); setEmail(''); setPacoteId('')
    setCriando(false)
  }

  async function abrirSaldo(assinanteId: string) {
    if (saldoAberto === assinanteId) { setSaldoAberto(null); return }
    const mes = new Date().toISOString().slice(0, 7) + '-01'
    const { data } = await supabase.from('saldo_mensal').select('*').eq('assinante_id', assinanteId).eq('mes_referencia', mes)
    setSaldos((data as Saldo[]) || [])
    setSaldoAberto(assinanteId)
  }

  async function marcarUso(saldo: Saldo) {
    if (saldo.quantidade_usada >= saldo.quantidade_total) return
    await supabase.from('usos').insert({ saldo_id: saldo.id, assinante_id: saldo.assinante_id, servico_nome: saldo.servico_nome })
    setSaldos(saldos.map(s => s.id === saldo.id ? { ...s, quantidade_usada: s.quantidade_usada + 1 } : s))
  }

  const statusBg: Record<string, string> = { ativo: t.badgeAtivo, cancelado: t.badgeCancelado, inadimplente: t.badgeInadimplente, pausado: t.badgePausado }
  const statusText: Record<string, string> = { ativo: t.badgeAtivoText, cancelado: t.badgeCanceladoText, inadimplente: t.badgeInadimplenteText, pausado: t.badgePausadoText }

  const inputStyle = { width: '100%', border: `0.5px solid ${t.border}`, borderRadius: 10, padding: '11px 14px', background: t.bgInput, fontSize: 13, color: t.text, outline: 'none', boxSizing: 'border-box' as const }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textFaint, fontSize: 12, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )

  return (
    <Layout>
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
<div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: t.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 6px' }}>Gestao</p>
            <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Assinantes</h1>
          </div>
          <button onClick={() => setCriando(true)}
            style={{ background: t.text, color: t.navBg, border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 12, cursor: 'pointer' }}>
            + Novo assinante
          </button>
        </div>

        {criando && (
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '28px 32px', marginBottom: 20 }}>
            <h2 style={{ color: t.text, fontSize: 16, fontWeight: 400, margin: '0 0 20px' }}>Novo assinante</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Nome</label>
                  <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Ana Paula" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>WhatsApp</label>
                  <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="5519999999999" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Email (opcional)</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="ana@email.com" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Pacote</label>
                  <select value={pacoteId} onChange={e => setPacoteId(e.target.value)}
                    style={{ ...inputStyle, appearance: 'none' as const }}>
                    <option value="">Selecione...</option>
                    {pacotes.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} — R$ {p.preco_mensal.toFixed(0)}/mes</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={salvarAssinante}
                  style={{ background: t.text, color: t.navBg, border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 12, cursor: 'pointer' }}>
                  Salvar
                </button>
                <button onClick={() => setCriando(false)}
                  style={{ background: 'none', border: 'none', color: t.textMuted, fontSize: 13, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {assinantes.length === 0 && !criando ? (
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: 48, textAlign: 'center' }}>
            <p style={{ color: t.textFaint, fontSize: 13 }}>Nenhum assinante ainda</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {assinantes.map(a => (
              <div key={a.id} style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, overflow: 'hidden' }}>
                <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text, fontSize: 13, fontWeight: 500 }}>
                      {a.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ color: t.text, fontSize: 14, margin: '0 0 2px', fontWeight: 400 }}>{a.nome}</p>
                      <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{a.pacotes?.nome} · R$ {(a.pacotes?.preco_mensal ?? 0).toFixed(0)}/mes</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: statusBg[a.status], color: statusText[a.status], fontSize: 10, padding: '3px 10px', borderRadius: 20 }}>
                      {a.status}
                    </span>
                    <button onClick={() => abrirSaldo(a.id)}
                      style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>
                      {saldoAberto === a.id ? 'Fechar' : 'Ver saldo'}
                    </button>
                  </div>
                </div>

                {saldoAberto === a.id && (
                  <div style={{ borderTop: `0.5px solid ${t.rowBorder}`, padding: '16px 24px', background: t.bg }}>
                    <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Saldo do mes atual</p>
                    {saldos.length === 0 ? (
                      <p style={{ color: t.textFaint, fontSize: 12 }}>Nenhum saldo gerado ainda</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {saldos.map(s => (
                          <div key={s.id} style={{ background: t.bgCard, border: `0.5px solid ${t.border}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <p style={{ color: t.text, fontSize: 13, margin: '0 0 2px' }}>{s.servico_nome}</p>
                              <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{s.quantidade_usada} de {s.quantidade_total} usados</p>
                            </div>
                            <button onClick={() => marcarUso(s)} disabled={s.quantidade_usada >= s.quantidade_total}
                              style={{ background: s.quantidade_usada >= s.quantidade_total ? t.bg : t.text, color: s.quantidade_usada >= s.quantidade_total ? t.textFaint : t.navBg, border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 11, cursor: 'pointer' }}>
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
  </Layout>
  )
}
