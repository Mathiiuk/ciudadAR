import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getOfflineInfractions, deleteOfflineInfraction } from '../utils/offlineStore'
import { Wifi, RefreshCcw, Loader2 } from 'lucide-react'

const STATUS_CONFIG = {
  pendiente:   { label: 'Pendiente',  color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <Clock className="w-3 h-3" /> },
  aprobada:    { label: 'Aprobada',   color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: <CheckCircle className="w-3 h-3" /> },
  rechazada:   { label: 'Rechazada',  color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <XCircle className="w-3 h-3" /> },
  en_revision: { label: 'En revisión',color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <AlertCircle className="w-3 h-3" /> },
}

export default function History() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [reports, setReports] = useState([])
  const [offlineReports, setOfflineReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)

  useEffect(() => {
    if (!user) return
    const fetchHistory = async () => {
      // 1. Fetch de Supabase
      const { data, error } = await supabase
        .from('infractions')
        .select('id, type, description, status, image_url, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setReports(data)
      
      // 2. Fetch de Offline
      const localData = await getOfflineInfractions()
      setOfflineReports(localData)
      
      setLoading(false)
    }
    fetchHistory()
  }, [user])

  const handleSync = async () => {
    if (isSyncing || offlineReports.length === 0) return
    setIsSyncing(true)

    try {
      for (const report of offlineReports) {
        const fileId = crypto.randomUUID()
        const fileName = `${fileId}.webp`

        // 1. Subir imagen
        const { error: storageError } = await supabase.storage
          .from('evidencia-infracciones')
          .upload(fileName, report.image_blob, { contentType: 'image/webp' })

        if (storageError) throw storageError

        const { data: publicUrlData } = supabase.storage
          .from('evidencia-infracciones')
          .getPublicUrl(fileName)

        // 2. Insertar en DB
        const ewktPoint = `POINT(${report.lng} ${report.lat})`
        const { error: dbError } = await supabase.from('infractions').insert([{
          user_id: report.user_id,
          location: ewktPoint,
          image_url: publicUrlData.publicUrl,
          type: report.type,
          description: report.description,
          status: 'pendiente',
        }])

        if (dbError) throw dbError

        // 3. Borrar de IndexedDB
        await deleteOfflineInfraction(report.id)
      }

      // Recargar todo
      const localData = await getOfflineInfractions()
      setOfflineReports(localData)
      
      const { data: freshReports } = await supabase
        .from('infractions')
        .select('id, type, description, status, image_url, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (freshReports) setReports(freshReports)
      
    } catch (error) {
      console.error("Sync error:", error)
      alert("Error al sincronizar. Reintenta cuando tengas mejor señal.")
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-5 py-4 backdrop-blur-md bg-gray-900/80 border-b border-gray-800/50">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-gray-800/60 hover:bg-gray-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold tracking-tight">Historial</h1>
          <p className="text-xs text-gray-400">Mis reportes enviados</p>
        </div>
      </div>

      <div className="px-4 py-5 max-w-md mx-auto w-full">
        {/* Banner Offline */}
        {offlineReports.length > 0 && (
          <div className="mb-6 bg-blue-600 rounded-2xl p-4 shadow-lg shadow-blue-600/30 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-full">
                <Wifi className="w-5 h-5 text-white" />
              </div>
              <div className="text-white">
                <p className="text-sm font-bold">{offlineReports.length} pendientes</p>
                <p className="text-[10px] opacity-80">Reportes guardados offline</p>
              </div>
            </div>
            <button 
              onClick={handleSync}
              disabled={isSyncing || !navigator.onLine}
              className="bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform disabled:opacity-50"
            >
              {isSyncing ? <Loader2 className="w-3 h-3 animate-spin"/> : <RefreshCcw className="w-3 h-3"/>}
              {navigator.onLine ? 'Sincronizar' : 'Esperando Red'}
            </button>
          </div>
        )}
        {loading ? (
          <div className="flex flex-col gap-4 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-gray-800/50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
              <Camera className="w-9 h-9 text-gray-600" />
            </div>
            <h2 className="text-lg font-bold text-white">Aún no hay reportes</h2>
            <p className="text-sm text-gray-400 max-w-[220px]">
              Usa el botón "+" en el mapa para registrar tu primera infracción vial.
            </p>
            <button
              onClick={() => navigate('/map')}
              className="mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-6 py-3 rounded-xl transition"
            >
              Ir al Mapa
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mt-2">
            {reports.map(report => {
              const st = STATUS_CONFIG[report.status] || STATUS_CONFIG['pendiente']
              return (
                <div 
                  key={report.id} 
                  onClick={() => setSelectedReport(report)}
                  className="flex gap-3 bg-gray-800/60 border border-gray-700/50 rounded-2xl overflow-hidden active:scale-[0.99] transition cursor-pointer"
                >
                  {/* Miniatura */}
                  <div className="w-24 h-24 flex-shrink-0 bg-gray-700">
                    <img
                      src={report.image_url}
                      alt={report.type}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 py-3 pr-3 flex flex-col justify-between">
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">{report.type}</p>
                      {report.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{report.description}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">
                        {new Date(report.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold border px-2 py-0.5 rounded-full ${st.color}`}>
                        {st.icon} {st.label}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Detalle Expandido */}
      {selectedReport && (
        <div className="fixed inset-0 z-[2000] flex flex-col bg-gray-900 animate-slide-up">
          <div className="flex justify-between items-center p-4 border-b border-gray-800">
            <button 
              onClick={() => setSelectedReport(null)}
              className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-full"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="font-bold">Detalle del Reporte</h2>
            <div className="w-10" />
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="w-full aspect-video bg-black flex items-center justify-center">
              <img 
                src={selectedReport.image_url} 
                alt={selectedReport.type}
                className="max-h-full object-contain"
              />
            </div>

            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold border px-3 py-1 rounded-full mb-3 ${STATUS_CONFIG[selectedReport.status]?.color}`}>
                    {STATUS_CONFIG[selectedReport.status]?.icon} {STATUS_CONFIG[selectedReport.status]?.label}
                  </span>
                  <h1 className="text-2xl font-black text-white leading-tight">{selectedReport.type}</h1>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-800/40 border border-gray-700/30 p-4 rounded-2xl">
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Descripción / Detalles</p>
                  <p className="text-white text-sm leading-relaxed">
                    {selectedReport.description || "Sin descripción proporcionada."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800/40 border border-gray-700/30 p-4 rounded-2xl">
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Fecha</p>
                    <p className="text-white text-sm font-bold">
                      {new Date(selectedReport.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-gray-800/40 border border-gray-700/30 p-4 rounded-2xl">
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">ID</p>
                    <p className="text-white text-xs font-mono opacity-60">
                      #{selectedReport.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-900 border-t border-gray-800">
             <button 
                onClick={() => setSelectedReport(null)}
                className="w-full bg-blue-600 py-4 rounded-2xl font-bold text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-transform"
             >
                Cerrar Detalle
             </button>
          </div>
        </div>
      )}
    </div>
  )
}
