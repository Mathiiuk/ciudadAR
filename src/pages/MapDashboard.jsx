import { useState } from 'react'
import { ArrowLeft, Calendar, MapPin, X, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import MapToggleBtn from '../components/MapToggleBtn'
import MapView from '../components/MapView'
import CreateReport from '../components/CreateReport'
import { useInfractions } from '../hooks/useInfractions'

const STATUS_CONFIG = {
  pendiente:   { label: 'Pendiente',  color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: <Clock className="w-3.5 h-3.5" /> },
  aprobada:    { label: 'Aprobada',   color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rechazada:   { label: 'Rechazada',  color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', icon: <XCircle className="w-3.5 h-3.5" /> },
  en_revision: { label: 'Revisión',   color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20', icon: <AlertCircle className="w-3.5 h-3.5" /> },
}

export default function MapDashboard() {
  const [isHeatmapActive, setIsHeatmapActive] = useState(false)
  const [isReporting, setIsReporting] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  
  const { data, loading, handleMapChange } = useInfractions()

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col relative bg-[#020617]">
      <Header />
      
      <div className="absolute inset-0 z-0">
        <MapView 
          data={data} 
          isHeatmapActive={isHeatmapActive}
          onMapChange={handleMapChange}
          onSelectReport={(report) => setSelectedReport(report)}
        />
        {loading && (
          <div className="absolute top-24 right-6 z-[500] bg-slate-900/80 backdrop-blur-md rounded-full border border-white/5 p-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        )}
      </div>

      <MapToggleBtn 
        isHeatmapActive={isHeatmapActive} 
        toggle={() => setIsHeatmapActive(!isHeatmapActive)} 
      />
      
      <BottomNav onReportClick={() => setIsReporting(true)} />

      {isReporting && <CreateReport onClose={() => setIsReporting(false)} />}

      {/* 📄 Detalle Expandido Premium (Copiado de History pero adaptado) */}
      {selectedReport && (
        <div className="fixed inset-0 z-[4000] bg-[#0f172a] flex flex-col animate-slide-up">
            <div className="flex justify-between items-center px-6 py-12 shrink-0">
                <button onClick={() => setSelectedReport(null)} className="p-3 bg-white/5 rounded-2xl active:scale-90 transition">
                    <ArrowLeft className="w-6 h-6 text-slate-400" />
                </button>
                <h3 className="font-black text-slate-400 tracking-widest uppercase text-[10px]">Detalle de Infracción</h3>
                <button onClick={() => setSelectedReport(null)} className="p-3 bg-white/5 rounded-2xl active:scale-90 transition">
                    <X className="w-6 h-6 text-slate-400" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 space-y-8 pb-10">
                <div className="w-full aspect-square rounded-[40px] overflow-hidden shadow-2xl border border-white/10 relative">
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
                  className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-3xl font-black text-white tracking-widest uppercase text-xs transition active:scale-95 shadow-xl shadow-blue-600/20"
                >
                    Cerrar Informe
                </button>
            </div>
        </div>
      )}
    </div>
  )
}

