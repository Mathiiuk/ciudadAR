import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import MapToggleBtn from '../components/MapToggleBtn'
import MapView from '../components/MapView'
import CreateReport from '../components/CreateReport'
import { supabase } from '../lib/supabaseClient'

export default function MapDashboard() {
  const navigate = useNavigate()
  const [isHeatmapActive, setIsHeatmapActive] = useState(false)
  const [isReporting, setIsReporting] = useState(false)
  
  // Storage unificado final (Render list)
  const [data, setData] = useState({ type: 'FeatureCollection', features: [] })
  
  // Realtime pulses
  const [newMarkerIds, setNewMarkerIds] = useState([])

  const [loading, setLoading] = useState(false)
  
  // Variables estables de caché y temporización (No rompen renders)
  const debounceTimer = useRef(null)
  const featuresCache = useRef(new Map())
  const lastMapState = useRef({ lat: -34.6037, lng: -58.3816, radius: 10000 })

  const fetchNearby = async (lat, lng, radius) => {
    setLoading(true)
    try {
      const { data: geoJsonData, error } = await supabase.rpc('get_infractions_nearby', {
        p_lat: lat,
        p_lng: lng,
        p_radius_meters: radius
      })
      
      if (error) throw error

      if (geoJsonData?.features) {
        // Unir datos nuevos sin descartar lo ya cargado usando Map object
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
  }

  // Se activa desde el mapa interior solo al mover
  const handleMapChange = (lat, lng, radius) => {
    lastMapState.current = { lat, lng, radius }
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    
    debounceTimer.current = setTimeout(() => {
      fetchNearby(lat, lng, radius)
    }, 500) // 500ms Debounce Delay
  }

  useEffect(() => {
    // 1. Session Auth Validator
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/') 
      } else {
        // Disparo Inicial al entrar (Centro de CABA)
        handleMapChange(lastMapState.current.lat, lastMapState.current.lng, lastMapState.current.radius)
      }
    })

    // 2. Suscripción Reactiva sin Refetch Total "Big Bang"
    // Cuando hay INSERT, re-buscamos el radio del mapa actual y guardamos el ID para animarlo visualmente
    const channel = supabase
      .channel('public:infractions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'infractions' },
        (payload) => {
          setNewMarkerIds(prev => [...prev, payload.new.id])
          
          // Fetch sobre el canvas de la pantalla actual para atrapar el nuevo insert 
          // (Si el marker cae fuera de los bounds, fetchNearby no lo traerá pero tampoco molestará)
          fetchNearby(lastMapState.current.lat, lastMapState.current.lng, lastMapState.current.radius)
          
          // Limpiar animación luego de 5s
          setTimeout(() => {
            setNewMarkerIds(prev => prev.filter(id => id !== payload.new.id))
          }, 5000)
        }
      )
      .on(
        // También atrapamos actualizaciones por si el "Admin" aprueba una
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'infractions' },
        (payload) => {
           // Actualizar el caché si existía localmente y re-renderizar
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
  }, [navigate])

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col relative bg-gray-900">
      <Header />
      
      <div className="absolute inset-0 z-0">
        <MapView 
          data={data} 
          isHeatmapActive={isHeatmapActive}
          onMapChange={handleMapChange}
          newMarkerIds={newMarkerIds}
        />
        {loading && (
          <div className="absolute top-20 right-6 z-[500] bg-gray-900/50 backdrop-blur-md rounded-full shadow border border-gray-700/50 p-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        )}
      </div>

      <div className="absolute bottom-[104px] left-0 right-0 flex justify-center z-[1000] pointer-events-none">
        <button 
          onClick={() => setIsReporting(true)}
          className="pointer-events-auto bg-blue-600 hover:bg-blue-500 text-white rounded-full p-4 shadow-[0_10px_25px_rgba(37,99,235,0.5)] transition-all active:scale-95 flex items-center justify-center -translate-y-4"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>

      <MapToggleBtn 
        isHeatmapActive={isHeatmapActive} 
        toggle={() => setIsHeatmapActive(!isHeatmapActive)} 
      />
      
      <BottomNav />

      {isReporting && <CreateReport onClose={() => setIsReporting(false)} />}
    </div>
  )
}
