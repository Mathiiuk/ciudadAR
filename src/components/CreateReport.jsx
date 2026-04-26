import { useState, useEffect } from 'react'
import { Camera, MapPin, Send, X, ShieldCheck, ShieldAlert, Loader2, Navigation } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import PrivacyEditor from './PrivacyEditor'
import { verifyInfractionImage } from '../utils/verifyInfractionWithAI'
import { useReverseGeocode } from '../hooks/useReverseGeocode'
import { initDB } from '../hooks/useOfflineSync'

const INFRACTION_TYPES = [
  'Mal Estacionamiento',
  'Obstrucción de rampa',
  'Exceso de Velocidad',
  'Cruce en Rojo',
  'Uso Indebido Carril',
]

export default function CreateReport({ onClose }) {
  const { user } = useAuth()
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [type, setType] = useState(INFRACTION_TYPES[0])
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)
  const [position, setPosition] = useState(null)
  const [uploadError, setUploadError] = useState(null)

  // 🌐 Geocodificación inversa: resuelve coordenadas GPS a dirección textual
  const { locationData, isLoading: isGeoLoading } = useReverseGeocode(position)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.error("Error obteniendo ubicación:", err)
    )
  }, [])

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setIsEditing(true)
    }
  }

  const handlePrivacyConfirm = (blob) => {
    setImageFile(blob)
    setImagePreview(URL.createObjectURL(blob))
    setIsEditing(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!imageFile || !position) return

    setIsSubmitting(true)
    setUploadError(null)
    setVerifyResult(null)

    // Lógica Offline First
    if (!navigator.onLine) {
      try {
        const db = await initDB()
        await db.add('reports', {
          user_id: user.id,
          position,
          imageBlob: imageFile,
          type,
          description: sanitizedDescription,
          locationData,
          timestamp: Date.now()
        })
        console.log("Reporte guardado en modo offline.")
        onClose()
        return
      } catch (err) {
        setUploadError("Error guardando reporte offline.")
        setIsSubmitting(false)
        return
      }
    }

    if (!import.meta.env.DEV) {
      try {
        const today = new Date().toISOString().split('T')[0]
        const { count, error: countError } = await supabase
          .from('infractions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', today)

        if (countError) throw countError
        if (count >= 10) {
          setUploadError("⚠️ Has alcanzado el límite diario (10 reportes).")
          setIsSubmitting(false)
          return
        }
      } catch (err) {
        console.warn("Límite diario no verificado.")
      }
    }

    const sanitizedDescription = description.replace(/<[^>]*>?/gm, '').trim()

    setIsVerifying(true)
    const verification = await verifyInfractionImage(imageFile, type)
    setIsVerifying(false)
    setVerifyResult(verification)

    if (!verification.valid) {
      setUploadError(`⚠️ Verificación rechazada: ${verification.reason}`)
      setIsSubmitting(false)
      return
    }

    try {
      const fileId = crypto.randomUUID()
      const fileName = `${fileId}.webp`
      const { error: storageError } = await supabase.storage
        .from('evidencia-infracciones')
        .upload(fileName, imageFile, { contentType: 'image/webp' })

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
        status: verification.valid ? 'aprobada' : 'pendiente',
        // 🌐 Datos geográficos enriquecidos por Georef (si las columnas existen en la BD)
        ...(locationData && {
          provincia_nombre: locationData.provincia,
          municipio_nombre: locationData.municipio || locationData.departamento,
          direccion: locationData.direccion_completa,
        }),
      }])

      if (dbError) throw dbError
      onClose()
    } catch (error) {
      console.error("Upload error:", error)
      setUploadError("Error crítico al subir el reporte.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isEditing) {
    return <PrivacyEditor imageBlob={imageFile} onConfirm={handlePrivacyConfirm} onCancel={() => setIsEditing(false)} />
  }

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-slate-950 animate-slide-up">
      {/* Header Fijo */}
      <div className="flex justify-between items-center p-6 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl shrink-0">
        <button onClick={onClose} className="p-3 bg-white/5 rounded-2xl active:scale-95 transition">
          <X className="w-6 h-6 text-slate-400" />
        </button>
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Nuevo Reporte</h2>
        <div className="w-12 h-12 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        </div>
      </div>

      {/* Formulario con Scroll */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pt-8 pb-12 space-y-10">
        
        {/* Ubicación Visual - Dirección real desde API Georef */}
        <div className="p-5 rounded-[32px] bg-blue-600/10 border border-blue-500/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center blue-glow shrink-0">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                <Navigation className="w-3 h-3" />
                GPS Activado
              </p>
              {isGeoLoading ? (
                /* Shimmer mientras se resuelve la dirección */
                <div className="mt-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 bg-white/5 rounded-full animate-pulse" />
                  <div className="h-3 w-1/2 bg-white/5 rounded-full animate-pulse" />
                </div>
              ) : locationData ? (
                /* Dirección resuelta correctamente */
                <>
                  <p className="text-white font-bold text-sm truncate mt-0.5">
                    {locationData.direccion || locationData.departamento || locationData.provincia}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {locationData.departamento && locationData.departamento !== locationData.provincia 
                      ? `${locationData.departamento} · ${locationData.provincia}` 
                      : locationData.provincia}
                  </p>
                </>
              ) : (
                /* Fallback si no hay datos Georef */
                <p className="text-white font-bold text-sm mt-0.5">Buenos Aires, Argentina</p>
              )}
            </div>
          </div>
          {/* Coordenadas exactas (colapsadas en estilo sutil) */}
          {position && (
            <div className="mt-3 pt-3 border-t border-blue-500/10 flex gap-4">
              <span className="text-[9px] font-mono text-slate-500">Lat: {position.lat.toFixed(6)}</span>
              <span className="text-[9px] font-mono text-slate-500">Lng: {position.lng.toFixed(6)}</span>
            </div>
          )}
        </div>

        {/* Foto */}
        <div className="space-y-4">
          <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Evidencia Visual</label>
          <div className="relative group aspect-video rounded-[40px] overflow-hidden bg-slate-900 border border-white/5 border-dashed hover:border-blue-500/50 transition-colors flex items-center justify-center">
            {imagePreview ? (
              <>
                <img src={imagePreview} className="w-full h-full object-cover" />
                <button 
                  type="button" 
                  onClick={() => setIsEditing(true)}
                  className="absolute bottom-6 right-6 bg-blue-600 p-4 rounded-3xl shadow-xl active:scale-90 transition text-white font-bold text-xs"
                >
                  RE-EDITAR PRIVACIDAD
                </button>
              </>
            ) : (
              <label className="flex flex-col items-center gap-4 cursor-pointer">
                <Camera className="w-12 h-12 text-slate-700" />
                <span className="text-xs font-bold text-slate-400 tracking-wider">TAP PARA CAPTURAR EVIDENCIA</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>
        </div>

        {/* Tipo e Info */}
        <div className="space-y-8">
            <div className="space-y-3">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Infracción Detectada</label>
                <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-900 border border-white/5 p-5 rounded-3xl text-sm font-bold text-white outline-none focus:border-blue-500/30 transition-all appearance-none cursor-pointer"
                >
                    {INFRACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            <div className="space-y-3">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Detalles Adicionales</label>
                <textarea
                    placeholder="Describe lo que sucede (opcional)..."
                    className="w-full bg-slate-900 border border-white/5 p-5 rounded-[32px] text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500/30 transition-all min-h-[120px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>
        </div>

        {uploadError && (
          <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center gap-4 animate-shake">
            <ShieldAlert className="w-6 h-6 text-rose-500 shrink-0" />
            <p className="text-xs font-bold text-rose-500 leading-relaxed">{uploadError}</p>
          </div>
        )}
      </form>

      {/* Botón de Acción Fijo */}
      <div className="p-6 pt-0 bg-slate-950 border-t border-white/5">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !imageFile}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black py-5 rounded-[32px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl shadow-blue-600/30 uppercase tracking-widest text-xs"
        >
          {isVerifying ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Analizando con IA...</>
          ) : isSubmitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Generando Acta...</>
          ) : (
            <><Send className="w-5 h-5" /> Emitir Reporte Oficial</>
          )}
        </button>
      </div>
    </div>
  )
}
