import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Bell, Check, Clock, Info, X } from 'lucide-react'

export default function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!user) return

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.read).length)
      }
    }

    fetchNotifications()

    // Real-time subscription
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev].slice(0, 10))
          setUnreadCount(prev => prev + 1)
          
          // Play a subtle notification sound or haptic feedback if desired
          if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(50);
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all relative border border-white/5 active:scale-90"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-blue-400 animate-pulse' : 'text-slate-400'}`} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-slate-900 shadow-lg shadow-red-500/30">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[2000]" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-4 w-80 bg-slate-900 border border-white/10 rounded-[28px] shadow-2xl z-[2001] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-800/30">
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Notificaciones</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[9px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300"
                >
                  Marcar leídas
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <Info className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-xs text-slate-500 font-bold">Sin novedades aún</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-5 hover:bg-white/5 transition-colors ${!n.read ? 'bg-blue-600/5' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center ${
                          n.message.includes('aprobada') ? 'bg-emerald-500/10 text-emerald-500' :
                          n.message.includes('rechazada') ? 'bg-rose-500/10 text-rose-500' :
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                          {n.message.includes('aprobada') ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-[11px] font-black text-white leading-tight mb-1">{n.title}</p>
                          <p className="text-[10px] text-slate-400 leading-relaxed">{n.message}</p>
                          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-2">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!n.read && (
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1 shrink-0" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-800/30 border-t border-white/5">
                <button 
                    onClick={() => setIsOpen(false)}
                    className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition"
                >
                    Cerrar
                </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
