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
        const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
        if (mounted && data) setRole(data.role)
      } catch (e) {
        console.error("Error fetching role:", e)
      }
    }

    // Usamos onAuthStateChange que se dispara automáticamente al inicio (INITIAL_SESSION)
    // y en cada login/logout. Es más robusto que mezclar getSession manual.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event)
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
