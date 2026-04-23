import { useState, useRef, useEffect, useCallback } from 'react'
import { Check, RotateCcw, Loader2, X, Brush } from 'lucide-react'
import { detectFaces } from '../utils/privacyVision'

const BRUSH_RADIUS = 30

export default function PrivacyEditor({ imageBlob, onConfirm, onCancel }) {
  const canvasRef = useRef(null)
  const blurredCanvasRef = useRef(null)
  const isDrawingRef = useRef(false)          // useRef para evitar async state issues
  const originalImgRef = useRef(null)

  const [isProcessing, setIsProcessing] = useState(true)
  const [hasDetected, setHasDetected] = useState(false)
  const [facesCount, setFacesCount] = useState(0)

  // ─── INICIALIZAR: cargar imagen y generar capa borrosa ───────────────────────
  useEffect(() => {
    const loadImage = async () => {
      const url = URL.createObjectURL(imageBlob)
      const img = new Image()
      img.src = url

      img.onload = async () => {
        originalImgRef.current = img
        const canvas = canvasRef.current
        if (!canvas) return

        // Escalar canvas
        const MAX_DIM = 1000
        const scale = Math.min(MAX_DIM / img.width, MAX_DIM / img.height, 1)
        canvas.width = img.width * scale
        canvas.height = img.height * scale

        // Dibujar imagen original en canvas principal
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Generar capa borrosa via downscale/upscale (compatible 100% con Safari)
        const tmp = document.createElement('canvas')
        const BLUR_FACTOR = 0.04                 // 4% del tamaño — fuerte y compatible
        tmp.width = Math.max(1, canvas.width * BLUR_FACTOR)
        tmp.height = Math.max(1, canvas.height * BLUR_FACTOR)
        const tmpCtx = tmp.getContext('2d')
        tmpCtx.imageSmoothingEnabled = true
        tmpCtx.imageSmoothingQuality = 'high'
        tmpCtx.drawImage(img, 0, 0, tmp.width, tmp.height)

        const bCanvas = document.createElement('canvas')
        bCanvas.width = canvas.width
        bCanvas.height = canvas.height
        const bCtx = bCanvas.getContext('2d')
        bCtx.imageSmoothingEnabled = true
        bCtx.imageSmoothingQuality = 'high'
        bCtx.drawImage(tmp, 0, 0, bCanvas.width, bCanvas.height)
        blurredCanvasRef.current = bCanvas

        // ─── DETECCIÓN AUTOMÁTICA DE CARAS ──────────────────────────────────
        try {
          // Pasamos el canvas (ya escalado) en lugar de la img original
          // Esto ayuda a la IA a enfocarse mejor en los rostros
          const faces = await detectFaces(canvas)
          if (faces && faces.length > 0) {
            setFacesCount(faces.length)
            faces.forEach(face => {
              const { originX, originY, width, height } = face.boundingBox
              applyBlurPatch(
                ctx,
                bCanvas,
                Math.floor(originX * scale),
                Math.floor(originY * scale),
                Math.ceil(width * scale),
                Math.ceil(height * scale)
              )
            })
            setHasDetected(true)
          }
        } catch (e) {
          console.warn('AI Detection failed:', e)
        } finally {
          setIsProcessing(false)
          URL.revokeObjectURL(url)
        }
      }

      img.onerror = () => {
        console.error('No se pudo cargar la imagen')
        setIsProcessing(false)
      }
    }

    loadImage()
  }, [imageBlob])

  // ─── FUNCIÓN CENTRAL DE BLUR (reutilizada por IA y pincel) ──────────────────
  const applyBlurPatch = (ctx, bCanvas, x, y, w, h) => {
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()
    ctx.drawImage(bCanvas, 0, 0, bCanvas.width, bCanvas.height)
    ctx.restore()
  }

  // ─── LÓGICA DE DIBUJO (PINCEL) ───────────────────────────────────────────────
  const getCanvasPos = useCallback((e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches?.[0] ?? e
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height),
    }
  }, [])

  const paintBlur = useCallback((e) => {
    if (!isDrawingRef.current || isProcessing || !blurredCanvasRef.current) return
    if (e.cancelable) e.preventDefault()

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getCanvasPos(e)

    const d = BRUSH_RADIUS * 2
    applyBlurPatch(ctx, blurredCanvasRef.current, x - BRUSH_RADIUS, y - BRUSH_RADIUS, d, d)
  }, [isProcessing, getCanvasPos])

  const onPointerDown = useCallback((e) => {
    isDrawingRef.current = true
    paintBlur(e)                             // Primer toque también pinta
  }, [paintBlur])

  const onPointerUp = useCallback(() => {
    isDrawingRef.current = false
  }, [])

  // ─── REINICIAR ───────────────────────────────────────────────────────────────
  const handleReset = () => {
    const canvas = canvasRef.current
    const img = originalImgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    setHasDetected(false)
    setFacesCount(0)
  }

  // ─── CONFIRMAR ───────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    canvasRef.current.toBlob(blob => onConfirm(blob), 'image/webp', 0.85)
  }

  // ─── UI ──────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[3000] bg-black flex flex-col" style={{ touchAction: 'none' }}>

      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <button onClick={onCancel} className="p-2 text-slate-400 active:bg-slate-800 rounded-full">
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-white font-bold text-sm tracking-widest uppercase">Privacidad</h3>
        <button
          onClick={handleConfirm}
          disabled={isProcessing}
          className="bg-blue-600 text-white px-5 py-2 rounded-full flex items-center gap-2 font-bold active:scale-95 transition-transform disabled:opacity-40"
        >
          {isProcessing
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Check className="w-4 h-4" />}
          Listo
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {isProcessing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-white font-bold tracking-widest uppercase text-sm animate-pulse">
              Analizando escena...
            </p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={onPointerDown}
          onMouseMove={paintBlur}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={paintBlur}
          onTouchEnd={onPointerUp}
          onTouchCancel={onPointerUp}
          className="max-w-full max-h-full rounded-lg"
          style={{ touchAction: 'none', cursor: 'crosshair', display: 'block' }}
        />
      </div>

      {/* Toolbar */}
      <div className="shrink-0 bg-slate-900 border-t border-slate-800 px-8 pt-5 pb-8 flex flex-col items-center gap-4">
        <div className="flex gap-10 justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30">
              <Brush className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Pincel</span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button onClick={handleReset} className="p-4 bg-slate-800 rounded-2xl active:bg-slate-700">
              <RotateCcw className="w-6 h-6 text-slate-300" />
            </button>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Reiniciar</span>
          </div>
        </div>

        <p className="text-slate-400 text-[11px] text-center max-w-xs leading-relaxed">
          {hasDetected
            ? `✨ IA enmascaró ${facesCount} cara${facesCount > 1 ? 's' : ''} automáticamente. Pasá el dedo para tapar patentes.`
            : 'Pasá el dedo sobre cualquier zona que quieras ocultar.'}
        </p>
      </div>
    </div>
  )
}
