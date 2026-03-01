import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tecnicos from './pages/Tecnicos'
import Consumibles from './pages/Consumibles'
import Herramientas from './pages/Herramientas'
import Movimientos from './pages/Movimientos'
import Reportes from './pages/Reportes'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tecnicos" element={<Tecnicos />} />
        <Route path="/consumibles" element={<Consumibles />} />
        <Route path="/herramientas" element={<Herramientas />} />
        <Route path="/movimientos" element={<Movimientos />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
