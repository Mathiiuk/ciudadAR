import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts'
import { Loader2, Download, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase.rpc('get_infraction_stats')
      if (error) {
        console.error("Error fetching stats:", error)
      } else {
        setStats(data)
      }
      setLoading(false)
    }
    fetchStats()
  }, [])

  const exportToCSV = () => {
    if (!stats || !stats.trends) return
    
    const headers = "Fecha,Tipo,Cantidad\n"
    const csvContent = stats.trends.map(row => `${row.date},${row.type},${row.count}`).join("\n")
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `reporte_estadistico_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
      <p className="text-slate-400 animate-pulse">Generando reporte de inteligencia...</p>
    </div>
  )

  if (!stats) return <div className="text-center py-10 text-red-400">Error al cargar datos estadísticos.</div>

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* 📊 Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Reportes" value={stats.total_count} icon={<TrendingUp className="text-blue-400" />} />
        <StatCard title="Pendientes" value={stats.pending_count} icon={<Clock className="text-amber-400" />} />
        <StatCard title="Aprobados" value={stats.status_dist.find(s => s.status === 'aprobada')?.count || 0} icon={<CheckCircle className="text-emerald-400" />} />
        <StatCard title="Rechazados" value={stats.status_dist.find(s => s.status === 'rechazada')?.count || 0} icon={<AlertTriangle className="text-rose-400" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 📈 Trend Chart */}
        <div className="bg-slate-900/50 border border-white/5 rounded-[32px] p-8 backdrop-blur-xl">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-widest">Tendencias</h3>
              <p className="text-xs text-slate-500 mt-1">Últimos 30 días de actividad</p>
            </div>
            <button 
              onClick={exportToCSV}
              className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white"
              title="Exportar Datos"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                />
                <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend />
                <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="Incidencias"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 🥧 Distribution Chart */}
        <div className="bg-slate-900/50 border border-white/5 rounded-[32px] p-8 backdrop-blur-xl">
          <h3 className="text-lg font-black text-white uppercase tracking-widest mb-8">Estado de Gestión</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.status_dist}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="count"
                  nameKey="status"
                >
                  {stats.status_dist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  )
}

function StatCard({ title, value, icon }) {
  return (
    <div className="bg-slate-900/50 border border-white/5 p-6 rounded-[28px] backdrop-blur-md">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
          <h4 className="text-3xl font-black text-white mt-2">{value}</h4>
        </div>
        <div className="p-3 bg-slate-800/50 rounded-2xl">
          {icon}
        </div>
      </div>
    </div>
  )
}
