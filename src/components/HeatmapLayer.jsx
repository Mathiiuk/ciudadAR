import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'

export default function HeatmapLayer({ features }) {
  const map = useMap()

  useEffect(() => {
    if (!features || features.length === 0) return

    // GeoJSON native coordinates are [longitude, latitude]
    // Leaflet Heat coordinates must be [latitude, longitude, intensity]
    const points = features.map(f => {
      const [lng, lat] = f.geometry.coordinates
      return [lat, lng, 1] 
    })
    
    // Create the heat layer
    const heatLayer = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 15,
      gradient: {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
      }
    })

    heatLayer.addTo(map)

    // Cleanup when component unmounts or data changes
    return () => {
      map.removeLayer(heatLayer)
    }
  }, [map, features])

  return null
}
