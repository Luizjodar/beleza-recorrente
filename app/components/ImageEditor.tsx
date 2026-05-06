'use client'

import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'
import { useTema } from '@/app/lib/tema'

type Area = { x: number; y: number; width: number; height: number }
type CropResult = { croppedBlob: Blob; croppedUrl: string }

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<CropResult> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    pixelCrop.width, pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { reject(new Error('Canvas empty')); return }
      resolve({ croppedBlob: blob, croppedUrl: URL.createObjectURL(blob) })
    }, 'image/jpeg', 0.92)
  })
}

type Props = {
  imageSrc: string
  onConfirm: (blob: Blob, url: string) => void
  onCancel: () => void
  aspectRatio?: number
}

export default function ImageEditor({ imageSrc, onConfirm, onCancel, aspectRatio = 9 / 16 }: Props) {
  const { t } = useTema()
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState(aspectRatio)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processando, setProcessando] = useState(false)

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  async function confirmar() {
    if (!croppedAreaPixels) return
    setProcessando(true)
    const { croppedBlob, croppedUrl } = await getCroppedImg(imageSrc, croppedAreaPixels)
    onConfirm(croppedBlob, croppedUrl)
    setProcessando(false)
  }

  const aspectOptions = [
    { label: '9:16 Stories', value: 9 / 16 },
    { label: '1:1 Quadrado', value: 1 },
    { label: '4:3 Paisagem', value: 4 / 3 },
    { label: '16:9 Widescreen', value: 16 / 9 },
    { label: 'Livre', value: 0 },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      zIndex: 1000, display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ background: t.navBg, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `0.5px solid ${t.border}` }}>
        <p style={{ color: t.text, fontSize: 13, fontWeight: 500, margin: 0 }}>Editar imagem</p>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: t.textFaint, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>

      {/* Cropper */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect || undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: '#000' },
          }}
        />
      </div>

      {/* Controles */}
      <div style={{ background: t.navBg, padding: '20px 24px', borderTop: `0.5px solid ${t.border}` }}>

        {/* Proporção */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 10px' }}>Proporção</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {aspectOptions.map(opt => (
              <button key={opt.label} onClick={() => setAspect(opt.value)}
                style={{
                  background: Math.abs(aspect - opt.value) < 0.01 ? t.text : 'none',
                  color: Math.abs(aspect - opt.value) < 0.01 ? t.navBg : t.textMuted,
                  border: `0.5px solid ${t.border}`,
                  borderRadius: 8, padding: '6px 12px', fontSize: 11, cursor: 'pointer',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Zoom */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ color: t.textFaint, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: '0 0 10px' }}>
            Zoom — {zoom.toFixed(1)}x
          </p>
          <input
            type="range" min={1} max={3} step={0.05} value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ width: '100%', accentColor: t.text }}
          />
        </div>

        {/* Botões */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={confirmar} disabled={processando}
            style={{
              background: t.text, color: t.navBg, border: 'none',
              borderRadius: 10, padding: '12px 28px', fontSize: 12,
              cursor: 'pointer', opacity: processando ? 0.6 : 1, flex: 1,
            }}>
            {processando ? 'Processando...' : 'Confirmar corte'}
          </button>
          <button onClick={onCancel}
            style={{ background: 'none', border: `0.5px solid ${t.border}`, color: t.textMuted, borderRadius: 10, padding: '12px 20px', fontSize: 12, cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
