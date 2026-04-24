import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

export default function HeatmapLayer({ data }) {
  const map = useMap()

  useEffect(() => {
    if (!data || data.length === 0) return

    // Adaptamos desde el formato de objeto de infracción
    const points = data.map(infraction => {
      // Recordamos que location es un objeto {type, coordinates} o null si falló el parseo
      if (infraction.location && infraction.location.coordinates) {
        const [lng, lat] = infraction.location.coordinates
        return [lat, lng, 1.2] // Incrementamos intensidad base
      }
      return null
    }).filter(p => p !== null)

    
    // Create the heat layer
    const heatLayer = L.heatLayer(points, {
      radius: 35,
      blur: 20,
      maxZoom: 17,
      gradient: {
        0.2: '#3b82f6', // Azul suave
        0.4: '#22d3ee', // Cyan
        0.6: '#4ade80', // Verde
        0.8: '#facc15', // Amarillo
        1.0: '#ef4444'  // Rojo intenso
      }
    })


    heatLayer.addTo(map)

    // Cleanup when component unmounts or data changes
    return () => {
      map.removeLayer(heatLayer)
    }
  }, [map, data])

  return null
}
