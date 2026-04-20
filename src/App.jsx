import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import MapDashboard from './pages/MapDashboard'
import AdminPanel from './pages/AdminPanel'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/map" element={<MapDashboard />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  )
}

export default App
