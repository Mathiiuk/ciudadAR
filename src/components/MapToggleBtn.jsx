import { useState } from 'react'
import { Layers, Flame, Map as MapIcon, X } from 'lucide-react'

// Componente responsivo con menú expandible para móviles y desktop
export default function MapToggleBtn({ isHeatmapActive, toggle, isComunasActive, toggleComunas }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="absolute bottom-[104px] md:bottom-8 right-4 md:right-6 z-[1000] flex flex-col items-end gap-3">
      
      {/* Menú de Opciones (Expandible) */}
      <div 
        className={`flex flex-col gap-3 transition-all duration-300 origin-bottom-right ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Botón Comunas */}
        <button
          onClick={() => { toggleComunas(); setIsOpen(false) }}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-xl shadow-2xl transition-all active:scale-95 ${
            isComunasActive
              ? 'bg-blue-600/90 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/50'
              : 'bg-slate-900/90 text-slate-300 border border-slate-700/80 hover:bg-slate-800'
          }`}
        >
          <span className="text-[10px] md:text-xs font-black tracking-widest uppercase">Límites Comunas</span>
          <MapIcon className="w-5 h-5" />
        </button>

        {/* Botón Heatmap */}
        <button
          onClick={() => { toggle(); setIsOpen(false) }}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-xl shadow-2xl transition-all active:scale-95 ${
            isHeatmapActive
              ? 'bg-orange-500/90 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] border border-orange-400/50'
              : 'bg-slate-900/90 text-slate-300 border border-slate-700/80 hover:bg-slate-800'
          }`}
        >
          <span className="text-[10px] md:text-xs font-black tracking-widest uppercase">Mapa de Calor</span>
          <Flame className="w-5 h-5" />
        </button>
      </div>

      {/* Botón Flotante Principal (Toggle Menú) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex justify-center items-center backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-300 active:scale-90 ${
          isOpen 
            ? 'bg-slate-800 text-white border border-slate-600 rotate-90' 
            : 'bg-[#0f172a]/90 text-blue-400 border border-white/10 hover:bg-slate-800 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
      </button>

    </div>
  )
}
