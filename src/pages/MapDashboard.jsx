import { useState } from 'react'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import MapToggleBtn from '../components/MapToggleBtn'
import MapView from '../components/MapView'
import CreateReport from '../components/CreateReport'
import { useInfractions } from '../hooks/useInfractions'

export default function MapDashboard() {
  const [isHeatmapActive, setIsHeatmapActive] = useState(false)
  const [isReporting, setIsReporting] = useState(false)
  
  const { data, loading, handleMapChange } = useInfractions()

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col relative bg-[#020617]">
      <Header />
      
      <div className="absolute inset-0 z-0">
        <MapView 
          data={data} 
          isHeatmapActive={isHeatmapActive}
          onMapChange={handleMapChange}
        />
        {loading && (
          <div className="absolute top-24 right-6 z-[500] bg-slate-900/80 backdrop-blur-md rounded-full border border-white/5 p-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        )}
      </div>

      <MapToggleBtn 
        isHeatmapActive={isHeatmapActive} 
        toggle={() => setIsHeatmapActive(!isHeatmapActive)} 
      />
      
      {/* 🛡️ Ahora el disparador es parte de la barra */}
      <BottomNav onReportClick={() => setIsReporting(true)} />

      {isReporting && <CreateReport onClose={() => setIsReporting(false)} />}
    </div>
  )
}
