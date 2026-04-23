import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// 🎨 Marcador Customizado para Dark Mode
const customIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
  className: 'drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]'
})

function MapController({ onMapChange }) {
  const map = useMap()
  useEffect(() => {
    map.on('moveend', () => {
      onMapChange({
        center: map.getCenter(),
        zoom: map.getZoom()
      })
    })
  }, [map, onMapChange])
  return null
}

export default function MapView({ data, onMapChange }) {
  return (
    <MapContainer
      center={[-34.6037, -58.3816]} // Buenos Aires
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      />
      
      <MapController onMapChange={onMapChange} />

      {data && Array.isArray(data) && data.map((infraction) => {
        // Extraer coordenadas de Point(lng lat)
        const coordsMatch = infraction.location.match(/\((.*) (.*)\)/)
        if (!coordsMatch) return null
        const position = [parseFloat(coordsMatch[2]), parseFloat(coordsMatch[1])]

        return (
          <Marker key={infraction.id} position={position} icon={customIcon}>
            <Popup>
              <div className="p-1">
                <p className="font-bold text-sm text-white mb-1">{infraction.type}</p>
                <div className="w-full aspect-video rounded-lg overflow-hidden bg-slate-900">
                    <img src={infraction.image_url} className="w-full h-full object-cover" alt="" />
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Estado: {infraction.status}</p>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
