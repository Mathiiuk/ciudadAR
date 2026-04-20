import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('infractions')
        .select('id, type, description, status, image_url, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setReports(data)
      setLoading(false)
    }
    fetchHistory()
  }, [user])

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
                <div key={report.id} className="flex gap-3 bg-gray-800/60 border border-gray-700/50 rounded-2xl overflow-hidden active:scale-[0.99] transition">
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
    </div>
  )
}
