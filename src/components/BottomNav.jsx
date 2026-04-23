import { Map as MapIcon, History, Shield } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function BottomNav({ onReportClick }) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="fixed bottom-6 left-0 right-0 z-[2000] px-6 pointer-events-none">
      <nav className="pointer-events-auto max-w-sm mx-auto bg-slate-900/95 backdrop-blur-2xl rounded-[35px] p-2 flex items-center justify-between border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        
        {/* Mapa */}
        <button 
          onClick={() => navigate('/map')}
          className={`flex-1 flex flex-col items-center gap-1.5 p-4 rounded-3xl transition-all ${location.pathname === '/map' ? 'text-blue-500' : 'text-slate-500'}`}
        >
          <MapIcon className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest leading-none">Mapa</span>
        </button>

        {/* 🛡️ BOTÓN DE ACCIÓN CENTRAL (REPORTAR) */}
        <div className="relative translate-y-[-24px]">
            <button 
                onClick={onReportClick}
                className="w-16 h-16 bg-blue-600 rounded-[22px] flex items-center justify-center blue-glow shadow-2xl active:scale-90 transition-transform relative group"
            >
                <Shield className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                <div className="absolute inset-0 bg-white/20 rounded-[22px] animate-pulse pointer-events-none" />
                
                {/* Tooltip o mini tag */}
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] font-black uppercase tracking-[0.2em] text-blue-400 whitespace-nowrap">Reportar</span>
            </button>
        </div>

        {/* Historial */}
        <button 
          onClick={() => navigate('/history')}
          className={`flex-1 flex flex-col items-center gap-1.5 p-4 rounded-3xl transition-all ${location.pathname === '/history' ? 'text-blue-500' : 'text-slate-500'}`}
        >
          <History className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-widest leading-none">Historial</span>
        </button>

      </nav>
    </div>
  )
}
