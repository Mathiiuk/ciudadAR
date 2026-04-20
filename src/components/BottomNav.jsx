import { Home, Map as MapIcon, History, UserCircle2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Inicio', icon: Home, path: '/' },
  { label: 'Mapa',   icon: MapIcon, path: '/map' },
  { label: 'Historial', icon: History, path: '/history' },
  { label: 'Perfil', icon: UserCircle2, path: '/profile' },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="absolute bottom-0 w-full z-[1000] pb-6 pt-3 px-2 backdrop-blur-xl bg-gray-900/85 border-t border-gray-800/80 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <ul className="flex justify-around items-center max-w-sm mx-auto">
        {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
          const active = location.pathname === path
          return (
            <li key={path}>
              <button 
                onClick={() => navigate(path)} 
                className={`flex flex-col items-center gap-1 transition-all p-2 rounded-xl active:scale-90 ${
                  active ? 'text-blue-500' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className={`w-6 h-6 transition-transform ${active ? 'scale-110' : ''}`} />
                <span className={`text-[10px] font-medium tracking-wide ${active ? 'font-bold' : ''}`}>
                  {label}
                </span>
                {active && (
                  <span className="w-1 h-1 rounded-full bg-blue-500 -mt-0.5" />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
