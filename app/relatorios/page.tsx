'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { useTema } from '@/app/lib/tema'
import Layout from '../components/Layout'
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

type Assinante = {
  id: string
  status: string
  criado_em: string
  pacotes?: { nome: string; preco_mensal: number }
}

type Pagamento = {
  valor: number
  mes_referencia: string
  status: string
}

type Agendamento = {
  data: string
  status?: string
}

type Despesa = {
  valor: number
  data: string
  categoria: string
}

type MesData = {
  mes: string
  label: string
  receita: number
  despesas: number
  lucro: number
  novos: number
  agendamentos: number
}

function useTemaLocal() {
  return useTema()
}

// Gráfico de barras SVG
function BarChart({ data, campo, cor, label, height = 140 }: {
  data: MesData[]
  campo: keyof MesData
  cor: string
  label: string
  height?: number
}) {
  const { t } = useTemaLocal()
  const valores = data.map(d => Number(d[campo]))
  const max = Math.max(...valores, 1)
  const [hover, setHover] = useState<number | null>(null)

  return (
    <div>
      {label && <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 10px' }}>{label}</p>}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
        {data.map((d, i) => {
          const val = Number(d[campo])
          const pct = max > 0 ? (val / max) * 100 : 0
          const isAtual = i === data.length - 1
          const isMoney = campo === 'receita' || campo === 'despesas' || campo === 'lucro'
          return (
            <div key={d.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end', position: 'relative', cursor: 'default' }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {hover === i && val > 0 && (
                <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: t.text, color: t.bg, fontSize: 10, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap', marginBottom: 4, zIndex: 10 }}>
                  {isMoney ? `R$ ${val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : val}
                </div>
              )}
              {hover !== i && val > 0 && (
                <p style={{ color: t.textFaint, fontSize: 9, margin: 0 }}>
                  {isMoney ? (val >= 1000 ? `${(val/1000).toFixed(1)}k` : val) : val}
                </p>
              )}
              <div style={{ width: '100%', height: `${Math.max(pct, val > 0 ? 4 : 0)}%`, background: isAtual ? cor : cor + 'aa', borderRadius: '3px 3px 0 0', minHeight: val > 0 ? 3 : 0, transition: 'all 0.2s' }} />
              <p style={{ color: isAtual ? t.text : t.textFaint, fontSize: 9, margin: 0, fontWeight: isAtual ? 600 : 400 }}>{d.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Gráfico de linha SVG — tendência ao longo do tempo
function LineChart({ data, campos, cores, labels, height = 160 }: {
  data: MesData[]
  campos: (keyof MesData)[]
  cores: string[]
  labels: string[]
  height?: number
}) {
  const { t } = useTemaLocal()
  const [campoAtivo, setCampoAtivo] = useState(0)
  const campo = campos[campoAtivo]
  const cor = cores[campoAtivo]
  const vals = data.map(d => Number(d[campo]))
  const max = Math.max(...vals, 1)
  const step = 100 / Math.max(data.length - 1, 1)

  const pts = data.map((d, i) => ({
    x: parseFloat((i * step).toFixed(1)),
    y: parseFloat((8 + (1 - Number(d[campo]) / max) * 80).toFixed(1)),
    val: Number(d[campo]),
  }))

  const linhaPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linhaPath} L ${pts[pts.length-1].x} 100 L ${pts[0].x} 100 Z`

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {labels.map((l, i) => (
          <button key={l} onClick={() => setCampoAtivo(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: campoAtivo === i ? cores[i] + '18' : 'none',
              border: `1px solid ${campoAtivo === i ? cores[i] : t.border}`,
              borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
            }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cores[i] }} />
            <span style={{ color: campoAtivo === i ? cores[i] : t.textFaint, fontSize: 11, fontWeight: campoAtivo === i ? 600 : 400 }}>{l}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>
          Máx: <strong style={{ color: t.text }}>R$ {max.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</strong>
        </p>
      </div>
      <div style={{ position: 'relative' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={cor} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[30, 55, 80].map(y => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke={t.border} strokeWidth="0.4" vectorEffect="non-scaling-stroke" strokeDasharray="3,3" />
          ))}
          <path d={areaPath} fill="url(#areaGrad)" />
          <path d={linhaPath} fill="none" stroke={cor} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => p.val > 0 && (
            <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={cor} stroke={t.bgCard} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {data.map((d, i) => (
            <p key={d.mes} style={{ color: i === data.length - 1 ? t.text : t.textFaint, fontSize: 10, margin: 0, fontWeight: i === data.length - 1 ? 600 : 400 }}>{d.label}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

// Gráfico de pizza SVG
function PieChart({ fatias, size = 110 }: { fatias: { label: string; valor: number; cor: string }[]; size?: number }) {
  const { t } = useTemaLocal()
  const total = fatias.reduce((a, f) => a + f.valor, 0)
  if (total === 0) return <p style={{ color: t.textFaint, fontSize: 12, textAlign: 'center', margin: '20px 0' }}>Sem dados</p>

  const arcos = fatias.reduce((acc, f, _i) => {
    const pct = f.valor / total
    const ini = acc.length > 0 ? acc[acc.length - 1].fim : 0
    const fim = ini + pct
    const ang1 = ini * 2 * Math.PI - Math.PI / 2
    const ang2 = fim * 2 * Math.PI - Math.PI / 2
    const r = 40
    const x1 = 50 + r * Math.cos(ang1), y1 = 50 + r * Math.sin(ang1)
    const x2 = 50 + r * Math.cos(ang2), y2 = 50 + r * Math.sin(ang2)
    const large = pct > 0.5 ? 1 : 0
    acc.push({ ...f, pct, fim, d: `M 50 50 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z` })
    return acc
  }, [] as { label: string; valor: number; cor: string; pct: number; fim: number; d: string }[])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg viewBox="0 0 100 100" style={{ width: size, height: size, flexShrink: 0 }}>
        {arcos.map((a, i) => <path key={i} d={a.d} fill={a.cor} stroke={t.bgCard} strokeWidth="1.5" />)}
        <circle cx="50" cy="50" r="22" fill={t.bgCard} />
        <text x="50" y="47" textAnchor="middle" style={{ fontSize: 9, fill: t.textFaint }}>total</text>
        <text x="50" y="57" textAnchor="middle" style={{ fontSize: 12, fill: t.text, fontWeight: '600' }}>{total}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {arcos.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: a.cor, flexShrink: 0 }} />
              <span style={{ color: t.textMuted, fontSize: 11 }}>{a.label}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: t.textFaint, fontSize: 11 }}>{a.valor}</span>
              <span style={{ color: t.text, fontSize: 11, fontWeight: 500 }}>{Math.round(a.pct * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Barra de progresso horizontal
function BarraProgresso({ label, valor, max, cor, formatado }: { label: string; valor: number; max: number; cor: string; formatado: string }) {
  const { t } = useTemaLocal()
  const pct = max > 0 ? Math.min((valor / max) * 100, 100) : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ color: t.textMuted, fontSize: 12, textTransform: 'capitalize' }}>{label}</span>
        <span style={{ color: t.text, fontSize: 12, fontWeight: 500 }}>{formatado}</span>
      </div>
      <div style={{ background: t.bg, borderRadius: 4, height: 5, overflow: 'hidden' }}>
        <div style={{ background: cor, height: '100%', width: `${pct}%`, borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
}

export default function RelatoriosPage() {
  const router = useRouter()
  const { t } = useTemaLocal()
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState(6)
  const [meses, setMeses] = useState<MesData[]>([])
  const [assinantes, setAssinantes] = useState<Assinante[]>([])
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: salao } = await supabase.from('saloes').select('id').eq('user_id', user.id).single()
      if (!salao) return
      const [{ data: ass }, { data: pags }, { data: desps }, { data: ags }] = await Promise.all([
        supabase.from('assinantes').select('id, status, criado_em, pacotes(nome, preco_mensal)').eq('salao_id', salao.id),
        supabase.from('pagamentos').select('valor, mes_referencia, status').eq('salao_id', salao.id),
        supabase.from('despesas').select('valor, data, categoria').eq('salao_id', salao.id),
        supabase.from('agendamentos').select('data, status').eq('salao_id', salao.id),
      ])
      setAssinantes((ass || []) as unknown as Assinante[])
      setPagamentos((pags || []) as Pagamento[])
      setDespesas((desps || []) as Despesa[])
      setAgendamentos((ags || []) as Agendamento[])
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    const hoje = new Date()
    const dados: MesData[] = Array.from({ length: periodo }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - (periodo - 1 - i), 1)
      const mesStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
      const mesYM = mesStr.slice(0, 7)
      const receita = pagamentos.filter(p => p.mes_referencia === mesStr && p.status === 'pago').reduce((acc, p) => acc + Number(p.valor), 0)
      const desp = despesas.filter(dep => dep.data?.startsWith(mesYM)).reduce((acc, dep) => acc + Number(dep.valor), 0)
      const novos = assinantes.filter(a => a.criado_em?.startsWith(mesYM)).length
      const ags = agendamentos.filter(a => a.data?.startsWith(mesYM)).length
      return { mes: mesStr, label: MESES_CURTOS[d.getMonth()], receita, despesas: desp, lucro: receita - desp, novos, agendamentos: ags }
    })
    setMeses(dados)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, pagamentos, despesas, assinantes, agendamentos])

  const totalReceita = meses.reduce((a, m) => a + m.receita, 0)
  const totalDespesas = meses.reduce((a, m) => a + m.despesas, 0)
  const totalLucro = totalReceita - totalDespesas
  const totalNovos = meses.reduce((a, m) => a + m.novos, 0)
  const ativos = assinantes.filter(a => a.status === 'ativo').length
  const inadimplentes = assinantes.filter(a => a.status === 'inadimplente').length
  const cancelados = assinantes.filter(a => a.status === 'cancelado').length
  const pausados = assinantes.filter(a => a.status === 'pausado').length
  const mrr = assinantes.filter(a => a.status === 'ativo').reduce((acc, a) => acc + Number(a.pacotes?.preco_mensal || 0), 0)
  const taxaChurn = assinantes.length > 0 ? Math.round((cancelados / assinantes.length) * 100) : 0

  const categorias = despesas.reduce((acc, d) => { acc[d.categoria] = (acc[d.categoria] || 0) + Number(d.valor); return acc }, {} as Record<string, number>)
  const coresMap: Record<string, string> = { aluguel: '#111', energia: '#555', agua: '#888', fornecedor: '#6366f1', marketing: '#f59e0b', salario: '#22c55e', outros: '#aaa' }
  const fatiasCateg = Object.entries(categorias).sort((a, b) => b[1] - a[1]).map(([label, valor]) => ({ label, valor, cor: coresMap[label] || '#bbb' }))
  const maxDesp = Math.max(...fatiasCateg.map(f => f.valor), 1)

  const popularidade = assinantes.reduce((acc, a) => { const n = a.pacotes?.nome || 'Sem pacote'; acc[n] = (acc[n] || 0) + 1; return acc }, {} as Record<string, number>)
  const coresPac = ['#111','#555','#888','#6366f1','#f59e0b','#22c55e']
  const fatiasPlanos = Object.entries(popularidade).sort((a, b) => b[1] - a[1]).map(([label, valor], i) => ({ label, valor, cor: coresPac[i % coresPac.length] }))

  const fatiasStatus = [
    { label: 'Ativos', valor: ativos, cor: '#22c55e' },
    { label: 'Inadimplentes', valor: inadimplentes, cor: '#f59e0b' },
    { label: 'Cancelados', valor: cancelados, cor: '#ef4444' },
    { label: 'Pausados', valor: pausados, cor: '#aaa' },
  ].filter(f => f.valor > 0)

  const statusAgs = agendamentos.reduce((acc, a) => { const s = a.status || 'pendente'; acc[s] = (acc[s] || 0) + 1; return acc }, {} as Record<string, number>)
  const fatiasAgs = [
    { label: 'Confirmados', valor: statusAgs['confirmado'] || 0, cor: '#22c55e' },
    { label: 'Concluidos', valor: statusAgs['concluido'] || 0, cor: '#111' },
    { label: 'Pendentes', valor: statusAgs['pendente'] || 0, cor: '#f59e0b' },
    { label: 'Cancelados', valor: statusAgs['cancelado'] || 0, cor: '#ef4444' },
  ].filter(f => f.valor > 0)

  const [exportando, setExportando] = useState<'pdf'|'excel'|null>(null)

  async function exportarExcel() {
    setExportando('excel')
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    // Aba 1 — Resumo financeiro
    const resumo = [
      ['Relatório Financeiro', `Últimos ${periodo} meses`],
      [],
      ['Indicador', 'Valor'],
      ['Receita Total', `R$ ${totalReceita.toFixed(2)}`],
      ['Despesas Total', `R$ ${totalDespesas.toFixed(2)}`],
      ['Lucro Líquido', `R$ ${totalLucro.toFixed(2)}`],
      ['MRR Atual', `R$ ${mrr.toFixed(2)}`],
      ['Assinantes Ativos', ativos],
      ['Inadimplentes', inadimplentes],
      ['Churn Rate', `${taxaChurn}%`],
      ['Novos no Período', totalNovos],
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(resumo)
    ws1['!cols'] = [{ wch: 25 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumo')

    // Aba 2 — Histórico mensal
    const historico = [
      ['Mês', 'Receita (R$)', 'Despesas (R$)', 'Lucro (R$)', 'Novos Assinantes', 'Agendamentos'],
      ...meses.map(m => [m.label, m.receita.toFixed(2), m.despesas.toFixed(2), m.lucro.toFixed(2), m.novos, m.agendamentos]),
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(historico)
    ws2['!cols'] = [{ wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Histórico Mensal')

    // Aba 3 — Assinantes
    const listaAs = [
      ['Nome', 'Status', 'Plano', 'Valor/Mês (R$)'],
      ...assinantes.map(a => [a.status, a.pacotes?.nome || '—', (a.pacotes?.preco_mensal || 0).toFixed(2)]),
    ]
    const ws3 = XLSX.utils.aoa_to_sheet(listaAs)
    ws3['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 20 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws3, 'Assinantes')

    // Aba 4 — Despesas por categoria
    const despCat = [
      ['Categoria', 'Total (R$)', '% do Total'],
      ...fatiasCateg.map(f => [f.label, f.valor.toFixed(2), `${((f.valor / totalDespesas) * 100).toFixed(1)}%`]),
    ]
    const ws4 = XLSX.utils.aoa_to_sheet(despCat)
    ws4['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws4, 'Despesas')

    XLSX.writeFile(wb, `relatorio-beleza-${new Date().toISOString().slice(0,10)}.xlsx`)
    setExportando(null)
  }

  async function exportarPDF() {
    setExportando('pdf')
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF()

    const dataHoje = new Date().toLocaleDateString('pt-BR')
    const corPrincipal: [number, number, number] = [99, 102, 241]

    // Header
    doc.setFillColor(...corPrincipal)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Beleza Recorrente', 14, 12)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Relatório Financeiro — Últimos ${periodo} meses`, 14, 20)
    doc.text(dataHoje, 196, 20, { align: 'right' })

    // KPIs
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Indicadores Principais', 14, 38)

    autoTable(doc, {
      startY: 42,
      head: [['Indicador', 'Valor']],
      body: [
        ['Receita Total', `R$ ${totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Despesas Total', `R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Lucro Líquido', `R$ ${totalLucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['MRR Atual', `R$ ${mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ['Assinantes Ativos', String(ativos)],
        ['Inadimplentes', String(inadimplentes)],
        ['Churn Rate', `${taxaChurn}%`],
        ['Novos no Período', String(totalNovos)],
      ],
      headStyles: { fillColor: corPrincipal, textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 255] },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 60, halign: 'right' } },
    })

    // Histórico mensal
    const y1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Histórico Mensal', 14, y1)

    autoTable(doc, {
      startY: y1 + 4,
      head: [['Mês', 'Receita', 'Despesas', 'Lucro', 'Novos', 'Agend.']],
      body: meses.map(m => [
        m.label,
        `R$ ${m.receita.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
        `R$ ${m.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
        `R$ ${m.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
        String(m.novos),
        String(m.agendamentos),
      ]),
      headStyles: { fillColor: corPrincipal, textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 248, 255] },
    })

    // Despesas por categoria
    if (fatiasCateg.length > 0) {
      const y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('Despesas por Categoria', 14, y2)

      autoTable(doc, {
        startY: y2 + 4,
        head: [['Categoria', 'Total', '% do Total']],
        body: fatiasCateg.map(f => [
          f.label.charAt(0).toUpperCase() + f.label.slice(1),
          `R$ ${f.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `${totalDespesas > 0 ? ((f.valor / totalDespesas) * 100).toFixed(1) : 0}%`,
        ]),
        headStyles: { fillColor: corPrincipal, textColor: [255,255,255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 248, 255] },
      })
    }

    // Footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Beleza Recorrente — Gerado em ${dataHoje} — Página ${i} de ${pageCount}`, 105, 290, { align: 'center' })
    }

    doc.save(`relatorio-beleza-${new Date().toISOString().slice(0,10)}.pdf`)
    setExportando(null)
  }

  const card = { background: t.bgCard, border: `0.5px solid ${t.borderCard}`, borderRadius: 18, padding: '24px' }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: t.textFaint, fontSize: 12, letterSpacing: 3 }}>CARREGANDO</p>
    </div>
  )

  return (
    <Layout>
      <style>{`
        .rel-pad { max-width: 1100px; margin: 0 auto; padding: 36px 24px; }
        .rel-kpi4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 16px; }
        .rel-kpi3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 16px; }
        .rel-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .rel-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .rel-bar3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
        @media (max-width: 768px) {
          .rel-pad { padding: 20px 14px; }
          .rel-kpi4 { grid-template-columns: 1fr 1fr; gap: 10px; }
          .rel-kpi3 { grid-template-columns: 1fr 1fr; gap: 10px; }
          .rel-grid2 { grid-template-columns: 1fr; }
          .rel-grid3 { grid-template-columns: 1fr; }
          .rel-bar3 { grid-template-columns: 1fr; gap: 20px; }
        }
      `}</style>
      <div className="rel-pad">

        {/* Header */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ color: t.textMuted, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 6px' }}>Analise</p>
            <h1 style={{ color: t.text, fontSize: 30, fontWeight: 300, margin: 0, letterSpacing: -0.5, fontFamily: 'Georgia, serif' }}>Relatorios</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Exportação */}
            <button onClick={exportarExcel} disabled={exportando !== null}
              style={{ background: '#16a34a', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, opacity: exportando === 'excel' ? 0.7 : 1 }}>
              {exportando === 'excel' ? '⏳ Gerando...' : '📊 Excel'}
            </button>
            <button onClick={exportarPDF} disabled={exportando !== null}
              style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, opacity: exportando === 'pdf' ? 0.7 : 1 }}>
              {exportando === 'pdf' ? '⏳ Gerando...' : '📄 PDF'}
            </button>
            {/* Período */}
            <div style={{ display: 'flex', gap: 4, background: t.bgCard, border: `0.5px solid ${t.border}`, borderRadius: 10, padding: 3 }}>
              {[3, 6, 12].map(p => (
                <button key={p} onClick={() => setPeriodo(p)}
                  style={{ background: periodo === p ? t.text : 'none', color: periodo === p ? t.bg : t.textMuted, border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontWeight: periodo === p ? 500 : 400 }}>
                  {p}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs financeiros */}
        <div className="rel-kpi4">
          {[
            { label: 'Receita total', value: `R$ ${totalReceita.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, sub: `${periodo} meses`, accent: true },
            { label: 'Despesas total', value: `R$ ${totalDespesas.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, sub: 'no periodo', accent: false },
            { label: 'Lucro liquido', value: `R$ ${totalLucro.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, sub: 'Receita - Despesas', accent: false },
            { label: 'MRR atual', value: `R$ ${mrr.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, sub: 'receita recorrente/mes', accent: false },
          ].map(k => (
            <div key={k.label} style={{ ...card, position: 'relative', overflow: 'hidden' }}>
              {k.accent && <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: t.accentBar }} />}
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px' }}>{k.label}</p>
              <p style={{ color: t.text, fontSize: 24, fontWeight: 200, letterSpacing: -1, margin: '0 0 3px', lineHeight: 1 }}>{k.value}</p>
              <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* KPIs assinantes */}
        <div className="rel-kpi3">
          {[
            { label: 'Assinantes ativos', value: ativos, cor: '#22c55e', sub: 'pagando' },
            { label: 'Churn rate', value: `${taxaChurn}%`, cor: '#ef4444', sub: `${cancelados} cancelamentos` },
            { label: 'Novos no periodo', value: totalNovos, cor: '#6366f1', sub: `${periodo} meses` },
          ].map(k => (
            <div key={k.label} style={card}>
              <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 8px' }}>{k.label}</p>
              <p style={{ color: k.cor, fontSize: 34, fontWeight: 200, margin: '0 0 3px', lineHeight: 1 }}>{k.value}</p>
              <p style={{ color: t.textFaint, fontSize: 11, margin: 0 }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Gráfico de linha — tendência financeira */}
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Tendencia financeira</p>
            <p style={{ color: t.text, fontSize: 15, fontWeight: 500, margin: 0 }}>Receita, Despesas e Lucro</p>
          </div>
          <LineChart data={meses} campos={['receita', 'despesas', 'lucro']} cores={[t.text, '#ef4444', '#22c55e']} labels={['Receita', 'Despesas', 'Lucro']} height={150} />
        </div>

        {/* Barras: receita vs despesas vs lucro */}
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ marginBottom: 24 }}>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Comparativo mensal</p>
            <p style={{ color: t.text, fontSize: 15, fontWeight: 500, margin: 0 }}>Receita vs Despesas vs Lucro</p>
          </div>
          <div className="rel-bar3">
            <BarChart data={meses} campo="receita" cor={t.text} label="Receita (R$)" />
            <BarChart data={meses} campo="despesas" cor="#ef4444" label="Despesas (R$)" />
            <BarChart data={meses} campo="lucro" cor="#22c55e" label="Lucro (R$)" />
          </div>
        </div>

        {/* Crescimento + Agendamentos */}
        <div className="rel-grid2">
          <div style={card}>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Crescimento</p>
            <p style={{ color: t.text, fontSize: 15, fontWeight: 500, margin: '0 0 20px' }}>Novos assinantes por mes</p>
            <BarChart data={meses} campo="novos" cor="#6366f1" label="" height={110} />
          </div>
          <div style={card}>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Ocupacao</p>
            <p style={{ color: t.text, fontSize: 15, fontWeight: 500, margin: '0 0 20px' }}>Agendamentos por mes</p>
            <BarChart data={meses} campo="agendamentos" cor="#f59e0b" label="" height={110} />
          </div>
        </div>

        {/* Pizzas */}
        <div className="rel-grid3">
          <div style={card}>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Assinantes</p>
            <p style={{ color: t.text, fontSize: 14, fontWeight: 500, margin: '0 0 16px' }}>Por status</p>
            <PieChart fatias={fatiasStatus} size={100} />
          </div>
          <div style={card}>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Agendamentos</p>
            <p style={{ color: t.text, fontSize: 14, fontWeight: 500, margin: '0 0 16px' }}>Por status</p>
            <PieChart fatias={fatiasAgs} size={100} />
          </div>
          <div style={card}>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Planos</p>
            <p style={{ color: t.text, fontSize: 14, fontWeight: 500, margin: '0 0 16px' }}>Mais populares</p>
            <PieChart fatias={fatiasPlanos} size={100} />
          </div>
        </div>

        {/* Despesas por categoria */}
        {fatiasCateg.length > 0 && (
          <div style={card}>
            <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 4px' }}>Despesas</p>
            <p style={{ color: t.text, fontSize: 15, fontWeight: 500, margin: '0 0 24px' }}>Por categoria</p>
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <PieChart fatias={fatiasCateg} size={130} />
              <div style={{ flex: 1, minWidth: 200 }}>
                {fatiasCateg.map((f, i) => (
                  <BarraProgresso key={i} label={f.label} valor={f.valor} max={maxDesp} cor={f.cor}
                    formatado={`R$ ${f.valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} />
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  )
}
