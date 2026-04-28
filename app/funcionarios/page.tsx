'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '../lib/tema'
import Navbar from '../components/Navbar'

export default function FuncionariosPage() {
  const router = useRouter()
  const { t } = useTema()
  const [loading, setLoading] = useState(true)
  const [salaoId, setSalaoId] = useState<string | null>(null)
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<any | null>(null)
  const [salvando, setSalvando] = useState(false)

  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [comissao, setComissao] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) return
      setSalaoId(salao.id)
      await carregar(salao.id)
      setLoading(false)
    }
    init()
  }, [])

  async function carregar(id: string) {
    const { data } = await supabase.from('funcionarios').select('*').eq('salao_id', id).order('criado_em')
    setFuncionarios(data || [])
  }

  function abrir(f?: any) {
    if (f) {
      setEditando(f); setNome(f.nome); setCargo(f.cargo || '')
      setTelefone(f.telefone || ''); setEmail(f.email || '')
      setComissao(f.comissao_pct?.toString() || '0')
    } else {
      setEditando(null); setNome(''); setCargo('')
      setTelefone(''); setEmail(''); setComissao('0')
    }
    setCriando(true)
  }

  function cancelar() { setCriando(false); setEditando(null) }

  async function salvar() {
    if (!nome || !salaoId) return
    setSalvando(true)
    const payload = { salao_id: salaoId, nome, cargo, telefone, email, comissao_pct: parseFloat(comissao) || 0 }
    if (editando) {
      await supabase.from('funcionarios').update(payload).eq('id', editando.id)
    } else {
      await supabase.from('funcionarios').insert(payload)
    }
    await carregar(salaoId)
    cancelar()
    setSalvando(false)
  }

  async function toggleAtivo(f: any) {
    await supabase.from('funcionarios').update({ ativo: !f.ativo }).eq('id', f.id)
    setFuncionarios(funcionarios.map(x => x.id === f.id ? { ...x, ativo: !x.ativo } : x))
  }

  async function excluir(id: string) {
    if (!confirm('Excluir funcionario?')) return
    await supabase.from('funcionarios').delete().eq('id', id)
    setFuncionarios(funcionarios.filter(f => f.id !== id))
  }

  const inputStyle = { width: '100%', border: `0.5px solid ${t.border}`, borderRadius: 10, padding: '11px 14px', background: t.bgInput, fontSize: 13, color: t.text, outline: 'none', boxSizing: 'border-box' as const }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textFaint, fontSize: 12, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: 'system-ui, sans-serif' }}>
      <Navbar />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '36px 24px' }}>

        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p style={{ color: t.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 6px' }}>Gestao</p>
            <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Funcionarios</h1>
          </div>
          {!criando && (
            <button onClick={() => abrir()}
              style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
              + Novo funcionario
            </button>
          )}
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total', value: funcionarios.length, unit: 'funcionarios' },
            { label: 'Ativos', value: funcionarios.filter(f => f.ativo).length, unit: 'em atividade' },
            { label: 'Comissao media', value: `${(funcionarios.reduce((a, f) => a + parseFloat(f.comissao_pct || 0), 0) / Math.max(funcionarios.length, 1)).toFixed(0)}%`, unit: 'por servico' },
          ].map(card => (
            <div key={card.label} style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 16, padding: '18px 20px' }}>
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px' }}>{card.label}</p>
              <p style={{ color: t.text, fontSize: 28, fontWeight: 200, margin: '0 0 2px', lineHeight: 1 }}>{card.value}</p>
              <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{card.unit}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        {criando && (
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '28px 32px', marginBottom: 20 }}>
            <h2 style={{ color: t.text, fontSize: 16, fontWeight: 400, margin: '0 0 20px' }}>
              {editando ? `Editando: ${editando.nome}` : 'Novo funcionario'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Nome *</label>
                  <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Maria Silva" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Cargo</label>
                  <input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Ex: Cabeleireira, Manicure" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Telefone</label>
                  <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="5519..." style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@email.com" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 7 }}>Comissao (%)</label>
                  <input value={comissao} onChange={e => setComissao(e.target.value)} placeholder="Ex: 30" type="number" min="0" max="100" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={salvar} disabled={salvando || !nome}
                  style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 12, cursor: 'pointer', opacity: salvando ? 0.5 : 1 }}>
                  {salvando ? 'Salvando...' : editando ? 'Salvar alteracoes' : 'Adicionar funcionario'}
                </button>
                <button onClick={cancelar} style={{ background: 'none', border: 'none', color: t.textMuted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Lista */}
        {funcionarios.length === 0 && !criando ? (
          <div style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '48px', textAlign: 'center' }}>
            <p style={{ color: t.textFaint, fontSize: 13, marginBottom: 16 }}>Nenhum funcionario cadastrado</p>
            <button onClick={() => abrir()} style={{ background: t.text, color: t.bg, border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 12, cursor: 'pointer' }}>
              Adicionar primeiro funcionario
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {funcionarios.map(f => (
              <div key={f.id} style={{ background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 16, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: f.ativo ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.text, fontSize: 14, fontWeight: 500 }}>
                    {f.nome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: t.text, fontSize: 14, fontWeight: 400, margin: '0 0 2px' }}>{f.nome}</p>
                    <p style={{ color: t.textFaint, fontSize: 12, margin: 0 }}>
                      {f.cargo || 'Sem cargo'} {f.telefone ? `· ${f.telefone}` : ''}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: t.text, fontSize: 14, fontWeight: 300, margin: '0 0 2px' }}>{f.comissao_pct || 0}%</p>
                    <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>comissao</p>
                  </div>
                  <span style={{ background: f.ativo ? t.badgeAtivo : t.badgePausado, color: f.ativo ? t.badgeAtivoText : t.badgePausadoText, fontSize: 10, padding: '3px 10px', borderRadius: 20 }}>
                    {f.ativo ? 'ativo' : 'inativo'}
                  </span>
                  <button onClick={() => abrir(f)} style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>Editar</button>
                  <button onClick={() => toggleAtivo(f)} style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>
                    {f.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                  <button onClick={() => excluir(f.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
