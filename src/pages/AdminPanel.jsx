import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ShieldAlert, CheckCircle, XCircle, ArrowLeft, Loader2, LayoutDashboard, ClipboardList, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AnalyticsDashboard from '../components/AnalyticsDashboard'

export default function AdminPanel() {
  const navigate = useNavigate()
  const { role, user } = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('revision')
  const [jurisdiction, setJurisdiction] = useState(null)

  useEffect(() => {
    if (role !== 'oficial') return
    
    const fetchAdminData = async () => {
      setLoading(true)

      // 1. Obtener jurisdicción del perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('jurisdiction')
        .eq('id', user.id)
        .single()
      
      setJurisdiction(profile?.jurisdiction)

      // 2. Obtener reportes (el RLS ya filtrará si hay jurisdicción, 
      // pero añadimos el filtro explícito para mayor claridad y control)
      let query = supabase
        .from('infractions')
        .select('*, profiles(full_name)')
        .eq('status', 'pendiente')

      if (profile?.jurisdiction) {
        // Filtramos por municipio o provincia si está asignado
        query = query.or(`municipio.eq."${profile.jurisdiction}",provincia.eq."${profile.jurisdiction}"`)
      }

      const { data: reportsData } = await query.order('created_at', { ascending: false })

      if (reportsData) setReports(reportsData)
      setLoading(false)
    }

    fetchAdminData()
  }, [role, user?.id])

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

  const exportAllToCSV = async () => {
    const { data, error } = await supabase
      .from('infractions')
      .select('id, created_at, type, status, provincia_nombre, municipio_nombre, direccion')
      .order('created_at', { ascending: false })
    
    if (error) return alert("Error exportando: " + error.message)

    const headers = "ID,Fecha,Tipo,Estado,Provincia,Municipio,Direccion\n"
    const csvContent = data.map(r => `${r.id},${r.created_at},${r.type},${r.status},${r.provincia_nombre || ''},${r.municipio_nombre || ''},${r.direccion || ''}`).join("\n")
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `reporte_completo_ciudadar_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/map')}
              className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition active:scale-95"
            >
              <ArrowLeft className="w-6 h-6 text-slate-400" />
            </button>
            <div>
              <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
                <ShieldAlert className="text-blue-500 w-8 h-8" />
                CENTRO DE CONTROL
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Gestión Inteligente</p>
                {jurisdiction && (
                    <span className="bg-blue-600/10 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-md border border-blue-500/20 uppercase tracking-widest">
                        Jurisdicción: {jurisdiction}
                    </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex bg-slate-900/50 p-1.5 rounded-[22px] border border-white/5 backdrop-blur-md">
            <TabButton 
              active={activeTab === 'revision'} 
              onClick={() => setActiveTab('revision')} 
              icon={<ClipboardList className="w-4 h-4" />}
              label="Revisión"
              count={reports.length}
            />
            <TabButton 
              active={activeTab === 'analytics'} 
              onClick={() => setActiveTab('analytics')} 
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Analítica"
            />
          </div>
        </header>

        {activeTab === 'revision' ? (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Actas Pendientes</h2>
                <button 
                    onClick={exportAllToCSV}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-blue-600/10 text-blue-400 px-4 py-2 rounded-full border border-blue-500/20 hover:bg-blue-600 hover:text-white transition"
                >
                    <Download className="w-3 h-3" /> Exportar Full DB
                </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              </div>
            ) : reports.length === 0 ? (
              <div className="bg-slate-900/50 border border-white/5 rounded-[40px] p-20 text-center backdrop-blur-xl">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-[30px] flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black text-white">Bandeja Limpia</h2>
                <p className="text-slate-500 mt-2 max-w-xs mx-auto">No hay nuevos reportes esperando validación en este momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {reports.map(report => (
                  <ReportCard key={report.id} report={report} onUpdate={handleUpdateStatus} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <AnalyticsDashboard />
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon, label, count }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
        active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
          : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {icon} {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-1 px-2 py-0.5 rounded-full text-[9px] ${active ? 'bg-white/20' : 'bg-slate-800'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

function ReportCard({ report, onUpdate }) {
  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-[36px] overflow-hidden flex flex-col shadow-2xl backdrop-blur-xl group hover:border-white/10 transition-all duration-500">
      <div className="relative h-56 overflow-hidden">
        <img src={report.image_url} alt="Evidencia" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
        <span className="absolute bottom-4 left-6 text-[9px] font-black uppercase tracking-widest bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full text-slate-300 border border-white/5">
          {new Date(report.created_at).toLocaleDateString()}
        </span>
      </div>
      <div className="p-8 flex-1 flex flex-col">
        <h3 className="font-black text-xl text-white mb-2 leading-tight uppercase tracking-tight">{report.type}</h3>
        <p className="text-xs text-slate-400 mb-6 flex-1 leading-relaxed italic">
          "{report.description || "Sin descripción adicional proporcionada."}"
        </p>
        
        <div className="pt-6 border-t border-white/5 flex flex-col gap-3">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
            Ciudadano: <span className="text-slate-300">{report.profiles?.full_name || 'Anónimo'}</span>
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => onUpdate(report.id, 'aprobada')}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl flex justify-center items-center gap-2 transition active:scale-95 shadow-lg shadow-emerald-900/20 text-[10px] font-black uppercase tracking-widest"
            >
              <CheckCircle className="w-4 h-4" /> Aprobar
            </button>
            <button 
              onClick={() => onUpdate(report.id, 'rechazada')}
              className="flex-1 bg-white/5 hover:bg-rose-600 text-slate-400 hover:text-white py-4 rounded-2xl flex justify-center items-center gap-2 transition active:scale-95 border border-white/5 hover:border-rose-500 text-[10px] font-black uppercase tracking-widest"
            >
              <XCircle className="w-4 h-4" /> Rechazar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
