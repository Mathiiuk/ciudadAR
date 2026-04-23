import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Camera, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Wifi,
  RefreshCcw,
  Loader2,
  Calendar,
  MapPin,
  ChevronRight
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getOfflineInfractions, deleteOfflineInfraction } from '../utils/offlineStore'

const STATUS_CONFIG = {
  pendiente:   { label: 'Pendiente',  color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: <Clock className="w-3.5 h-3.5" /> },
  aprobada:    { label: 'Aprobada',   color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rechazada:   { label: 'Rechazada',  color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', icon: <XCircle className="w-3.5 h-3.5" /> },
  en_revision: { label: 'Revisión',   color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20', icon: <AlertCircle className="w-3.5 h-3.5" /> },
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
      const { data, error } = await supabase
        .from('infractions')
        .select('id, type, description, status, image_url, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setReports(data)
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
        const { error: storageError } = await supabase.storage
          .from('evidencia-infracciones')
          .upload(fileName, report.image_blob, { contentType: 'image/webp' })
        if (storageError) throw storageError
        const { data: publicUrlData } = supabase.storage
          .from('evidencia-infracciones')
          .getPublicUrl(fileName)
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
        await deleteOfflineInfraction(report.id)
      }
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
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0f172a]">
      {/* Header Fijo */}
      <header className="sticky top-0 z-[100] bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5 pt-12 pb-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Historial</h1>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Mis Reportes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-400">{reports.length}</span>
        </div>
      </header>

      {/* Area de Scroll Contenido */}
      <main className="flex-1 px-6 pt-6 pb-20">
        
        {/* Banner Offline mejorado */}
        {offlineReports.length > 0 && (
          <div className="mb-8 p-5 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl shadow-blue-500/20 relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                        <Wifi className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-white">Reportes Offline</h4>
                        <p className="text-[10px] text-blue-100 font-medium">Hay {offlineReports.length} actas pendientes de envío</p>
                    </div>
                </div>
                <button 
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="w-full bg-white text-blue-600 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCcw className="w-4 h-4"/>}
                    Sincronizar Ahora
                </button>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-white/5 border border-white/5 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/50 flex items-center justify-center mb-6 border border-white/5">
              <Camera className="w-7 h-7 text-slate-600" />
            </div>
            <h3 className="text-slate-400 font-bold mb-2">Sin actividad aún</h3>
            <p className="text-slate-500 text-xs max-w-[200px] leading-relaxed">Tus reportes aparecerán aquí después de enviarlos al mapa.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report, idx) => {
              const st = STATUS_CONFIG[report.status] || STATUS_CONFIG['pendiente']
              return (
                <div 
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="group relative bg-[#1e293b]/50 border border-white/5 rounded-3xl p-3 flex gap-4 active:scale-[0.98] transition-all hover:bg-white/5"
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-white/10">
                    <img src={report.image_url} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1 py-1 flex flex-col justify-between overflow-hidden">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-500 font-mono">#{report.id.slice(0, 6)}</span>
                            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${st.color}`}>
                                {st.icon} {st.label}
                            </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-200 truncate">{report.type}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center pr-1">
                    <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-slate-500 transition" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Detalle Expandido Premium */}
      {selectedReport && (
        <div className="fixed inset-0 z-[2000] bg-[#0f172a] flex flex-col animate-slide-up">
            <div className="flex justify-between items-center px-6 py-12 shrink-0">
                <button onClick={() => setSelectedReport(null)} className="p-3 bg-white/5 rounded-2xl active:scale-90 transition">
                    <ArrowLeft className="w-6 h-6 text-slate-400" />
                </button>
                <h3 className="font-black text-slate-400 tracking-widest uppercase text-[10px]">Detalle de Infracción</h3>
                <div className="w-12" />
            </div>

            <div className="flex-1 overflow-y-auto px-6 space-y-8 pb-10">
                <div className="w-full aspect-square rounded-[40px] overflow-hidden shadow-2xl border border-white/10">
                    <img src={selectedReport.image_url} className="w-full h-full object-cover" alt="" />
                </div>

                <div className="space-y-6">
                    <div>
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5 mb-4 ${STATUS_CONFIG[selectedReport.status]?.color}`}>
                            {STATUS_CONFIG[selectedReport.status]?.icon} {STATUS_CONFIG[selectedReport.status]?.label}
                        </span>
                        <h2 className="text-3xl font-black text-white leading-none">{selectedReport.type}</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="p-6 bg-white/5 border border-white/5 rounded-[32px]">
                            <h5 className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-3">Evidencia Capturada</h5>
                            <p className="text-sm text-slate-300 leading-relaxed italic">
                                "{selectedReport.description || 'Sin comentarios adicionales.'}"
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 bg-white/5 border border-white/5 rounded-[28px] flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-xl"><Calendar className="w-4 h-4 text-blue-400" /></div>
                                <div>
                                    <p className="text-[8px] uppercase tracking-widest text-slate-500 font-black">Fecha</p>
                                    <p className="text-[11px] font-bold text-slate-300">{new Date(selectedReport.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="p-5 bg-white/5 border border-white/5 rounded-[28px] flex items-center gap-3">
                                <div className="p-2 bg-slate-800 rounded-xl"><MapPin className="w-4 h-4 text-emerald-400" /></div>
                                <div>
                                    <p className="text-[8px] uppercase tracking-widest text-slate-500 font-black">Ubicación</p>
                                    <p className="text-[11px] font-bold text-slate-300">Buenos Aires, AR</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 pb-12 bg-gradient-to-t from-[#0f172a] via-[#0f172a] to-transparent">
                <button 
                  onClick={() => setSelectedReport(null)}
                  className="w-full bg-slate-800 hover:bg-slate-700 py-5 rounded-3xl font-black text-slate-300 tracking-widest uppercase text-xs transition active:scale-95"
                >
                    Cerrar Informe
                </button>
            </div>
        </div>
      )}
    </div>
  )
}
