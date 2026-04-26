import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Shield, Mail, Lock, Loader2, ArrowRight, User, MapPin, Building2 } from 'lucide-react'
import { getProvincias, getMunicipios } from '../services/georefService'

export default function Login() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  
  // Estados para Georef
  const [provincias, setProvincias] = useState([])
  const [municipios, setMunicipios] = useState([])
  const [selectedProvincia, setSelectedProvincia] = useState({ id: '', nombre: '' })
  const [selectedMunicipio, setSelectedMunicipio] = useState({ id: '', nombre: '' })
  const [loadingLocations, setLoadingLocations] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // Cargar provincias al montar si estamos en modo registro
  useEffect(() => {
    if (isRegistering && provincias.length === 0) {
      setLoadingLocations(true)
      getProvincias().then(data => {
        setProvincias(data)
        setLoadingLocations(false)
      })
    }
  }, [isRegistering, provincias.length])

  // Cargar municipios cuando cambia la provincia seleccionada
  useEffect(() => {
    if (selectedProvincia.id) {
      setLoadingLocations(true)
      getMunicipios(selectedProvincia.id).then(data => {
        setMunicipios(data)
        setLoadingLocations(false)
      })
    } else {
      setMunicipios([])
    }
    setSelectedMunicipio({ id: '', nombre: '' })
  }, [selectedProvincia.id])

  const handleProvinciaChange = (e) => {
    const id = e.target.value
    const nombre = e.target.options[e.target.selectedIndex].text
    setSelectedProvincia({ id, nombre })
  }

  const handleMunicipioChange = (e) => {
    const id = e.target.value
    const nombre = e.target.options[e.target.selectedIndex].text
    setSelectedMunicipio({ id, nombre })
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isRegistering) {
        // Validar que haya seleccionado ubicación
        if (!selectedProvincia.id || !selectedMunicipio.id) {
          throw new Error('Por favor, selecciona tu provincia y municipio.')
        }

        // 1. Crear usuario en Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        })
        
        if (authError) throw authError

        if (authData?.user) {
          // 2. Guardar datos extendidos en profiles
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ 
              id: authData.user.id,
              full_name: fullName,
              provincia_id: selectedProvincia.id,
              provincia_nombre: selectedProvincia.nombre,
              municipio_id: selectedMunicipio.id,
              municipio_nombre: selectedMunicipio.nombre
            })
            
          if (profileError) console.error("Error guardando perfil:", profileError)
        }
        
        // Si Supabase requiere confirmación de email, no hay sesión aún.
        if (!authData.session) {
          setError("¡Registro exitoso! Por favor, revisa tu bandeja de entrada para confirmar tu correo.")
          setLoading(false)
          return
        }

        navigate('/map')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/map')
      }
    } catch (err) {
      // 🌐 Traducción de errores comunes de Supabase al español
      let errorMsg = err.message
      if (errorMsg === 'Email not confirmed') {
        errorMsg = 'Debes confirmar tu correo electrónico antes de iniciar sesión. Por favor, revisa tu bandeja de entrada.'
      } else if (errorMsg === 'Invalid login credentials') {
        errorMsg = 'Credenciales inválidas. Verifica tu correo y contraseña.'
      } else if (errorMsg === 'User already registered') {
        errorMsg = 'Este correo ya está registrado.'
      }
      
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsRegistering(!isRegistering)
    setError(null)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-[#020617] overflow-hidden">
      
      {/* 🌌 Fondo Decorativo Animado Premium */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[130px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/15 rounded-full blur-[150px] animate-float" />
      <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[20px] flex items-center justify-center mb-4 blue-glow animate-float shadow-2xl border border-white/10 relative overflow-hidden group hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-0 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <Shield className="w-8 h-8 text-white relative z-10" />
          </div>
          <h1 className="text-4xl font-black text-center tracking-tighter text-white mb-2 font-display">
            Ciudad<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">AR</span>
          </h1>
          <p className="text-slate-400 font-semibold text-center text-xs tracking-[0.2em] uppercase">
            {isRegistering ? 'Crear Cuenta Ciudadana' : 'Seguridad Vial Inteligente'}
          </p>
        </div>

        {/* Login/Register Card (Glassmorphism) */}
        <div className="glass-panel p-8 sm:p-10 rounded-[2rem] shadow-2xl transition-all duration-500 relative overflow-hidden backdrop-blur-2xl bg-slate-900/60 border-t border-white/10 border-l border-white/5">
          {/* Subtle glow inside card */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          <form onSubmit={handleAuth} className="space-y-6 relative z-10">
            
            <div className={`transition-all duration-500 ease-in-out ${isRegistering ? 'opacity-100 max-h-[120px] animate-fade-in-up' : 'opacity-0 max-h-0 overflow-hidden'}`}>
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] ml-1">Nombre Completo</label>
                <div className="relative group rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 transition-all bg-slate-950/40 border border-white/10 hover:border-white/20">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    id="fullName"
                    type="text"
                    placeholder="E.g., Juan Pérez"
                    className="w-full bg-transparent py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={isRegistering}
                    aria-label="Nombre Completo"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] ml-1">Email del Ciudadano</label>
              <div className="relative group rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 transition-all bg-slate-950/40 border border-white/10 hover:border-white/20">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  id="email"
                  type="email"
                  placeholder="ciudadano@ejemplo.com"
                  className="w-full bg-transparent py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-label="Correo Electrónico"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] ml-1">Contraseña</label>
              <div className="relative group rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/50 transition-all bg-slate-950/40 border border-white/10 hover:border-white/20">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-transparent py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-label="Contraseña"
                />
              </div>
            </div>

            {/* Georef Selects */}
            <div className={`transition-all duration-500 ease-in-out ${isRegistering ? 'opacity-100 animate-fade-in-up mt-6 border-t border-white/5 pt-6' : 'opacity-0 max-h-0 overflow-hidden m-0 p-0 border-none'}`}>
              <div className="flex flex-col gap-6">
                <div className="space-y-2">
                  <label htmlFor="provincia" className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] ml-1">Provincia de Residencia</label>
                  <div className="relative group rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all bg-slate-950/40 border border-white/10 hover:border-white/20">
                    <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${selectedProvincia.id ? 'text-emerald-400' : 'text-slate-500 group-focus-within:text-emerald-400'}`} />
                    <select
                      id="provincia"
                      className="w-full bg-transparent py-4 pl-12 pr-10 text-sm text-white appearance-none outline-none transition-all disabled:opacity-30 cursor-pointer"
                      value={selectedProvincia.id}
                      onChange={handleProvinciaChange}
                      required={isRegistering}
                      disabled={loadingLocations || provincias.length === 0}
                      aria-label="Provincia"
                    >
                      <option value="" disabled className="bg-slate-900 text-slate-400">Seleccioná tu provincia...</option>
                      {provincias.map(p => (
                        <option key={p.id} value={p.id} className="bg-slate-900 text-white">{p.nombre}</option>
                      ))}
                    </select>
                    {/* Custom Arrow */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="municipio" className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] ml-1">Municipio / Departamento</label>
                  <div className="relative group rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all bg-slate-950/40 border border-white/10 hover:border-white/20">
                    <Building2 className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${selectedMunicipio.id ? 'text-emerald-400' : 'text-slate-500 group-focus-within:text-emerald-400'}`} />
                    <select
                      id="municipio"
                      className="w-full bg-transparent py-4 pl-12 pr-10 text-sm text-white appearance-none outline-none transition-all disabled:opacity-30 cursor-pointer"
                      value={selectedMunicipio.id}
                      onChange={handleMunicipioChange}
                      required={isRegistering}
                      disabled={!selectedProvincia.id || loadingLocations || municipios.length === 0}
                      aria-label="Municipio"
                    >
                      <option value="" disabled className="bg-slate-900 text-slate-400">
                        {!selectedProvincia.id ? 'Primero elegí una provincia' : 'Seleccioná tu localidad...'}
                      </option>
                      {municipios.map(m => (
                        <option key={m.id} value={m.id} className="bg-slate-900 text-white">{m.nombre}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs py-3 px-4 rounded-xl font-medium animate-shake flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`group w-full text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all duration-300 active:scale-95 disabled:opacity-50 relative overflow-hidden ${
                isRegistering 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-600/30 ring-1 ring-emerald-400/50' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/30 ring-1 ring-blue-400/50'
              }`}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin relative z-10" />
              ) : (
                <div className="flex items-center gap-2 relative z-10">
                  <span className="tracking-wide">{isRegistering ? 'CREAR CUENTA' : 'ACCEDER AL MAPA'}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-8 text-center relative z-10">
            <button 
              type="button"
              onClick={toggleMode}
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors relative group overflow-hidden pb-1"
            >
              {isRegistering 
                ? '¿Ya tienes cuenta? Inicia sesión' 
                : '¿No tienes cuenta? Registrate aquí'}
              <span className="absolute left-0 bottom-0 w-full h-[1px] bg-blue-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
            </button>
          </div>

        </div>

        <p className="mt-8 text-center text-slate-500/70 text-[10px] font-bold uppercase tracking-[0.3em]">
          © 2026 CiudadAR | Versión 2.0
        </p>
      </div>
    </div>
  )
}
