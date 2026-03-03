import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'
import {
  HomeIcon,
  UserGroupIcon,
  CubeIcon,
  WrenchScrewdriverIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Técnicos', href: '/tecnicos', icon: UserGroupIcon },
  { name: 'Consumibles', href: '/consumibles', icon: CubeIcon },
  { name: 'Herramientas', href: '/herramientas', icon: WrenchScrewdriverIcon },
  { name: 'Movimientos', href: '/movimientos', icon: ArrowPathIcon },
  { name: 'Reportes', href: '/reportes', icon: ChartBarIcon },
]

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout, isAdmin } = useAuth()
  const location = useLocation()

  const handleLogout = () => {
    logout()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 dark:bg-dark bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white dark:bg-dark-secondary">
          <div className="flex items-center justify-between h-16 px-4 bg-primary-600">
            <h1 className="text-xl font-semibold text-white">Inventario</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-white hover:text-gray-200"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-dark">
            <div className="flex items-center mb-4">
              <UserCircleIcon className="w-8 h-8 text-gray-400 dark:text-dark-textMuted mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-dark-text">{user?.nombre}</p>
                <p className="text-xs text-gray-500 dark:text-dark-textMuted capitalize">{user?.rol}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-100 dark:hover-dark"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-1 bg-white dark:bg-dark-secondary border-r border-gray-200 dark:border-dark">
          <div className="flex items-center justify-between h-16 px-6 bg-primary-600">
            <h1 className="text-xl font-semibold text-white">Sistema de Inventario</h1>
            <ThemeToggle />
          </div>
          
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-dark">
            <div className="flex items-center mb-4">
              <UserCircleIcon className="w-8 h-8 text-gray-400 dark:text-dark-textMuted mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-dark-text">{user?.nombre}</p>
                <p className="text-xs text-gray-500 dark:text-dark-textMuted capitalize">{user?.rol}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-dark-text rounded-lg hover:bg-gray-100 dark:hover-dark"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <div className="sticky top-0 z-10 flex items-center justify-between h-16 bg-white dark:bg-dark-secondary border-b border-gray-200 dark:border-dark lg:hidden">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="px-4 text-gray-500 dark:text-dark-textMuted hover:text-gray-700 dark:hover-dark-text"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-dark-text">Inventario</h1>
          </div>
          <div className="px-4">
            <ThemeToggle />
          </div>
        </div>

        {/* Page content */}
        <main className="page-content">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}
