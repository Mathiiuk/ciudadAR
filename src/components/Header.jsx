import { useNavigate } from 'react-router-dom'
import { ShieldHalf } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

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
    <header className="absolute top-0 w-full z-[1000] px-5 py-3.5 flex justify-between items-center backdrop-blur-md bg-[#020617]/80 border-b border-white/5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/40 blue-glow">
          <span className="text-white font-black text-lg tracking-tighter">C</span>
        </div>
        <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">CiudadAR</h1>
      </div>
      
      <div className="flex items-center gap-4">
        {isOficial && (
          <button 
            onClick={() => navigate('/admin')}
            className="hidden md:flex items-center gap-2 text-blue-400 bg-blue-500/10 px-4 py-2 rounded-full hover:bg-blue-600 hover:text-white transition-all border border-blue-500/20 text-[10px] font-black uppercase tracking-widest active:scale-95"
          >
            <ShieldHalf className="w-4 h-4" />
            Control
          </button>
        )}

        <NotificationBell />

        {/* Mini-avatar dinámico con iniciales */}
        <button
          onClick={() => navigate('/profile')}
          className={`w-10 h-10 rounded-[18px] bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-[11px] font-black shadow-2xl hover:scale-110 active:scale-90 transition-all border border-white/10`}
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
