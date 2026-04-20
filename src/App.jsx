import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import MapDashboard from './pages/MapDashboard'
import AdminPanel from './pages/AdminPanel'
import UserProfile from './pages/UserProfile'
import History from './pages/History'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      
      <Route path="/map" element={
        <ProtectedRoute><MapDashboard /></ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute><UserProfile /></ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute><History /></ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute reqRole="oficial"><AdminPanel /></ProtectedRoute>
      } />
    </Routes>
  )
}

export default App
