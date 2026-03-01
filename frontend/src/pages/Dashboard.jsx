import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { reportesService } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  CubeIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await reportesService.getGeneral()
        setData(res.data)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  const resumen = data?.resumen
  const totalConsumibles = resumen?.total_consumibles ?? 0
  const totalHerramientas = resumen?.total_herramientas ?? 0
  const totalTecnicos = resumen?.total_tecnicos ?? 0
  const movimientosHoy = resumen?.movimientos_hoy ?? 0

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">Vista general del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-500">
              <CubeIcon className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Consumibles</p>
              <p className="stat-value">{totalConsumibles}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-500">
              <WrenchScrewdriverIcon className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Herramientas</p>
              <p className="stat-value">{totalHerramientas}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-purple-500">
              <UserGroupIcon className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Técnicos</p>
              <p className="stat-value">{totalTecnicos}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-500">
              <ArrowPathIcon className="w-6 h-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Mov. hoy</p>
              <p className="stat-value">{movimientosHoy}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Acciones rápidas</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/tecnicos" className="btn btn-primary">Agregar técnicos</Link>
          <Link to="/consumibles" className="btn btn-secondary">Agregar consumibles</Link>
          <Link to="/herramientas" className="btn btn-secondary">Agregar herramientas</Link>
        </div>
      </div>
    </div>
  )
}
