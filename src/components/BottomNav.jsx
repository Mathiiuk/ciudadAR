import { Home, Map as MapIcon, History } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="absolute bottom-0 w-full z-[1000] pb-6 pt-4 px-6 backdrop-blur-xl bg-gray-900/85 border-t border-gray-800/80 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <ul className="flex justify-between items-center max-w-sm mx-auto">
        <li>
          <button 
            onClick={() => navigate('/')} 
            className={`flex flex-col items-center gap-1.5 transition-all p-2 rounded-xl active:scale-95 ${location.pathname === '/' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-medium tracking-wide">Inicio</span>
          </button>
        </li>
        <li>
          <button 
            onClick={() => navigate('/map')} 
            className={`flex flex-col items-center gap-1.5 transition-all p-2 rounded-xl active:scale-95 ${location.pathname === '/map' ? 'text-blue-500' : 'text-gray-400 hover:text-gray-200'}`}
          >
            <MapIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium tracking-wide">Mapa</span>
          </button>
        </li>
        <li>
          <button 
            className="flex flex-col items-center gap-1.5 transition-all p-2 rounded-xl text-gray-400 hover:text-gray-200 active:scale-95"
          >
            <History className="w-6 h-6" />
            <span className="text-[10px] font-medium tracking-wide">Historial</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}
