import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCircle2, ShieldHalf } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function Header() {
  const navigate = useNavigate()
  const [isOficial, setIsOficial] = useState(false)

  useEffect(() => {
    const checkRole = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
        if (data?.role === 'oficial') {
          setIsOficial(true)
        }
      }
    }
    checkRole()
  }, [])

  return (
    <header className="absolute top-0 w-full z-[1000] px-6 py-4 flex justify-between items-center backdrop-blur-md bg-gray-900/80 border-b border-gray-800/50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
          <span className="text-white font-bold text-sm tracking-tighter">C</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">CiudadAR</h1>
      </div>
      
      <div className="flex items-center gap-4">
        {isOficial && (
          <button 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full hover:bg-blue-500/20 transition-colors border border-blue-500/30"
          >
            <ShieldHalf className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Oficial</span>
          </button>
        )}
        <button className="text-gray-300 hover:text-white transition-colors active:scale-95">
          <UserCircle2 className="w-7 h-7" />
        </button>
      </div>
    </header>
  )
}
