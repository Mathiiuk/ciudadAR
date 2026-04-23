import { useState, useRef, useEffect } from 'react'
import { Check, RotateCcw, Brush, Eraser, Loader2, X } from 'lucide-react'
import { detectFaces } from '../utils/privacyVision'

export default function PrivacyEditor({ imageBlob, onConfirm, onCancel }) {
  const canvasRef = useRef(null)
  const [isProcessing, setIsProcessing] = useState(true)
  const [mode, setMode] = useState('blur') // 'blur' o 'eraser'
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDetected, setHasDetected] = useState(false)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  // Cargar imagen y detectar caras al inicio
  useEffect(() => {
    const loadImage = async () => {
      const url = URL.createObjectURL(imageBlob)
      const img = new Image()
      img.src = url
      
      img.onload = async () => {
        const canvas = canvasRef.current
        if (!canvas) return

        // Ajustar canvas al tamaño de la imagen (o máximo manejable)
        const ctx = canvas.getContext('2d')
        const MAX_DIM = 1200
        let scale = 1
        if (img.width > MAX_DIM || img.height > MAX_DIM) {
          scale = Math.min(MAX_DIM / img.width, MAX_DIM / img.height)
        }

        canvas.width = img.width * scale
        canvas.height = img.height * scale
        setCanvasSize({ width: canvas.width, height: canvas.height })

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        try {
          // Detección automática inicial
          const faces = await detectFaces(img)
          
          if (faces && faces.length > 0) {
            faces.forEach(face => {
              const { originX, originY, width, height } = face.boundingBox
              applyBlur(ctx, originX * scale, originY * scale, width * scale, height * scale)
            });
          }
          setHasDetected(true)
        } catch (error) {
          console.error("AI Detection error:", error)
        } finally {
          setIsProcessing(false)
          URL.revokeObjectURL(url)
        }
      }
    }

    loadImage()
  }, [imageBlob])

  const applyBlur = (ctx, x, y, w, h) => {
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()
    ctx.filter = 'blur(20px)'
    ctx.drawImage(ctx.canvas, 0, 0)
    ctx.restore()
  }

  const handleStartDrawing = (e) => {
    setIsDrawing(true)
    draw(e)
  }

  const handleStopDrawing = () => {
    setIsDrawing(false)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath() // Reset path
  }

  const draw = (e) => {
    if (!isDrawing) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    
    // Calcular coordenadas relativas al canvas
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    
    const x = (clientX - rect.left) * (canvas.width / rect.width)
    const y = (clientY - rect.top) * (canvas.height / rect.height)

    ctx.lineWidth = 40
    ctx.lineCap = 'round'
    ctx.strokeStyle = mode === 'blur' ? 'rgba(0,0,0,0.5)' : 'white' // Placeholder visual

    if (mode === 'blur') {
      // Para un blur manual fluido, usamos una técnica de clip circular
      ctx.save()
      ctx.filter = 'blur(15px)'
      ctx.beginPath()
      ctx.arc(x, y, 20, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(canvas, 0, 0)
      ctx.restore()
    } else {
      // Borrador (revertir es difícil sin buffer, por ahora no implementamos borrador real pero sí reset)
    }
  }

  const handleConfirm = () => {
    canvasRef.current.toBlob((blob) => {
      onConfirm(blob)
    }, 'image/webp', 0.8)
  }

  return (
    <div className="fixed inset-0 z-[3000] bg-black flex flex-col items-center justify-center">
      {/* Header */}
      <div className="w-full p-4 flex justify-between items-center bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <button onClick={onCancel} className="text-gray-400 p-2">
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-white font-bold">Privacidad de Imagen</h3>
        <button 
          onClick={handleConfirm}
          disabled={isProcessing}
          className="bg-blue-600 text-white px-4 py-2 rounded-full flex items-center gap-2 font-semibold active:scale-95 transition-transform disabled:opacity-50"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Listo
        </button>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 w-full relative flex items-center justify-center p-4 bg-black overflow-hidden">
        {isProcessing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-white font-medium animate-pulse">Analizando caras con IA...</p>
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
          className="max-w-full max-h-full rounded-lg shadow-2xl touch-none cursor-crosshair"
          style={{ objectFit: 'contain' }}
        />
      </div>

      {/* Toolbar */}
      <div className="w-full p-6 bg-gray-900/90 backdrop-blur-xl border-t border-gray-800 flex justify-around items-center">
        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={() => setMode('blur')}
            className={`p-4 rounded-2xl transition-all ${mode === 'blur' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-gray-800 text-gray-400'}`}
          >
            <Brush className="w-6 h-6" />
          </button>
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Pincel</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={() => window.location.reload()} // Simple "Reset" for now
            className="p-4 rounded-2xl bg-gray-800 text-gray-400 active:bg-gray-700"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Reiniciar</span>
        </div>
      </div>
      
      <div className="w-full bg-gray-900 px-6 pb-8 pt-2">
         <p className="text-gray-400 text-xs text-center leading-relaxed">
           Pasa el dedo sobre caras o patentes que aún sean visibles. <br/>
           <span className="text-blue-400 font-semibold">{hasDetected ? "✨ IA detectó posibles caras automáticamente" : "Desliza para ocultar datos sensibles"}</span>
         </p>
      </div>
    </div>
  )
}
