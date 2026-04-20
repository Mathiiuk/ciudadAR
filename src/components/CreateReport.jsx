import { useState, useRef, useEffect } from 'react'
import { Camera, X, MapPin, Send, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function CreateReport({ onClose }) {
  const [position, setPosition] = useState(null)
  const [geoError, setGeoError] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [type, setType] = useState('Mal Estacionamiento')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  
  const fileInputRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    let mounted = true
    if (!navigator.geolocation) {
      if (mounted) setGeoError("Tu navegador no soporta geolocalización.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (mounted) {
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        }
      },
      (err) => {
        if (mounted) {
          if (err.code === 1) setGeoError("Permiso de GPS denegado.")
          else if (err.code === 2) setGeoError("Posición no disponible.")
          else setGeoError("Error al obtener ubicación GPS.")
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )

    return () => { mounted = false }
  }, [])

  // WebP Image compression for optimization 
  const processImageToWebP = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          
          // Max dimension 800px to save backend storage and boost performance
          const MAX_WIDTH = 800
          const scaleSize = MAX_WIDTH / img.width
          canvas.width = MAX_WIDTH
          canvas.height = img.height * scaleSize
          
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          
          canvas.toBlob((blob) => {
            resolve(blob)
          }, 'image/webp', 0.8)
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  const handleCapture = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Show instant preview 
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)
    
    // Compress heavily in background
    const compressedBlob = await processImageToWebP(file)
    setImageFile(compressedBlob)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!position) return setUploadError("Aún no detectamos tu ubicación GPS.")
    if (!imageFile) return setUploadError("Debes tomar una foto de la infracción.")
    
    setIsSubmitting(true)
    setUploadError(null)

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) throw new Error("Debes haber iniciado sesión.")

      // Use a clean UUID via browser Crypto API for safe filenames
      const fileId = crypto.randomUUID()
      const fileName = `${fileId}.webp`
      
      // Upload to new bucket 'evidencia-infracciones'
      const { data: storageData, error: storageError } = await supabase.storage
        .from('evidencia-infracciones')
        .upload(fileName, imageFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/webp'
        })

      if (storageError) throw storageError

      const { data: publicUrlData } = supabase.storage
        .from('evidencia-infracciones')
        .getPublicUrl(fileName)

      // PostGIS string format for Geography Point 
      const ewktPoint = `POINT(${position.lng} ${position.lat})`

      // Insert into SQL Production schema
      const { error: dbError } = await supabase.from('infractions').insert([{
        user_id: userData.user.id,
        location: ewktPoint,
        image_url: publicUrlData.publicUrl,
        type: type,
        description: description,
        status: 'pendiente',
      }])

      if (dbError) throw dbError

      onClose()
    } catch (error) {
      console.error("Submission error:", error)
      setUploadError(error.message || "Error al subir reporte. Revisa la consola o asegúrate tener RLS abierto.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center pointer-events-none">
      <div 
        className="absolute inset-0 bg-black/60 pointer-events-auto transition-opacity"
        onClick={!isSubmitting ? onClose : undefined}
      />
      
      <div className="bg-gray-900 border-t border-gray-800 w-full max-w-md pointer-events-auto rounded-t-3xl shadow-[0_-20px_40px_rgba(0,0,0,0.7)] flex flex-col max-h-[90vh] relative z-10 animate-slide-up">
        
        <div className="flex justify-between items-center p-4 border-b border-gray-800/50">
          <h2 className="text-lg font-bold text-white tracking-tight">Reportar Infracción</h2>
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-white bg-gray-800/50 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 pb-10 flex-1 space-y-6 no-scrollbar">
          
          <div className="bg-gray-800/50 rounded-2xl p-4 flex items-center gap-3 border border-gray-700/50">
            <div className={`p-3 rounded-full ${position ? 'bg-green-500/20 text-green-400' : geoError ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
              <MapPin className="w-6 h-6" />
            </div>
            <div className="flex-1 text-sm">
              <p className="text-gray-400">Ubicación GPS Exacta</p>
              {position ? (
                <p className="font-semibold text-white">[{position.lat.toFixed(5)}, {position.lng.toFixed(5)}]</p>
              ) : geoError ? (
                <p className="font-semibold text-red-400">{geoError}</p>
              ) : (
                <div className="flex items-center gap-2 font-semibold text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Adquiriendo señal...
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className="text-sm text-gray-400 mb-2">Evidencia Fotográfica Verificable</p>
              {!imagePreview ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-40 border-2 border-dashed border-gray-700 hover:border-blue-500/50 bg-gray-800/30 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                >
                  <Camera className="w-10 h-10 text-gray-500" />
                  <span className="text-gray-400 font-medium">Capturar Escena</span>
                </button>
              ) : (
                <div className="relative w-full h-48 rounded-2xl overflow-hidden group">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setImageFile(null); }}
                    className="absolute top-2 right-2 p-2 bg-black/60 backdrop-blur text-white rounded-full opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                ref={fileInputRef}
                onChange={handleCapture}
                className="hidden"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Tipificación de Infracción</label>
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-gray-800/80 border border-gray-700/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="Mal Estacionamiento">Mal Estacionamiento</option>
                <option value="Obstrucción de rampa">Obstrucción de rampa</option>
                <option value="Exceso de Velocidad">Exceso de Velocidad</option>
                <option value="Cruce en Rojo">Cruce en Rojo</option>
                <option value="Uso Indebido Carril">Uso Indebido de Carril</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Detalles / Dominio (Opcional)</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Matrícula del vehículo, detalles adicionales..."
                rows={2}
                className="w-full bg-gray-800/80 border border-gray-700/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {uploadError && (
              <div className="bg-red-500/20 text-red-500 font-medium text-sm p-3 rounded-lg text-center border border-red-500/20">
                {uploadError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !position || !imageFile}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-2 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Cifrando y enviando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" /> Generar Acta de Reporte
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
