import { useNavigate } from 'react-router-dom'
import { ShieldHalf } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// Genera iniciales y color determinista
function getInitials(name, email) {
  const source = name || email || 'U'
  return source.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name) {
  const colors = [
    'from-blue-500 to-blue-700',
    'from-purple-500 to-purple-700',
    'from-emerald-500 to-emerald-700',
    'from-orange-500 to-orange-700',
    'from-pink-500 to-pink-700',
    'from-cyan-500 to-cyan-700',
  ]
  const idx = ((name || 'U').charCodeAt(0)) % colors.length
  return colors[idx]
}

export default function Header() {
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const isOficial = role === 'oficial'

  const initials = getInitials(user?.user_metadata?.full_name, user?.email)
  const avatarColor = getAvatarColor(user?.email)

  return (
    <header className="absolute top-0 w-full z-[1000] px-5 py-3.5 flex justify-between items-center backdrop-blur-md bg-gray-900/80 border-b border-gray-800/50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
          <span className="text-white font-bold text-sm tracking-tighter">C</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">CiudadAR</h1>
      </div>
      
      <div className="flex items-center gap-3">
        {isOficial && (
          <button 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full hover:bg-blue-500/20 transition-colors border border-blue-500/30"
          >
            <ShieldHalf className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Oficial</span>
          </button>
        )}

        {/* Mini-avatar dinámico con iniciales */}
        <button
          onClick={() => navigate('/profile')}
          className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-xs font-bold shadow-lg hover:scale-105 active:scale-95 transition-transform`}
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
