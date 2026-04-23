import { useState, useRef } from 'react'
import { Camera, X, MapPin, Send, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useGeolocation } from '../hooks/useGeolocation'
import { processImageToWebP } from '../utils/imageOptimizer'
import PrivacyEditor from './PrivacyEditor'
import { saveInfractionOffline } from '../utils/offlineStore'
import { verifyInfractionImage } from '../utils/verifyInfractionWithAI'

export default function CreateReport({ onClose }) {
  const { user } = useAuth()
  const { position, geoError } = useGeolocation()

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [type, setType] = useState('Mal Estacionamiento')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null) // {valid, reason}
  const [uploadError, setUploadError] = useState(null)
  const [showPrivacyEditor, setShowPrivacyEditor] = useState(false)
  const [rawImage, setRawImage] = useState(null)
  const [honeypot, setHoneypot] = useState('') // Campo trampa para bots
  
  const fileInputRef = useRef(null)

  const handleCapture = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setRawImage(file)
    setShowPrivacyEditor(true)
  }

  const handlePrivacyConfirm = async (blurredBlob) => {
    setShowPrivacyEditor(false)
    setImagePreview(URL.createObjectURL(blurredBlob))
    setImageFile(blurredBlob)
    setVerifyResult(null) // Reset verificación al cambiar foto
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!position) return setUploadError("Aún no detectamos tu ubicación GPS.")
    if (!imageFile) return setUploadError("Debes tomar una foto de la infracción.")
    if (!user) return setUploadError("Sesión de usuario no válida.")
    
    // 🛡️ SEGURIDAD CAPA 1: Honeypot (Trampa para bots)
    if (honeypot.length > 0) return setUploadError("Actividad sospechosa detectada.")

    setIsSubmitting(true)
    setUploadError(null)
    setVerifyResult(null)

    // 🛡️ SEGURIDAD CAPA 2: Límite diario (Protección de Tokens)
    // En modo Desarrollo (VITE DEV) desactivamos el límite para que puedas testear
    if (!import.meta.env.DEV) {
      try {
        const today = new Date().toISOString().split('T')[0]
        const { count, error: countError } = await supabase
          .from('infractions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', today)

        if (countError) throw countError
        if (count >= 10) { // Límite de 10 reportes por día solo en Producción
          setUploadError("⚠️ Has alcanzado el límite diario (10 reportes). Protegemos la comunidad evitando flood.")
          setIsSubmitting(false)
          return
        }
      } catch (err) {
        console.warn("No se pudo verificar el límite diario, procediendo con cautela...")
      }
    }

    // 🛡️ SEGURIDAD CAPA 3: Sanitización XSS (Eliminar etiquetas HTML)
    const sanitizedDescription = description.replace(/<[^>]*>?/gm, '').trim()

    // ─── Verificación IA (Gemini Vision) ──────────────────────────
    setIsVerifying(true)
    const verification = await verifyInfractionImage(imageFile, type)
    setIsVerifying(false)
    setVerifyResult(verification)

    if (!verification.valid) {
      setUploadError(`⚠️ La foto no coincide con el tipo de infracción seleccionada. ${verification.reason}`)
      setIsSubmitting(false)
      return
    }

    // Modo Offline
    if (!navigator.onLine) {
      try {
        await saveInfractionOffline({
          user_id: user.id,
          type: type,
          description: sanitizedDescription,
          image_blob: imageFile, 
          lat: position.lat,
          lng: position.lng,
          status: verifyResult?.valid ? 'aprobada' : 'pendiente'
        })
        
        alert("¡Conexión perdida! Tu reporte se ha guardado localmente y se subirá cuando recuperes la señal.")
        onClose()
        return
      } catch (err) {
        setUploadError("Error al guardar reporte offline: " + err.message)
        setIsSubmitting(false)
        return
      }
    }

    try {
      const fileId = crypto.randomUUID()
      const fileName = `${fileId}.webp`
      
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

      const ewktPoint = `POINT(${position.lng} ${position.lat})`

      const { error: dbError } = await supabase.from('infractions').insert([{
        user_id: user.id,
        location: ewktPoint,
        image_url: publicUrlData.publicUrl,
        type: type,
        description: sanitizedDescription,
        status: verifyResult?.valid ? 'aprobada' : 'pendiente',
      }])

      if (dbError) throw dbError

      onClose()
    } catch (error) {
      console.error("Submission error:", error)
      setUploadError(error.message || "Error general al procesar la subida.")
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

            {/* Honeypot: Invisible para humanos, trampa para bots */}
            <div className="opacity-0 absolute -z-10 h-0 w-0 overflow-hidden">
              <input 
                type="text" 
                value={honeypot} 
                onChange={(e) => setHoneypot(e.target.value)} 
                tabIndex="-1" 
                autoComplete="off" 
              />
            </div>

            {uploadError && (
              <div className="bg-red-500/20 text-red-500 font-medium text-sm p-3 rounded-lg text-center border border-red-500/20">
                {uploadError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>
                    {isVerifying ? "Analizando evidencia con IA..." : "Generando Acta de Reporte..."}
                  </span>
                </>
              ) : (
                <>
                  <Send size={20} />
                  <span>Generar Acta de Reporte</span>
                </>
              )}
            </button>
          </form>
      </div>

      {showPrivacyEditor && rawImage && (
        <PrivacyEditor 
          imageBlob={rawImage} 
          onConfirm={handlePrivacyConfirm}
          onCancel={() => setShowPrivacyEditor(false)}
        />
      )}
      </div>
    </div>
  )
}
