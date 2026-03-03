import { useEffect, useMemo, useState } from 'react'
import { consumiblesService } from '../services/api'
import { tecnicosService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

const UNIDADES = ['pieza', 'caja', 'paquete', 'metro', 'kilogramo', 'litro', 'rollo']

const buildErrorMessage = (e) => {
  const data = e?.response?.data
  if (data?.detalles?.length) return `${data.error}: ${data.detalles.join(' | ')}`
  return data?.error || e?.message || 'Error'
}

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

export default function Consumibles() {
  const { isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [consumibles, setConsumibles] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showEntregaModal, setShowEntregaModal] = useState(false)
  const [entregaItem, setEntregaItem] = useState(null)
  const [entregaForm, setEntregaForm] = useState({ tecnico_id: '', cantidad: 1, notas: '' })
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    categoria: '',
    unidad: 'pieza',
    stock_actual: 0,
    stock_minimo: 10,
    ubicacion: '',
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return consumibles
    return consumibles.filter(c =>
      (c.nombre || '').toLowerCase().includes(q) ||
      (c.descripcion || '').toLowerCase().includes(q) ||
      (c.categoria || '').toLowerCase().includes(q) ||
      (c.ubicacion || '').toLowerCase().includes(q)
    )
  }, [consumibles, search])

  const exportExcel = () => {
    const headers = [
      { key: 'nombre', label: 'Nombre' },
      { key: 'categoria', label: 'Categoría' },
      { key: 'unidad', label: 'Unidad' },
      { key: 'stock_actual', label: 'Stock actual' },
      { key: 'stock_minimo', label: 'Stock mínimo' },
      { key: 'ubicacion', label: 'Ubicación' },
    ]

    const rows = filtered.map(c => ({
      nombre: c?.nombre ?? '',
      categoria: c?.categoria ?? '',
      unidad: c?.unidad ?? '',
      stock_actual: c?.stock_actual ?? 0,
      stock_minimo: c?.stock_minimo ?? 0,
      ubicacion: c?.ubicacion ?? '',
    }))

    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(`consumibles_${today}.csv`, headers, rows)
  }

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const [res, tecnicosRes] = await Promise.all([
        consumiblesService.getAll({ limit: 1000 }),
        tecnicosService.getAll({ limit: 1000 }),
      ])
      setConsumibles(res.data?.consumibles ?? [])
      setTecnicos(tecnicosRes.data?.tecnicos ?? [])
    } catch (e) {
      setError(buildErrorMessage(e))
      setConsumibles([])
      setTecnicos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      setError('')
      await consumiblesService.create({
        ...form,
        stock_actual: Number(form.stock_actual),
        stock_minimo: Number(form.stock_minimo),
        activo: true,
      })
      setShowModal(false)
      setForm({
        nombre: '',
        descripcion: '',
        categoria: '',
        unidad: 'pieza',
        stock_actual: 0,
        stock_minimo: 10,
        ubicacion: '',
      })
      await load()
    } catch (e) {
      setError(buildErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmitEdit = async (e) => {
    e.preventDefault()
    if (!editing?._id) return
    try {
      setSubmitting(true)
      setError('')
      await consumiblesService.update(editing._id, {
        ...form,
        stock_actual: Number(form.stock_actual),
        stock_minimo: Number(form.stock_minimo),
        activo: editing.activo ?? true,
      })
      setShowEditModal(false)
      setEditing(null)
      setForm({
        nombre: '',
        descripcion: '',
        categoria: '',
        unidad: 'pieza',
        stock_actual: 0,
        stock_minimo: 10,
        ubicacion: '',
      })
      await load()
    } catch (e) {
      setError(buildErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const onDelete = async (item) => {
    if (!item?._id) return
    const ok = window.confirm(`¿Eliminar consumible "${item.nombre}"?`)
    if (!ok) return
    try {
      setSubmitting(true)
      setError('')
      await consumiblesService.delete(item._id)
      await load()
    } catch (e) {
      setError(buildErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      nombre: item?.nombre ?? '',
      descripcion: item?.descripcion ?? '',
      categoria: item?.categoria ?? '',
      unidad: item?.unidad ?? 'pieza',
      stock_actual: item?.stock_actual ?? 0,
      stock_minimo: item?.stock_minimo ?? 10,
      ubicacion: item?.ubicacion ?? '',
    })
    setShowEditModal(true)
  }

  const openEntrega = (item) => {
    setEntregaItem(item)
    setEntregaForm({ tecnico_id: '', cantidad: 1, notas: '' })
    setShowEntregaModal(true)
  }

  const onSubmitEntrega = async (e) => {
    e.preventDefault()
    if (!entregaItem?._id) return
    try {
      setSubmitting(true)
      setError('')
      await consumiblesService.asignar(entregaItem._id, {
        tecnico_id: entregaForm.tecnico_id,
        cantidad: Number(entregaForm.cantidad),
        notas: entregaForm.notas,
      })
      setShowEntregaModal(false)
      setEntregaItem(null)
      await load()
    } catch (e) {
      setError(buildErrorMessage(e))
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
          <h1 className="text-2xl font-bold text-gray-900">Consumibles</h1>
          <p className="mt-1 text-sm text-gray-600">Gestiona los materiales y consumibles del sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline" onClick={exportExcel} disabled={loading || submitting || filtered.length === 0}>
            Exportar Excel
          </button>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              Nuevo Consumible
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className="card border border-red-200 bg-red-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-red-800">No se pudo completar la operación</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button className="btn btn-outline" onClick={load}>Reintentar</button>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <input
            className="form-input max-w-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre/categoría/ubicación..."
          />
          <div className="text-sm text-gray-600">Total: <span className="font-medium text-gray-900">{filtered.length}</span></div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="table-header w-2/5">Nombre</th>
              <th className="table-header w-1/5">Categoría</th>
              <th className="table-header w-1/12">Unidad</th>
              <th className="table-header w-1/12">Stock</th>
              <th className="table-header w-1/12">Mínimo</th>
              <th className="table-header w-1/6">Ubicación</th>
              <th className="table-header text-right sticky right-0 bg-white shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)] w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="table-row">
                <td colSpan={7} className="table-cell text-center py-10 text-gray-500">No hay consumibles para mostrar</td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c._id} className="table-row">
                  <td className="table-cell font-medium max-w-xs truncate" title={c.nombre}>{c.nombre}</td>
                  <td className="table-cell max-w-xs truncate" title={c.categoria}>{c.categoria}</td>
                  <td className="table-cell">{c.unidad}</td>
                  <td className="table-cell">{c.stock_actual}</td>
                  <td className="table-cell">{c.stock_minimo}</td>
                  <td className="table-cell">{c.ubicacion}</td>
                  <td className="table-cell text-right sticky right-0 bg-white shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                    <div className="flex items-center justify-end gap-2">
                      <button className="btn btn-outline" onClick={() => openEntrega(c)} disabled={submitting}>Entregar</button>
                      {isAdmin ? (
                        <>
                          <button className="btn btn-outline" onClick={() => openEdit(c)} disabled={submitting}>Editar</button>
                          <button className="btn btn-outline" onClick={() => onDelete(c)} disabled={submitting}>Eliminar</button>
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

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Nuevo Consumible</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="form-label" htmlFor="nombre">Nombre</label>
                <input id="nombre" className="form-input" value={form.nombre} onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))} required />
              </div>

              <div>
                <label className="form-label" htmlFor="descripcion">Descripción</label>
                <input id="descripcion" className="form-input" value={form.descripcion} onChange={(e) => setForm(p => ({ ...p, descripcion: e.target.value }))} />
              </div>

              <div>
                <label className="form-label" htmlFor="categoria">Categoría</label>
                <input id="categoria" className="form-input" value={form.categoria} onChange={(e) => setForm(p => ({ ...p, categoria: e.target.value }))} required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label" htmlFor="unidad">Unidad</label>
                  <select id="unidad" className="form-input" value={form.unidad} onChange={(e) => setForm(p => ({ ...p, unidad: e.target.value }))}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label" htmlFor="ubicacion">Ubicación</label>
                  <input id="ubicacion" className="form-input" value={form.ubicacion} onChange={(e) => setForm(p => ({ ...p, ubicacion: e.target.value }))} required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label" htmlFor="stock_actual">Stock actual</label>
                  <input id="stock_actual" type="number" min="0" className="form-input" value={form.stock_actual} onChange={(e) => setForm(p => ({ ...p, stock_actual: e.target.value }))} required />
                </div>
                <div>
                  <label className="form-label" htmlFor="stock_minimo">Stock mínimo</label>
                  <input id="stock_minimo" type="number" min="0" className="form-input" value={form.stock_minimo} onChange={(e) => setForm(p => ({ ...p, stock_minimo: e.target.value }))} required />
                </div>
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
              <h3 className="text-lg font-medium text-gray-900">Editar Consumible</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowEditModal(false)}>×</button>
            </div>

            <form className="space-y-4" onSubmit={onSubmitEdit}>
              <div>
                <label className="form-label" htmlFor="nombre_edit">Nombre</label>
                <input id="nombre_edit" className="form-input" value={form.nombre} onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))} required />
              </div>

              <div>
                <label className="form-label" htmlFor="descripcion_edit">Descripción</label>
                <input id="descripcion_edit" className="form-input" value={form.descripcion} onChange={(e) => setForm(p => ({ ...p, descripcion: e.target.value }))} />
              </div>

              <div>
                <label className="form-label" htmlFor="categoria_edit">Categoría</label>
                <input id="categoria_edit" className="form-input" value={form.categoria} onChange={(e) => setForm(p => ({ ...p, categoria: e.target.value }))} required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label" htmlFor="unidad_edit">Unidad</label>
                  <select id="unidad_edit" className="form-input" value={form.unidad} onChange={(e) => setForm(p => ({ ...p, unidad: e.target.value }))}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label" htmlFor="ubicacion_edit">Ubicación</label>
                  <input id="ubicacion_edit" className="form-input" value={form.ubicacion} onChange={(e) => setForm(p => ({ ...p, ubicacion: e.target.value }))} required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label" htmlFor="stock_actual_edit">Stock actual</label>
                  <input id="stock_actual_edit" type="number" min="0" className="form-input" value={form.stock_actual} onChange={(e) => setForm(p => ({ ...p, stock_actual: e.target.value }))} required />
                </div>
                <div>
                  <label className="form-label" htmlFor="stock_minimo_edit">Stock mínimo</label>
                  <input id="stock_minimo_edit" type="number" min="0" className="form-input" value={form.stock_minimo} onChange={(e) => setForm(p => ({ ...p, stock_minimo: e.target.value }))} required />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <LoadingSpinner size="sm" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEntregaModal && (
        <div className="modal-overlay">
          <div className="modal-container p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Entregar Consumible</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowEntregaModal(false)}>×</button>
            </div>

            <div className="card mb-4">
              <div className="text-sm text-gray-600">Consumible</div>
              <div className="text-base font-medium text-gray-900">{entregaItem?.nombre}</div>
              <div className="text-sm text-gray-600 mt-1">Stock actual: <span className="font-medium text-gray-900">{entregaItem?.stock_actual}</span></div>
            </div>

            <form className="space-y-4" onSubmit={onSubmitEntrega}>
              <div>
                <label className="form-label" htmlFor="tecnico_entrega">Técnico</label>
                <select id="tecnico_entrega" className="form-input" value={entregaForm.tecnico_id} onChange={(e) => setEntregaForm(p => ({ ...p, tecnico_id: e.target.value }))} required>
                  <option value="">Selecciona un técnico...</option>
                  {tecnicos.map(t => <option key={t._id} value={t._id}>{t.nombre}{t.email ? ` - ${t.email}` : ''}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label" htmlFor="cantidad_entrega">Cantidad</label>
                  <input id="cantidad_entrega" type="number" min="1" className="form-input" value={entregaForm.cantidad} onChange={(e) => setEntregaForm(p => ({ ...p, cantidad: e.target.value }))} required />
                </div>
                <div>
                  <label className="form-label" htmlFor="notas_entrega">Notas</label>
                  <input id="notas_entrega" className="form-input" value={entregaForm.notas} onChange={(e) => setEntregaForm(p => ({ ...p, notas: e.target.value }))} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn btn-outline" onClick={() => setShowEntregaModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <LoadingSpinner size="sm" /> : 'Registrar entrega'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
