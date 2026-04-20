import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import HeatmapLayer from './HeatmapLayer'
import L from 'leaflet'

// Componente invisible para acoplar al ciclo de vida del mapa
function MapEventsHandler({ onMapChange }) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter()
      const bounds = map.getBounds()
      // Calcular radio burdo estimando distancia del centro a una esquina
      const radiusMeters = center.distanceTo(bounds.getNorthEast())
      onMapChange(center.lat, center.lng, radiusMeters)
    },
    zoomend: () => {
      const center = map.getCenter()
      const bounds = map.getBounds()
      const radiusMeters = center.distanceTo(bounds.getNorthEast())
      onMapChange(center.lat, center.lng, radiusMeters)
    }
  })
  return null
}

// Icono animado de pulso para nuevos insertos Realtime
const createPulseIcon = () => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="relative flex h-6 w-6">
             <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
             <span class="relative inline-flex rounded-full h-6 w-6 bg-blue-500 border-2 border-white shadow"></span>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })
}

// Icono por defecto usando CDN para asegurar carga en Vercel/Producción
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

export default function MapView({ data, isHeatmapActive, onMapChange, newMarkerIds = [] }) {
  const centerCABA = [-34.6037, -58.3816]
  
  // Extraemos limpio
  const features = data?.features || []

  return (
    <MapContainer 
      center={centerCABA} 
      zoom={13} 
      zoomControl={false} 
      className="h-full w-full bg-gray-900"
    >
      <MapEventsHandler onMapChange={onMapChange} />
      
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
      />
      
      {isHeatmapActive ? (
        <HeatmapLayer features={features} />
      ) : (
        features.map((feature) => {
          const [lng, lat] = feature.geometry.coordinates
          const { id, image_url, type_name, status, created_at } = feature.properties
          
          const isNew = newMarkerIds.includes(id)

          return (
            <Marker 
              key={id} 
              position={[lat, lng]} 
              icon={isNew ? createPulseIcon() : defaultIcon}
            >
              <Popup className="custom-popup">
                <div className="flex flex-col w-full max-w-[200px] overflow-hidden rounded-lg">
                  <img 
                    src={image_url} 
                    alt="Infracción" 
                    className="w-full h-32 object-cover rounded-t-lg mb-2 bg-gray-800"
                  />
                  <div className="px-2 pb-2">
                    <h3 className="font-bold text-sm text-red-400 leading-tight mb-1">
                      {type_name || 'Reporte Vial'}
                    </h3>
                    <p className="text-[10px] text-gray-500 mt-2 flex justify-between">
                      <span>{new Date(created_at).toLocaleDateString()}</span>
                      <span className="capitalize">{status}</span>
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })
      )}
    </MapContainer>
  )
}
