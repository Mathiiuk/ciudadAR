import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ShieldAlert, CheckCircle, XCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function AdminPanel() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Re-verify strictly despite ProtectedRoute just in case 
    if (role !== 'oficial') return
    
    const fetchPendingReports = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('infractions')
        .select('*, profiles(full_name)')
        .eq('status', 'pendiente')
        .order('created_at', { ascending: false })

      if (data) setReports(data)
      setLoading(false)
    }

    fetchPendingReports()
  }, [role])

  const handleUpdateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('infractions')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      setReports(prev => prev.filter(r => r.id !== id))
    } else {
      alert("Error al actualizar: " + error.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/map')}
            className="p-3 bg-gray-800 rounded-xl hover:bg-gray-700 transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShieldAlert className="text-blue-500 w-8 h-8" />
              Panel de Oficial
            </h1>
            <p className="text-gray-400">Revisión de actas viales pendientes</p>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-10 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Bandeja Limpia</h2>
            <p className="text-gray-400 mt-2">No hay reportes nuevos pendientes de revisión.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reports.map(report => (
              <div key={report.id} className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden flex flex-col shadow-lg">
                <img src={report.image_url} alt="Evidencia" className="h-48 w-full object-cover" />
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-red-400">{report.type}</h3>
                    <span className="text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded-md">
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-4 flex-1">
                    {report.description || "Sin descripción proporcionada."}
                  </p>
                  <p className="text-xs text-gray-500 mb-4">
                    Reportado por: {report.profiles?.full_name || 'Ciudadano'}
                  </p>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleUpdateStatus(report.id, 'aprobada')}
                      className="flex-1 bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white border border-green-500/50 py-2 rounded-xl flex justify-center items-center gap-2 transition"
                    >
                      <CheckCircle className="w-5 h-5" /> Aprobar
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(report.id, 'rechazada')}
                      className="flex-1 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/50 py-2 rounded-xl flex justify-center items-center gap-2 transition"
                    >
                      <XCircle className="w-5 h-5" /> Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
