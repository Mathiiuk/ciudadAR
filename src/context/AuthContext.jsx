import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const getProfile = async (userId) => {
      try {
        console.log("Buscando perfil para:", userId)
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single()
        
        if (error) {
          console.warn("Perfil no encontrado o error:", error.message)
          return
        }

        if (mounted && data) {
          console.log("Rol detectado:", data.role)
          setRole(data.role)
        }
      } catch (e) {
        console.error("Excepción al buscar rol:", e)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Evento Auth Detectado:", event)
      
      if (session?.user) {
        if (mounted) {
          setUser(session.user)
          // Ya no ponemos await aquí. Dejamos que cargue el usuario rápido
          // y el perfil se busque en segundo plano.
          getProfile(session.user.id)
          setLoading(false) // <--- CRÍTICO: Dejamos de bloquear la app
        }
      } else {
        if (mounted) {
          setUser(null)
          setRole(null)
          setLoading(false)
        }
      }
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
        {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
