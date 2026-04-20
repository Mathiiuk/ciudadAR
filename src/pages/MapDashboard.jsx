import { useState } from 'react'
import { Plus } from 'lucide-react'
import Header from '../components/Header'
import BottomNav from '../components/BottomNav'
import MapToggleBtn from '../components/MapToggleBtn'
import MapView from '../components/MapView'
import CreateReport from '../components/CreateReport'
import { useInfractions } from '../hooks/useInfractions'

export default function MapDashboard() {
  const [isHeatmapActive, setIsHeatmapActive] = useState(false)
  const [isReporting, setIsReporting] = useState(false)
  
  // Entire logical payload compressed into 1 line of Senior Architecture hook
  const { data, loading, newMarkerIds, handleMapChange } = useInfractions()

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
