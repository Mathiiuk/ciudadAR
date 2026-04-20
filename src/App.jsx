import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import MapDashboard from './pages/MapDashboard'
import AdminPanel from './pages/AdminPanel'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      
      {/* Vistas protegidas estándar para cualquier usuario logeado */}
      <Route path="/map" element={
        <ProtectedRoute>
          <MapDashboard />
        </ProtectedRoute>
      } />
      
      {/* Vista altamente protegida: Únicamente pasas si rol === 'oficial' */}
      <Route path="/admin" element={
        <ProtectedRoute reqRole="oficial">
          <AdminPanel />
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default App
