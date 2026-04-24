import { useState, useEffect } from 'react'
import { Search, MapPin, Building2, ChevronDown, Loader2, Target } from 'lucide-react'
import { getProvincias, getMunicipios, getLocalidades } from '../services/georefService'

export default function LocalityFilter({ onLocationSelect }) {
  const [isOpen, setIsOpen] = useState(false)
  
  const [provincias, setProvincias] = useState([])
  const [municipios, setMunicipios] = useState([])
  const [localidades, setLocalidades] = useState([])
  
  const [selectedProv, setSelectedProv] = useState('')
  const [selectedMuni, setSelectedMuni] = useState('')
  const [selectedLoc, setSelectedLoc] = useState('')
  
  const [loadingLocations, setLoadingLocations] = useState(false)

  // Cargar provincias la primera vez que se abre
  useEffect(() => {
    if (isOpen && provincias.length === 0) {
      setLoadingLocations(true)
      getProvincias().then(data => {
        setProvincias(data)
        setLoadingLocations(false)
      })
    }
  }, [isOpen, provincias.length])

  // Cargar municipios al cambiar provincia
  useEffect(() => {
    if (selectedProv) {
      setLoadingLocations(true)
      getMunicipios(selectedProv).then(data => {
        setMunicipios(data)
        setLocalidades([])
        setSelectedMuni('')
        setSelectedLoc('')
        setLoadingLocations(false)
      })
    }
  }, [selectedProv])

  // Cargar localidades al cambiar municipio
  useEffect(() => {
    if (selectedMuni) {
      setLoadingLocations(true)
      getLocalidades(selectedMuni).then(data => {
        setLocalidades(data)
        setSelectedLoc('')
        setLoadingLocations(false)
      })
    }
  }, [selectedMuni])

  // Manejar selección final
  const handleLocalitySelect = (e) => {
    const locId = e.target.value
    setSelectedLoc(locId)
    
    const locData = localidades.find(l => l.id === locId)
    if (locData && onLocationSelect) {
      // Pasamos lat/lon y nombre
      onLocationSelect({
        lat: locData.lat,
        lon: locData.lon,
        nombre: locData.nombre
      })
      // Opcional: cerrar el panel después de seleccionar
      setTimeout(() => setIsOpen(false), 500)
    }
  }

  return (
    <div className="absolute top-20 md:top-24 left-4 md:left-6 z-[1000] flex flex-col items-start">
      
      {/* Botón Flotante (Toggle) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-3 rounded-2xl backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-300 active:scale-95 border ${
          isOpen 
            ? 'bg-emerald-600/90 text-white border-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
            : 'bg-slate-900/90 text-slate-300 border-white/10 hover:bg-slate-800'
        }`}
      >
        <Search className="w-5 h-5" />
        <span className="text-xs font-black tracking-widest uppercase">Buscar Zona</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Panel Desplegable */}
      <div 
        className={`mt-3 w-72 sm:w-80 glass-panel rounded-[24px] shadow-2xl p-5 border border-white/10 transition-all duration-300 origin-top-left ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex flex-col gap-4">
          
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Target className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Filtro Cinemático</h3>
          </div>

          {/* Select Provincia */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Provincia</label>
            <div className="relative group">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
              <select
                className="w-full bg-slate-950/50 border border-white/5 focus:border-emerald-500/50 rounded-xl py-2.5 pl-9 pr-8 text-xs text-white appearance-none outline-none transition-all disabled:opacity-50"
                value={selectedProv}
                onChange={(e) => setSelectedProv(e.target.value)}
                disabled={loadingLocations || provincias.length === 0}
              >
                <option value="" disabled>Seleccionar provincia...</option>
                {provincias.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
              {loadingLocations && !selectedProv && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />}
            </div>
          </div>

          {/* Select Municipio */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Municipio / Departamento</label>
            <div className="relative group">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
              <select
                className="w-full bg-slate-950/50 border border-white/5 focus:border-emerald-500/50 rounded-xl py-2.5 pl-9 pr-8 text-xs text-white appearance-none outline-none transition-all disabled:opacity-50"
                value={selectedMuni}
                onChange={(e) => setSelectedMuni(e.target.value)}
                disabled={!selectedProv || loadingLocations || municipios.length === 0}
              >
                <option value="" disabled>{!selectedProv ? 'Requiere provincia' : 'Seleccionar municipio...'}</option>
                {municipios.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
          </div>

          {/* Select Localidad */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-black text-slate-500 tracking-[0.2em] ml-1">Localidad / Barrio</label>
            <div className="relative group">
              <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
              <select
                className="w-full bg-slate-950/50 border border-emerald-500/30 focus:border-emerald-500 rounded-xl py-2.5 pl-9 pr-8 text-xs text-white appearance-none outline-none transition-all disabled:opacity-50"
                value={selectedLoc}
                onChange={handleLocalitySelect}
                disabled={!selectedMuni || loadingLocations || localidades.length === 0}
              >
                <option value="" disabled>{!selectedMuni ? 'Requiere municipio' : 'Volar a localidad...'}</option>
                {localidades.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
