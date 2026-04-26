import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useInfractions() {
  const [data, setData] = useState([]) // 👈 Ahora es un Array directo
  const [loading, setLoading] = useState(false)
  const [newMarkerIds, setNewMarkerIds] = useState([])

  const lastMapState = useRef({ lat: -34.6037, lng: -58.3816, radius: 10000 })
  const debounceTimer = useRef(null)

  const fetchInfractions = useCallback(async () => {
    setLoading(true)
    try {
      // Consulta estándar sin necesidad de RPC, segura contra 404s en desarrollo/producción
      const { data: infractions, error } = await supabase
        .from('infractions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) throw error
      if (infractions) setData(infractions)

    } catch (error) {
      console.error("Error cargando infracciones:", error.message)
    } finally {
      setLoading(false)
    }
  }, [])


  const handleMapChange = useCallback((lat, lng, radius) => {
    lastMapState.current = { lat, lng, radius }
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    
    debounceTimer.current = setTimeout(() => {
      fetchInfractions()
    }, 1000)
  }, [fetchInfractions])

  // Setup Real-time
  useEffect(() => {
    fetchInfractions()

    const channel = supabase
      .channel('public:infractions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'infractions' },
        (payload) => {
          setNewMarkerIds(prev => [...prev, payload.new.id])
          fetchInfractions()
          setTimeout(() => {
            setNewMarkerIds(prev => prev.filter(id => id !== payload.new.id))
          }, 5000)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'infractions' },
        () => fetchInfractions()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [fetchInfractions])

  return { data, loading, newMarkerIds, handleMapChange }
}
