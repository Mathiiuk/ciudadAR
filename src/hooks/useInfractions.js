import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useInfractions() {
  const [data, setData] = useState({ type: 'FeatureCollection', features: [] })
  const [loading, setLoading] = useState(false)
  const [newMarkerIds, setNewMarkerIds] = useState([])

  const featuresCache = useRef(new Map())
  const lastMapState = useRef({ lat: -34.6037, lng: -58.3816, radius: 10000 })
  const debounceTimer = useRef(null)

  const fetchNearby = useCallback(async (lat, lng, radius) => {
    setLoading(true)
    try {
      const { data: geoJsonData, error } = await supabase.rpc('get_infractions_nearby', {
        p_lat: lat,
        p_lng: lng,
        p_radius_meters: radius
      })
      
      if (error) throw error

      if (geoJsonData?.features) {
        geoJsonData.features.forEach(f => featuresCache.current.set(f.properties.id, f))
        setData({
          type: 'FeatureCollection',
          features: Array.from(featuresCache.current.values())
        })
      }
    } catch (error) {
      console.error("Fetch RPC Localizado Falló:", error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleMapChange = useCallback((lat, lng, radius) => {
    lastMapState.current = { lat, lng, radius }
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    
    debounceTimer.current = setTimeout(() => {
      fetchNearby(lat, lng, radius)
    }, 500)
  }, [fetchNearby])

  // Setup Real-time
  useEffect(() => {
    // Initial fetch
    fetchNearby(lastMapState.current.lat, lastMapState.current.lng, lastMapState.current.radius)

    const channel = supabase
      .channel('public:infractions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'infractions' },
        (payload) => {
          setNewMarkerIds(prev => [...prev, payload.new.id])
          fetchNearby(lastMapState.current.lat, lastMapState.current.lng, lastMapState.current.radius)
          
          setTimeout(() => {
            setNewMarkerIds(prev => prev.filter(id => id !== payload.new.id))
          }, 5000)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'infractions' },
        (payload) => {
           if (featuresCache.current.has(payload.new.id)) {
              fetchNearby(lastMapState.current.lat, lastMapState.current.lng, lastMapState.current.radius)
           }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [fetchNearby])

  return { data, loading, newMarkerIds, handleMapChange }
}
