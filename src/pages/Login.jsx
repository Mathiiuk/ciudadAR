import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Shield, Mail, Lock, Loader2, ArrowRight } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else navigate('/map')
    setLoading(false)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-[#020617] overflow-hidden">
      
      {/* 🌌 Fondo Decorativo Animado */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[150px] animate-float" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center mb-6 blue-glow animate-float shadow-2xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-center tracking-tighter text-white mb-2">
            Ciudad<span className="text-blue-500">AR</span>
          </h1>
          <p className="text-slate-400 font-medium text-center text-sm tracking-wide uppercase">
            Seguridad Vial Inteligente
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel p-10 rounded-[32px] shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Email del Ciudadano</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="email"
                  placeholder="ciudadano@ejemplo.com"
                  className="w-full bg-slate-950/50 border border-white/5 focus:border-blue-500/50 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-950/50 border border-white/5 focus:border-blue-500/50 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-700 outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs py-3 px-4 rounded-xl font-bold animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>ACCEDER AL MAPA</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
          © 2026 CiudadAR | Versión 2.0
        </p>
      </div>
    </div>
  )
}
