import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

// Componente Wrapper para blindar rutas.
export default function ProtectedRoute({ children, reqRole }) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="w-screen h-screen flex justify-center items-center bg-gray-900">
         <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    )
  }

  // 1. Si no hay usuario logged, rebota a Root
  if (!user) {
    return <Navigate to="/" replace />
  }

  // 2. Si la ruta demanda un perfil específico y no coincide, rebota a la app general (/map)
  if (reqRole && role !== reqRole) {
    return <Navigate to="/map" replace />
  }

  // Superadas todas las pruebas, inyecta al hijo (El componente deseado).
  return children
}
