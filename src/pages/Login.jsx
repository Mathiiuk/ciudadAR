import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth() // Consumimos el estado global de auth

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  // SI EL CONTEXTO DICE QUE YA ESTAMOS LOGUEADOS, IR AL MAPA DIRECTO
  useEffect(() => {
    if (user && !authLoading) {
      console.log("Sesión detectada desde Context, redirigiendo a /map...")
      navigate('/map', { replace: true })
    }
  }, [user, authLoading, navigate])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      console.log("Iniciando intento de login para:", email)
      if (isRegistering) {
        // Sign up flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        })
        
        if (error) throw error

        if (data?.user) {
          console.log("Usuario creado, insertando perfil...")
          const { error: profileError } = await supabase.from('profiles').upsert([{
            id: data.user.id,
            username: email.split('@')[0] + Math.floor(Math.random() * 1000),
            full_name: email.split('@')[0],
            role: 'ciudadano'
          }])

          if (profileError) throw profileError
          console.log("Perfil creado exitosamente")
          navigate('/map')
        }
      } else {
        // Sign in flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        
        if (error) throw error
        console.log("Login exitoso, redirigiendo...", data.user.id)
        navigate('/map')
      }
    } catch (err) {
      console.error("Error en handleAuth:", err.message)
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-screen h-screen flex flex-col justify-center items-center bg-gray-900 bg-gradient-to-br from-gray-900 to-black px-6">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/20">
          <AlertCircle className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2 text-center tracking-tight">CiudadAR</h1>
        <p className="text-gray-400 mb-8 text-center text-sm">Registro Seguro de Infracciones</p>

        {errorMsg && (
          <div className="w-full bg-red-500/20 text-red-300 text-sm p-3 rounded-lg text-center border border-red-500/30 mb-4 animate-pulse">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="w-full relative z-10">
          <div className="mb-4 relative">
            <input 
              type="email" 
              required
              placeholder="Correo electrónico" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800/50 backdrop-blur-md border border-gray-700/50 text-white px-5 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-500"
            />
          </div>
          
          <div className="mb-8 relative">
            <input 
              type="password" 
              required
              placeholder="Contraseña" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-gray-800/50 backdrop-blur-md border border-gray-700/50 text-white px-5 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-500"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegistering ? 'Crear Cuenta' : 'Ingresar')}
          </button>
        </form>

        <button 
          onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(null); }}
          className="mt-6 text-sm text-blue-400 hover:text-blue-300 focus:outline-none"
        >
          {isRegistering ? '¿Ya tienes cuenta? Ingresa aquí' : '¿No tienes cuenta? Regístrate'}
        </button>
      </div>
    </div>
  )
}
