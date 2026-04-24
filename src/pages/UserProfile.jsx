import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, LogOut, Edit3, Check, X, 
  FileText, Clock, CheckCircle, AlertCircle, ChevronRight, MapPin
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

// Genera un color determinista basado en el nombre (siempre el mismo color)
function getAvatarColor(name) {
  const colors = [
    'from-blue-500 to-blue-700',
    'from-purple-500 to-purple-700',
    'from-emerald-500 to-emerald-700',
    'from-orange-500 to-orange-700',
    'from-pink-500 to-pink-700',
    'from-cyan-500 to-cyan-700',
  ]
  const idx = (name?.charCodeAt(0) || 0) % colors.length
  return colors[idx]
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="flex-1 bg-gray-800/60 border border-gray-700/50 rounded-2xl p-4 flex flex-col items-center gap-1">
      <div className={`p-2 rounded-full ${color} mb-1`}>{icon}</div>
      <span className="text-2xl font-bold text-white">{value ?? '—'}</span>
      <span className="text-[11px] text-gray-400 text-center leading-tight">{label}</span>
    </div>
  )
}

export default function UserProfile() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ total: 0, aprobadas: 0, pendientes: 0 })
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      // Traer perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setFullName(profileData.full_name || '')
        setUsername(profileData.username || '')
      }

      // Traer estadísticas de infracciones
      const { data: infractions } = await supabase
        .from('infractions')
        .select('status')
        .eq('user_id', user.id)

      if (infractions) {
        setStats({
          total: infractions.length,
          aprobadas: infractions.filter(i => i.status === 'aprobada').length,
          pendientes: infractions.filter(i => i.status === 'pendiente').length,
        })
      }
    }
    fetchData()
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, username })
      .eq('id', user.id)

    if (error) {
      setSaveError(error.message)
    } else {
      setProfile(prev => ({ ...prev, full_name: fullName, username }))
      setEditing(false)
    }
    setSaving(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const avatarColor = getAvatarColor(profile?.full_name || user?.email)

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 backdrop-blur-md bg-gray-900/80 border-b border-gray-800/50">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-gray-800/60 hover:bg-gray-700 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold tracking-tight">Mi Perfil</h1>
        <button
          onClick={handleSignOut}
          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 pb-12 pt-6 flex flex-col gap-6 max-w-md mx-auto w-full">

        {/* Avatar + nombre */}
        <div className="flex flex-col items-center gap-3">
          <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center shadow-2xl text-3xl font-bold text-white select-none`}>
            {initials}
          </div>

          {editing ? (
            <div className="w-full flex flex-col gap-2">
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nombre completo"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Nombre de usuario"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {saveError && <p className="text-red-400 text-xs text-center">{saveError}</p>}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => { setEditing(false); setSaveError(null) }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <p className="text-xl font-bold">{profile?.full_name || 'Sin nombre'}</p>
              <p className="text-sm text-gray-400">@{profile?.username || '...'}</p>
              <p className="text-xs text-gray-500 mb-1">{user?.email}</p>
              
              {profile?.municipio_nombre && profile?.provincia_nombre && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{profile.municipio_nombre}, {profile.provincia_nombre}</span>
                </div>
              )}

              <button
                onClick={() => setEditing(true)}
                className="mt-2 flex items-center gap-1.5 text-blue-400 text-xs border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 rounded-full hover:bg-blue-500/20 transition"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar perfil
              </button>
            </div>
          )}
        </div>

        {/* Badge rol */}
        {profile?.role === 'oficial' && (
          <div className="flex justify-center">
            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
              🛡️ Oficial Verificado
            </span>
          </div>
        )}

        {/* Estadísticas */}
        <div>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Mi Actividad</h2>
          <div className="flex gap-3">
            <StatCard
              icon={<FileText className="w-4 h-4 text-blue-400" />}
              label="Total Reportes"
              value={stats.total}
              color="bg-blue-500/10"
            />
            <StatCard
              icon={<CheckCircle className="w-4 h-4 text-emerald-400" />}
              label="Aprobados"
              value={stats.aprobadas}
              color="bg-emerald-500/10"
            />
            <StatCard
              icon={<Clock className="w-4 h-4 text-yellow-400" />}
              label="Pendientes"
              value={stats.pendientes}
              color="bg-yellow-500/10"
            />
          </div>
        </div>

        {/* Accesos rápidos */}
        <div>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Accesos</h2>
          <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl overflow-hidden divide-y divide-gray-700/50">
            <button
              onClick={() => navigate('/history')}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-700/40 transition active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-xl">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">Historial de Reportes</p>
                  <p className="text-xs text-gray-400">Ver todos mis actas enviadas</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>

            {profile?.role === 'oficial' && (
              <button
                onClick={() => navigate('/admin')}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-700/40 transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">Panel de Oficial</p>
                    <p className="text-xs text-gray-400">Revisar reportes pendientes</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={handleSignOut}
          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition active:scale-[0.98]"
        >
          <LogOut className="w-5 h-5" /> Cerrar Sesión
        </button>
      </div>
    </div>
  )
}
