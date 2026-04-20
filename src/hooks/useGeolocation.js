import { useState, useEffect } from 'react'

export function useGeolocation() {
  const [position, setPosition] = useState(null)
  const [geoError, setGeoError] = useState(null)

  useEffect(() => {
    let mounted = true
    if (!navigator.geolocation) {
      if (mounted) setGeoError("Tu navegador no soporta geolocalización.")
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (mounted) {
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setGeoError(null)
        }
      },
      (err) => {
        if (mounted) {
          if (err.code === 1) setGeoError("Permiso de GPS denegado.")
          else if (err.code === 2) setGeoError("Posición no disponible.")
          else setGeoError("Error al obtener ubicación GPS.")
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )

    return () => {
      mounted = false
      navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  return { position, geoError }
}
