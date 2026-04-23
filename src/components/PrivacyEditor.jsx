import { useState, useRef, useEffect } from 'react'
import { Check, RotateCcw, Brush, Loader2, X } from 'lucide-react'
import { detectFaces } from '../utils/privacyVision'

export default function PrivacyEditor({ imageBlob, onConfirm, onCancel }) {
  const canvasRef = useRef(null)
  const blurredCanvasRef = useRef(null) // Canvas oculto con la imagen borrosa
  const [isProcessing, setIsProcessing] = useState(true)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDetected, setHasDetected] = useState(false)
  const [originalImg, setOriginalImg] = useState(null)

  useEffect(() => {
    const loadImage = async () => {
      const url = URL.createObjectURL(imageBlob)
      const img = new Image()
      img.src = url
      
      img.onload = async () => {
        setOriginalImg(img)
        const canvas = canvasRef.current
        const bCanvas = document.createElement('canvas')
        if (!canvas) return

        // 1. Configurar Canvas Principal (Escalado para performance)
        const MAX_DIM = 1000
        let scale = 1
        if (img.width > MAX_DIM || img.height > MAX_DIM) {
          scale = Math.min(MAX_DIM / img.width, MAX_DIM / img.height)
        }
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // 2. Crear "Capa Borrosa" (Técnica de Downscale para máxima compatibilidad)
        bCanvas.width = canvas.width
        bCanvas.height = canvas.height
        const bCtx = bCanvas.getContext('2d')
        
        // Dibujamos pequeño y agrandamos para blur natural
        const blurLevel = 0.05 // 5% del tamaño original
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = canvas.width * blurLevel
        tempCanvas.height = canvas.height * blurLevel
        const tempCtx = tempCanvas.getContext('2d')
        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height)
        
        bCtx.imageSmoothingEnabled = true
        bCtx.drawImage(tempCanvas, 0, 0, bCanvas.width, bCanvas.height)
        blurredCanvasRef.current = bCanvas

        try {
          console.log("IA: Iniciando detección...");
          const faces = await detectFaces(img)
          
          if (faces && faces.length > 0) {
            console.log(`IA: ${faces.length} caras encontradas`);
            faces.forEach(face => {
              const { originX, originY, width, height } = face.boundingBox
              // Aplicar blur de la capa borrosa
              ctx.drawImage(
                bCanvas, 
                originX * scale, originY * scale, width * scale, height * scale, 
                originX * scale, originY * scale, width * scale, height * scale
              )
            });
            setHasDetected(true)
          }
        } catch (error) {
          console.error("AI Error:", error)
        } finally {
          setIsProcessing(false)
          URL.revokeObjectURL(url)
        }
      }
    }
    loadImage()
  }, [imageBlob])

  const draw = (e) => {
    if (!isDrawing || isProcessing) return
    
    // Prevenir scroll en móviles mientras se dibuja
    if (e.cancelable) e.preventDefault()

    const canvas = canvasRef.current
    const bCanvas = blurredCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    
    const x = (clientX - rect.left) * (canvas.width / rect.width)
    const y = (clientY - rect.top) * (canvas.height / rect.height)

    const brushSize = 40
    
    // Dibujar trozo borroso en la posición del pincel
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(bCanvas, 0, 0)
    ctx.restore()
  }

  const handleStartDrawing = (e) => {
    setIsDrawing(true)
    draw(e)
  }

  const handleStopDrawing = () => setIsDrawing(false)

  const handleConfirm = () => {
    canvasRef.current.toBlob((blob) => {
      onConfirm(blob)
    }, 'image/webp', 0.8)
  }

  return (
    <div className="fixed inset-0 z-[3000] bg-slate-950 flex flex-col items-center justify-center overscroll-none">
      {/* Header */}
      <div className="w-full p-4 flex justify-between items-center bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <button onClick={onCancel} className="text-slate-400 p-2 active:bg-slate-800 rounded-full">
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-white font-bold text-sm uppercase tracking-widest">Privacidad</h3>
        <button 
          onClick={handleConfirm}
          disabled={isProcessing}
          className="bg-blue-600 text-white px-5 py-2 rounded-full flex items-center gap-2 font-bold active:scale-95 transition-transform disabled:opacity-50"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Listo
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 w-full relative flex items-center justify-center p-4 overflow-hidden bg-black">
        {isProcessing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-white font-bold animate-pulse uppercase tracking-tighter">Analizando Escena...</p>
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          onMouseDown={handleStartDrawing}
          onMouseMove={draw}
          onMouseUp={handleStopDrawing}
          onMouseLeave={handleStopDrawing}
          onTouchStart={handleStartDrawing}
          onTouchMove={draw}
          onTouchEnd={handleStopDrawing}
          className="max-w-full max-h-full rounded-xl shadow-2xl touch-none cursor-crosshair border border-slate-800"
        />
      </div>

      {/* Footer */}
      <div className="w-full p-6 bg-slate-900 border-t border-slate-800 flex flex-col items-center gap-4">
        <div className="flex justify-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="p-4 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Brush className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pincel</span>
          </div>

          <div className="flex flex-col items-center gap-2" onClick={() => window.location.reload()}>
            <div className="p-4 rounded-2xl bg-slate-800 text-slate-400 active:bg-slate-700">
              <RotateCcw className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reiniciar</span>
          </div>
        </div>

        <p className="text-slate-400 text-[11px] text-center max-w-[280px] leading-relaxed">
          {hasDetected 
            ? "✨ IA detectó caras automáticamente. Usa el pincel para tapar patentes adicionales."
            : "Pasa el dedo para ocultar caras o datos sensibles."}
        </p>
      </div>
    </div>
  )
}
