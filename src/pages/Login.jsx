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
      
      {/* 🌌 Fondo Decorativo Animado */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[150px] animate-float" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-[20px] flex items-center justify-center mb-4 blue-glow animate-float shadow-2xl">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-center tracking-tighter text-white mb-1">
            Ciudad<span className="text-blue-500">AR</span>
          </h1>
          <p className="text-slate-400 font-medium text-center text-xs tracking-wide uppercase">
            {isRegistering ? 'Crear Cuenta Ciudadana' : 'Seguridad Vial Inteligente'}
          </p>
        </div>

        {/* Login/Register Card */}
        <div className="glass-panel p-8 rounded-[32px] shadow-2xl transition-all duration-300">
          <form onSubmit={handleAuth} className="space-y-5">
            
            {isRegistering && (
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Nombre Completo</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Juan Pérez"
                    className="w-full bg-slate-950/50 border border-white/5 focus:border-blue-500/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={isRegistering}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Email del Ciudadano</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="email"
                  placeholder="ciudadano@ejemplo.com"
                  className="w-full bg-slate-950/50 border border-white/5 focus:border-blue-500/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-950/50 border border-white/5 focus:border-blue-500/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-slate-700 outline-none transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Georef Selects */}
            {isRegistering && (
              <div className="flex flex-col gap-5 pt-2 border-t border-white/5">
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Provincia de Residencia</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                    <select
                      className="w-full bg-slate-950/50 border border-white/5 focus:border-emerald-500/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white appearance-none outline-none transition-all disabled:opacity-50"
                      value={selectedProvincia.id}
                      onChange={handleProvinciaChange}
                      required={isRegistering}
                      disabled={loadingLocations || provincias.length === 0}
                    >
                      <option value="" disabled>Seleccioná tu provincia...</option>
                      {provincias.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] ml-2">Municipio / Departamento</label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                    <select
                      className="w-full bg-slate-950/50 border border-white/5 focus:border-emerald-500/50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white appearance-none outline-none transition-all disabled:opacity-50"
                      value={selectedMunicipio.id}
                      onChange={handleMunicipioChange}
                      required={isRegistering}
                      disabled={!selectedProvincia.id || loadingLocations || municipios.length === 0}
                    >
                      <option value="" disabled>
                        {!selectedProvincia.id ? 'Primero elegí una provincia' : 'Seleccioná tu localidad...'}
                      </option>
                      {municipios.map(m => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs py-3 px-4 rounded-xl font-bold animate-shake">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 disabled:opacity-50 ${
                isRegistering 
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' 
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
              }`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>{isRegistering ? 'CREAR CUENTA' : 'ACCEDER AL MAPA'}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-6 text-center">
            <button 
              type="button"
              onClick={toggleMode}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              {isRegistering 
                ? '¿Ya tienes cuenta? Inicia sesión' 
                : '¿No tienes cuenta? Registrate aquí'}
            </button>
          </div>

        </div>

        <p className="mt-8 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
          © 2026 CiudadAR | Versión 2.0
        </p>
      </div>
    </div>
  )
}
