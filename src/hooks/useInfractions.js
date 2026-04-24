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
      const { lat, lng, radius } = lastMapState.current
      
      // Usamos la función RPC que ya está definida en la base de datos para PostGIS
      const { data: geojson, error } = await supabase
        .rpc('get_infractions_nearby', {
          p_lat: lat,
          p_lng: lng,
          p_radius_meters: radius || 5000 // 5km por defecto
        })
      
      if (error) throw error
      
      // Aplanamos el FeatureCollection de GeoJSON a un array de objetos que el Mapa entienda
      if (geojson && geojson.features) {
        const flattened = geojson.features.map(f => ({
          ...f.properties,
          location: f.geometry, // Esto es un objeto {type, coordinates}
          type: f.properties.type_name // El RPC devuelve type_name según el esquema
        }))
        setData(flattened)
      }

    } catch (error) {
      console.error("Error cargando infracciones via RPC:", error.message)
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
