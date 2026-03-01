import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Verificar token al cargar la aplicación
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`
          const response = await api.get('/auth/verify')
          if (response.data.valido) {
            setUser(response.data.usuario)
          } else {
            localStorage.removeItem('token')
            delete api.defaults.headers.common['Authorization']
          }
        } catch (error) {
          console.error('Error verificando token:', error)
          localStorage.removeItem('token')
          delete api.defaults.headers.common['Authorization']
        }
      }
      setLoading(false)
    }

    verifyToken()
  }, [])

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { token, usuario } = response.data
      
      localStorage.setItem('token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUser(usuario)
      
      toast.success(`¡Bienvenido ${usuario.nombre}!`)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.error || 'Error al iniciar sesión'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
    toast.success('Sesión cerrada correctamente')
  }, [])

  const updateUser = useCallback((userData) => {
    setUser(prev => ({ ...prev, ...userData }))
  }, [])

  const value = {
    user,
    login,
    logout,
    updateUser,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.rol === 'admin',
    isSecretaria: user?.rol === 'secretaria'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
