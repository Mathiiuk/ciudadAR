import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Escucha estricta a cambios de sesión generados por Supabase (Login, LogOut, Refresh)
    let mounted = true

    const getProfile = async (userId) => {
      const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
      if (mounted) setRole(data?.role || 'ciudadano')
    }

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        if (mounted) setUser(session.user)
        await getProfile(session.user.id)
      }
      if (mounted) setLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (mounted) setUser(session.user)
        await getProfile(session.user.id)
      } else {
        if (mounted) {
          setUser(null)
          setRole(null)
        }
      }
      if (mounted) setLoading(false)
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
