import { useMemo, useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { tecnicosService } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

const csvEscape = (value) => {
  if (value === null || value === undefined) return ''
  const str = String(value)
  return `"${str.replaceAll('"', '""')}"`
}

const downloadCsv = (filename, headers, rows) => {
  const csv = [
    headers.map(h => csvEscape(h.label)).join(','),
    ...rows.map(r => headers.map(h => csvEscape(r[h.key])).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function Tecnicos() {
  const { isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tecnicos, setTecnicos] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', departamento: '' })

  const [showHerramientasModal, setShowHerramientasModal] = useState(false)
  const [tecnicoHerramientas, setTecnicoHerramientas] = useState(null)
  const [resguardos, setResguardos] = useState([])
  const [resguardosLoading, setResguardosLoading] = useState(false)
  const [resguardosError, setResguardosError] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tecnicos
    return tecnicos.filter(t =>
      (t.nombre || '').toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q) ||
      (t.telefono || '').toLowerCase().includes(q) ||
      (t.departamento || '').toLowerCase().includes(q)
    )
  }, [tecnicos, search])

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await tecnicosService.getAll({})
      setTecnicos(res.data?.tecnicos ?? [])
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Error cargando técnicos'
      setError(msg)
      setTecnicos([])
    } finally {
      setLoading(false)
    }
  }

  const exportHerramientasTecnico = () => {
    const headers = [
      { key: 'tecnico', label: 'Técnico' },
      { key: 'herramienta', label: 'Herramienta' },
      { key: 'categoria', label: 'Categoría' },
      { key: 'ubicacion', label: 'Ubicación' },
      { key: 'cantidad', label: 'Cantidad' },
    ]

    const rows = resguardos.map(r => ({
      tecnico: tecnicoHerramientas?.nombre ?? '',
      herramienta: r?.herramienta_id?.nombre ?? '',
      categoria: r?.herramienta_id?.categoria ?? '',
      ubicacion: r?.herramienta_id?.ubicacion ?? '',
      cantidad: r?.cantidad ?? 0,
    }))

    const today = new Date().toISOString().slice(0, 10)
    const safeName = (tecnicoHerramientas?.nombre || 'tecnico').replaceAll(' ', '_')
    downloadCsv(`herramientas_asignadas_${safeName}_${today}.csv`, headers, rows)
  }

  useEffect(() => {
    load()
  }, [])

  const openHerramientas = async (t) => {
    try {
      setShowHerramientasModal(true)
      setTecnicoHerramientas(t)
      setResguardos([])
      setResguardosError('')
      setResguardosLoading(true)

      const res = await tecnicosService.getHerramientas(t._id)
      setResguardos(res.data?.resguardos ?? [])
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Error cargando herramientas del técnico'
      setResguardosError(msg)
      setResguardos([])
    } finally {
      setResguardosLoading(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      setError('')
      await tecnicosService.create({ ...form, activo: true })
      setShowModal(false)
      setForm({ nombre: '', email: '', telefono: '', departamento: '' })
      await load()
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Error creando técnico'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (t) => {
    setEditing(t)
    setForm({
      nombre: t?.nombre || '',
      email: t?.email || '',
      telefono: t?.telefono || '',
      departamento: t?.departamento || '',
    })
    setShowEditModal(true)
  }

  const onSubmitEdit = async (e) => {
    e.preventDefault()
    if (!editing?._id) return
    try {
      setSubmitting(true)
      setError('')
      await tecnicosService.update(editing._id, { ...form, activo: Boolean(editing.activo) })
      setShowEditModal(false)
      setEditing(null)
      setForm({ nombre: '', email: '', telefono: '', departamento: '' })
      await load()
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Error actualizando técnico'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (t) => {
    if (!t?._id) return
    const ok = window.confirm(`¿Eliminar al técnico "${t.nombre}"? Esta acción no se puede deshacer.`)
    if (!ok) return
    try {
      setSubmitting(true)
      setError('')
      await tecnicosService.delete(t._id)
      await load()
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Error eliminando técnico'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const onToggleEstado = async (t) => {
    if (!t?._id) return
    try {
      setSubmitting(true)
      setError('')
      await tecnicosService.toggleEstado(t._id)
      await load()
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Error cambiando estado del técnico'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Técnicos</h1>
          <p className="mt-1 text-sm text-gray-600">Gestiona el personal técnico del sistema</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Nuevo Técnico
          </button>
        )}
      </div>

      {error ? (
        <div className="card border border-red-200 bg-red-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-red-800">No se pudieron cargar los técnicos</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button className="btn btn-outline" onClick={load}>
              Reintentar
            </button>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <input
            className="form-input max-w-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre/email/teléfono..."
          />
          <div className="text-sm text-gray-600">Total: <span className="font-medium text-gray-900">{filtered.length}</span></div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="table-header">Nombre</th>
              <th className="table-header">Email</th>
              <th className="table-header">Teléfono</th>
              <th className="table-header">Departamento</th>
              <th className="table-header">Estado</th>
              <th className="table-header text-right sticky right-0 bg-white shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="table-row">
                <td colSpan={6} className="table-cell text-center py-10 text-gray-500">
                  No hay técnicos para mostrar
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t._id} className="table-row">
                  <td className="table-cell font-medium">{t.nombre}</td>
                  <td className="table-cell">{t.email}</td>
                  <td className="table-cell">{t.telefono}</td>
                  <td className="table-cell">{t.departamento}</td>
                  <td className="table-cell">
                    <span className={`badge ${t.activo ? 'badge-success' : 'badge-gray'}`}>
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="table-cell text-right sticky right-0 bg-white shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                    <div className="flex items-center justify-end gap-2">
                      <button className="btn btn-outline" onClick={() => openHerramientas(t)} disabled={submitting}>Herramientas</button>
                      {isAdmin ? (
                        <>
                          <button className="btn btn-outline" onClick={() => openEdit(t)} disabled={submitting}>Editar</button>
                          <button className="btn btn-outline" onClick={() => onToggleEstado(t)} disabled={submitting}>{t.activo ? 'Desactivar' : 'Activar'}</button>
                          <button className="btn btn-danger" onClick={() => onDelete(t)} disabled={submitting}>Eliminar</button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showHerramientasModal && (
        <div className="modal-overlay">
          <div className="modal-container p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Herramientas asignadas</h3>
                <p className="text-sm text-gray-600 mt-1">{tecnicoHerramientas?.nombre || ''}</p>
              </div>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowHerramientasModal(false)}>×</button>
            </div>

            {resguardosError ? (
              <div className="card border border-red-200 bg-red-50 mb-4">
                <p className="text-sm font-medium text-red-800">No se pudieron cargar las herramientas</p>
                <p className="text-sm text-red-700 mt-1">{resguardosError}</p>
              </div>
            ) : null}

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th className="table-header">Herramienta</th>
                    <th className="table-header">Categoría</th>
                    <th className="table-header">Ubicación</th>
                    <th className="table-header text-right">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {resguardosLoading ? (
                    <tr className="table-row">
                      <td colSpan={4} className="table-cell text-center py-10 text-gray-500">Cargando...</td>
                    </tr>
                  ) : resguardos.length === 0 ? (
                    <tr className="table-row">
                      <td colSpan={4} className="table-cell text-center py-10 text-gray-500">No tiene herramientas asignadas</td>
                    </tr>
                  ) : (
                    resguardos.map((r) => (
                      <tr key={r._id} className="table-row">
                        <td className="table-cell font-medium">{r?.herramienta_id?.nombre || '—'}</td>
                        <td className="table-cell">{r?.herramienta_id?.categoria || '—'}</td>
                        <td className="table-cell">{r?.herramienta_id?.ubicacion || '—'}</td>
                        <td className="table-cell text-right">{r?.cantidad ?? 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" className="btn btn-outline" onClick={exportHerramientasTecnico} disabled={resguardosLoading || resguardos.length === 0}>Exportar Excel</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowHerramientasModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Nuevo Técnico</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="form-label" htmlFor="nombre">Nombre</label>
                <input
                  id="nombre"
                  className="form-input"
                  value={form.nombre}
                  onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="form-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="form-label" htmlFor="telefono">Teléfono</label>
                <input
                  id="telefono"
                  className="form-input"
                  value={form.telefono}
                  onChange={(e) => setForm(prev => ({ ...prev, telefono: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="form-label" htmlFor="departamento">Departamento</label>
                <input
                  id="departamento"
                  className="form-input"
                  value={form.departamento}
                  onChange={(e) => setForm(prev => ({ ...prev, departamento: e.target.value }))}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <LoadingSpinner size="sm" /> : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-container p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Editar Técnico</h3>
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setShowEditModal(false)
                  setEditing(null)
                  setForm({ nombre: '', email: '', telefono: '', departamento: '' })
                }}
              >
                ×
              </button>
            </div>

            <form className="space-y-4" onSubmit={onSubmitEdit}>
              <div>
                <label className="form-label" htmlFor="nombre_edit">Nombre</label>
                <input
                  id="nombre_edit"
                  className="form-input"
                  value={form.nombre}
                  onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="form-label" htmlFor="email_edit">Email</label>
                <input
                  id="email_edit"
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="form-label" htmlFor="telefono_edit">Teléfono</label>
                <input
                  id="telefono_edit"
                  className="form-input"
                  value={form.telefono}
                  onChange={(e) => setForm(prev => ({ ...prev, telefono: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="form-label" htmlFor="departamento_edit">Departamento</label>
                <input
                  id="departamento_edit"
                  className="form-input"
                  value={form.departamento}
                  onChange={(e) => setForm(prev => ({ ...prev, departamento: e.target.value }))}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditing(null)
                    setForm({ nombre: '', email: '', telefono: '', departamento: '' })
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <LoadingSpinner size="sm" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
