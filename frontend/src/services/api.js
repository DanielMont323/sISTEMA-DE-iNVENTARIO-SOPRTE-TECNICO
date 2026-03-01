import axios from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      window.location.href = '/login'
      toast.error('Sesión expirada. Por favor inicia sesión nuevamente.')
    } else if (error.response?.status >= 500) {
      toast.error('Error del servidor. Inténtalo más tarde.')
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Tiempo de espera agotado. Verifica tu conexión.')
    } else if (!error.response) {
      toast.error('Error de conexión. Verifica tu internet.')
    }
    
    return Promise.reject(error)
  }
)

// Interceptor para agregar token a todas las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Servicios de autenticación
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  verify: () => api.get('/auth/verify'),
}

// Servicios de técnicos
export const tecnicosService = {
  getAll: (params) => api.get('/tecnicos', { params }),
  getById: (id) => api.get(`/tecnicos/${id}`),
  getHerramientas: (id) => api.get(`/tecnicos/${id}/herramientas`),
  create: (data) => api.post('/tecnicos', data),
  update: (id, data) => api.put(`/tecnicos/${id}`, data),
  delete: (id) => api.delete(`/tecnicos/${id}`),
  toggleEstado: (id) => api.patch(`/tecnicos/${id}/toggle-estado`),
}

// Servicios de consumibles
export const consumiblesService = {
  getAll: (params) => api.get('/consumibles', { params }),
  getById: (id) => api.get(`/consumibles/${id}`),
  create: (data) => api.post('/consumibles', data),
  update: (id, data) => api.put(`/consumibles/${id}`, data),
  delete: (id) => api.delete(`/consumibles/${id}`),
  asignar: (id, data) => api.post(`/consumibles/${id}/asignar`, data),
  devolver: (id, data) => api.post(`/consumibles/${id}/devolver`, data),
  getCategorias: () => api.get('/consumibles/categorias/list'),
}

// Servicios de herramientas
export const herramientasService = {
  getAll: (params) => api.get('/herramientas', { params }),
  getById: (id) => api.get(`/herramientas/${id}`),
  getResguardos: (id) => api.get(`/herramientas/${id}/resguardos`),
  create: (data) => api.post('/herramientas', data),
  update: (id, data) => api.put(`/herramientas/${id}`, data),
  delete: (id) => api.delete(`/herramientas/${id}`),
  asignar: (id, data) => api.post(`/herramientas/${id}/asignar`, data),
  devolver: (id, data) => api.post(`/herramientas/${id}/devolver`, data),
  getDisponibles: () => api.get('/herramientas/disponibles/list'),
  getAsignadasLarga: () => api.get('/herramientas/asignadas-larga/list'),
  getCategorias: () => api.get('/herramientas/categorias/list'),
}

// Servicios de movimientos
export const movimientosService = {
  getAll: (params) => api.get('/movimientos', { params }),
  getById: (id) => api.get(`/movimientos/${id}`),
  delete: (id) => api.delete(`/movimientos/${id}`),
  update: (id, data) => api.patch(`/movimientos/${id}`, data),
  getByTecnico: (id, params) => api.get(`/movimientos/tecnicos/${id}`, { params }),
  getByHerramienta: (id, params) => api.get(`/movimientos/herramientas/${id}`, { params }),
  getByConsumible: (id, params) => api.get(`/movimientos/consumibles/${id}`, { params }),
  getEstadisticas: (params) => api.get('/movimientos/estadisticas/general', { params }),
  getTecnicosActivos: (params) => api.get('/movimientos/tecnicos-activos/list', { params }),
}

// Servicios de reportes
export const reportesService = {
  getGeneral: () => api.get('/reportes/general'),
  getTecnicos: (params) => api.get('/reportes/tecnicos', { params }),
  getHerramientas: (params) => api.get('/reportes/herramientas', { params }),
  getFechas: (params) => api.get('/reportes/fechas', { params }),
}

export default api
