import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import HeatmapLayer from './HeatmapLayer'
import MarkerClusterGroup from 'react-leaflet-cluster'

// 🎨 Estilo Premium para los Clústeres (Grupos de Marcadores)
const createClusterCustomIcon = function (cluster) {
  return L.divIcon({
    html: `<div class="bg-blue-600/90 backdrop-blur-md text-white font-black text-sm rounded-full w-12 h-12 flex items-center justify-center border border-blue-400/30 shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-transform hover:scale-110"><span>${cluster.getChildCount()}</span></div>`,
    className: 'custom-marker-cluster bg-transparent',
    iconSize: L.point(48, 48, true),
  })
}

// 🎨 Fábrica de Iconos HTML Modernos (Glassmorphism + Neón)
const createHtmlIcon = (colorClass, pulseClass = 'animate-ping') => L.divIcon({
  className: 'custom-html-icon bg-transparent',
  html: `<div class="relative flex h-8 w-8 items-center justify-center">
           <div class="absolute inline-flex h-full w-full rounded-full ${colorClass} opacity-40 ${pulseClass}"></div>
           <div class="relative inline-flex rounded-full h-4 w-4 ${colorClass} border-2 border-[#020617] shadow-[0_0_15px_rgba(0,0,0,0.5)]"></div>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
})

const ICONS = {
  aprobada: createHtmlIcon('bg-emerald-400', 'animate-pulse'),
  pendiente: createHtmlIcon('bg-amber-400'), // pinging fast
  rechazada: createHtmlIcon('bg-rose-500', 'opacity-50'), // no pulse, faded
  en_revision: createHtmlIcon('bg-blue-400', 'animate-pulse')
}

function MapController({ onMapChange }) {
  const map = useMap()
  useEffect(() => {
    map.on('moveend', () => {
      const center = map.getCenter()
      const zoom = map.getZoom()
      // Cálculo aproximado de radio en metros según el zoom
      const radius = Math.floor(40075016.686 / Math.pow(2, zoom + 1))
      
      onMapChange(center.lat, center.lng, radius)
    })
  }, [map, onMapChange])
  return null
}


// Función auxiliar para parsear la ubicación en formatos WKT o GeoJSON
const parseLocation = (location) => {
  if (!location) return null
  
  // Caso 1: Objeto GeoJSON (común en respuestas de Supabase v2+)
  if (typeof location === 'object' && location.coordinates) {
    return [location.coordinates[1], location.coordinates[0]] // [lat, lng]
  }

  // Caso 2: String WKT (ej. "POINT(-58.3816 -34.6037)")
  if (typeof location === 'string') {
    const coordsMatch = location.match(/\((.*) (.*)\)/)
    if (coordsMatch) {
      return [parseFloat(coordsMatch[2]), parseFloat(coordsMatch[1])]
    }
  }

  return null
}

export default function MapView({ data, isHeatmapActive, onMapChange, onSelectReport }) {
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

      {/* Capa de Calor */}
      {isHeatmapActive && <HeatmapLayer data={data} />}

      {/* Agrupación Inteligente de Marcadores (Clustering) */}
      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={createClusterCustomIcon}
        showCoverageOnHover={false}
        maxClusterRadius={50}
      >
        {data && Array.isArray(data) && data.map((infraction) => {
          const position = parseLocation(infraction.location)
          if (!position) return null

          const icon = ICONS[infraction.status] || ICONS.pendiente

          return (
            <Marker key={infraction.id} position={position} icon={icon}>
              <Popup className="custom-popup">
                <div className="p-1 min-w-[160px]">
                  <p className="font-bold text-[13px] text-white mb-2 leading-tight">{infraction.type}</p>
                  <div 
                      className="w-full aspect-video rounded-xl overflow-hidden bg-slate-950 border border-white/10 cursor-pointer group relative"
                      onClick={() => onSelectReport(infraction)}
                  >
                      <img src={infraction.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                      <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <span className="text-[8px] font-black text-white uppercase tracking-widest bg-blue-600 px-3 py-1 rounded-full shadow-xl">Ver Informe</span>
                      </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                      infraction.status === 'aprobada' 
                        ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' 
                        : infraction.status === 'rechazada'
                        ? 'text-rose-400 border-rose-500/20 bg-rose-500/10'
                        : 'text-amber-400 border-amber-500/20 bg-amber-500/10'
                    }`}>
                      {infraction.status}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500">
                      {new Date(infraction.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MarkerClusterGroup>

    </MapContainer>
  )
}

