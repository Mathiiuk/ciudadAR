import { useState } from 'react'
import { ArrowLeft, Calendar, MapPin, X, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import MapToggleBtn from '../components/MapToggleBtn'
import MapView from '../components/MapView'
import CreateReport from '../components/CreateReport'
import { useInfractions } from '../hooks/useInfractions'

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: <Clock className="w-3.5 h-3.5" /> },
  aprobada: { label: 'Aprobada', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rechazada: { label: 'Rechazada', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', icon: <XCircle className="w-3.5 h-3.5" /> },
  en_revision: { label: 'Revisión', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20', icon: <AlertCircle className="w-3.5 h-3.5" /> },
}

export default function MapDashboard() {
  const [isHeatmapActive, setIsHeatmapActive] = useState(false)
  const [isComunasActive, setIsComunasActive] = useState(false) // toggle para capa de comunas
  const [isMunicipiosActive, setIsMunicipiosActive] = useState(false) // toggle para municipios BsAs
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
          isComunasActive={isComunasActive}
          isMunicipiosActive={isMunicipiosActive}
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
        isComunasActive={isComunasActive}
        toggleComunas={() => setIsComunasActive(!isComunasActive)}
        isMunicipiosActive={isMunicipiosActive}
        toggleMunicipios={() => setIsMunicipiosActive(!isMunicipiosActive)}
      />

      <BottomNav onReportClick={() => setIsReporting(true)} />

      {isReporting && <CreateReport onClose={() => setIsReporting(false)} />}

      {/* 📄 Detalle Expandido Premium (Responsive) */}
      {selectedReport && (
        <div className="fixed inset-0 z-[4000] bg-black/80 backdrop-blur-md flex items-center justify-center p-0 md:p-6 animate-slide-up">
          <div className="bg-[#0f172a] w-full h-full md:h-auto md:max-h-[85vh] md:max-w-5xl md:rounded-[40px] flex flex-col md:flex-row overflow-hidden shadow-2xl border border-white/10 relative">

            {/* Mobile Header (Solo visible en móvil) */}
            <div className="flex md:hidden justify-between items-center px-6 py-8 shrink-0 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-[#0f172a] to-transparent">
              <button onClick={() => setSelectedReport(null)} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl active:scale-90 transition">
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <h3 className="font-black text-white tracking-widest uppercase text-[10px] drop-shadow-md">Detalle de Infracción</h3>
              <div className="w-12"></div>
            </div>

            {/* Botón Cerrar Desktop */}
            <button onClick={() => setSelectedReport(null)} className="hidden md:flex absolute top-6 right-6 z-20 p-3 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition text-white">
              <X className="w-6 h-6" />
            </button>

            {/* Sección de Imagen */}
            <div className="w-full md:w-1/2 aspect-square md:aspect-auto h-[45vh] md:h-full relative shrink-0">
              <img src={selectedReport.image_url} className="w-full h-full object-cover" alt="Evidencia de infracción" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent md:hidden"></div>
            </div>

            {/* Sección de Contenido */}
            <div className="flex-1 flex flex-col overflow-y-auto p-6 md:p-10 relative z-10 bg-[#0f172a]">
              <div className="space-y-8 flex-1">
                <div>
                  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5 mb-4 ${STATUS_CONFIG[selectedReport.status]?.color}`}>
                    {STATUS_CONFIG[selectedReport.status]?.icon} {STATUS_CONFIG[selectedReport.status]?.label}
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">{selectedReport.type}</h2>
                </div>

                <div className="space-y-4">
                  <div className="p-6 bg-white/5 border border-white/5 rounded-[32px]">
                    <h5 className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-3">Evidencia Capturada</h5>
                    <p className="text-sm md:text-base text-slate-300 leading-relaxed italic">
                      "{selectedReport.description || 'Sin comentarios adicionales.'}"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-white/5 border border-white/5 rounded-[28px] flex flex-col gap-2">
                      <div className="p-2 bg-slate-800 rounded-xl w-fit"><Calendar className="w-4 h-4 text-blue-400" /></div>
                      <div>
                        <p className="text-[8px] uppercase tracking-widest text-slate-500 font-black">Fecha</p>
                        <p className="text-xs font-bold text-slate-300">{new Date(selectedReport.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="p-5 bg-white/5 border border-white/5 rounded-[28px] flex flex-col gap-2">
                      <div className="p-2 bg-slate-800 rounded-xl w-fit"><MapPin className="w-4 h-4 text-emerald-400" /></div>
                      <div>
                        <p className="text-[8px] uppercase tracking-widest text-slate-500 font-black">Ubicación</p>
                        <p className="text-xs font-bold text-slate-300 leading-relaxed">
                          {/* Mostrar dirección real si está disponible en el reporte */}
                          {selectedReport.direccion || selectedReport.provincia || 'Buenos Aires, AR'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 shrink-0">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="w-full bg-blue-600 hover:bg-blue-500 py-4 md:py-5 rounded-2xl md:rounded-3xl font-black text-white tracking-widest uppercase text-xs transition active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
                >
                  Cerrar Informe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

