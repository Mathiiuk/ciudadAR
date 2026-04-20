import { Layers, Flame } from 'lucide-react'

export default function MapToggleBtn({ isHeatmapActive, toggle }) {
  return (
    <button 
      onClick={toggle}
      className={`absolute bottom-[104px] right-6 z-[1000] w-14 h-14 rounded-full flex justify-center items-center backdrop-blur-xl shadow-2xl transition-all active:scale-90 ${
        isHeatmapActive 
          ? 'bg-orange-500/90 text-white shadow-orange-500/40 border border-orange-400/50' 
          : 'bg-gray-800/90 text-blue-400 border border-gray-700/80 shadow-black/50'
      }`}
    >
      {isHeatmapActive ? <Flame className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
    </button>
  )
}
