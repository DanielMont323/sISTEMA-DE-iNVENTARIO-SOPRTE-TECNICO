import { useEffect, useMemo, useState } from 'react'
import LoadingSpinner from '../components/LoadingSpinner'
import { consumiblesService, herramientasService, movimientosService, tecnicosService } from '../services/api'
import { useAuth } from '../context/AuthContext'

const formatTipo = (tipo) => {
  const map = {
    consumible_asignacion: 'Entrega consumible',
    consumible_devolucion: 'Devolución consumible',
    herramienta_asignacion: 'Asignación herramienta',
    herramienta_devolucion: 'Devolución herramienta',
  }
  return map[tipo] || tipo || '—'
}

const formatFecha = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}

export default function Movimientos() {
  const { isAdmin } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [movimientos, setMovimientos] = useState([])
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState('')
  const [itemTipo, setItemTipo] = useState('')

  const [showEditModal, setShowEditModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [catTecnicos, setCatTecnicos] = useState([])
  const [catConsumibles, setCatConsumibles] = useState([])
  const [catHerramientas, setCatHerramientas] = useState([])
  const [editForm, setEditForm] = useState({
    tipo: 'consumible_asignacion',
    item_tipo: 'Consumible',
    item_id: '',
    tecnico_id: '',
    cantidad: 1,
  })

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await movimientosService.getAll({ limit: 200 })
      setMovimientos(res.data?.movimientos ?? [])
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Error cargando movimientos'
      setError(msg)
      setMovimientos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onDelete = async (m) => {
    const ok = window.confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')
    if (!ok) return

    try {
      await movimientosService.delete(m._id)
      setMovimientos((prev) => prev.filter((x) => x._id !== m._id))
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Error eliminando movimiento'
      setError(msg)
    }
  }

  const openEdit = async (m) => {
    setShowEditModal(true)
    setEditing(m)
    setCatalogError('')

    setEditForm({
      tipo: m.tipo,
      item_tipo: m.item_tipo,
      item_id: m?.item_id?._id || m.item_id,
      tecnico_id: m?.tecnico_id?._id || m.tecnico_id,
      cantidad: m?.cantidad ?? 1,
    })

    try {
      setCatalogLoading(true)
      const [tRes, cRes, hRes] = await Promise.all([
        tecnicosService.getAll({ limit: 500 }),
        consumiblesService.getAll({ limit: 1000 }),
        herramientasService.getAll({ limit: 1000 }),
      ])

      setCatTecnicos(tRes.data?.tecnicos ?? [])
      setCatConsumibles(cRes.data?.consumibles ?? [])
      setCatHerramientas(hRes.data?.herramientas ?? [])
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Error cargando catálogos'
      setCatalogError(msg)
      setCatTecnicos([])
      setCatConsumibles([])
      setCatHerramientas([])
    } finally {
      setCatalogLoading(false)
    }
  }

  const onSubmitEdit = async (e) => {
    e.preventDefault()
    if (!editing) return

    try {
      setEditSubmitting(true)
      setError('')
      const payload = {
        tipo: editForm.tipo,
        item_tipo: editForm.item_tipo,
        item_id: editForm.item_id,
        tecnico_id: editForm.tecnico_id,
        cantidad: Number(editForm.cantidad),
      }
      const res = await movimientosService.update(editing._id, payload)
      const updated = res.data?.movimiento
      if (updated?._id) {
        setMovimientos((prev) => prev.map((x) => (x._id === updated._id ? updated : x)))
      }
      setShowEditModal(false)
      setEditing(null)
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Error actualizando movimiento'
      setError(msg)
    } finally {
      setEditSubmitting(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return movimientos.filter((m) => {
      if (tipo && m.tipo !== tipo) return false
      if (itemTipo && m.item_tipo !== itemTipo) return false

      if (!q) return true

      const itemNombre = (m?.item_id?.nombre || '').toLowerCase()
      const itemCategoria = (m?.item_id?.categoria || '').toLowerCase()
      const tecnicoNombre = (m?.tecnico_id?.nombre || '').toLowerCase()
      const realizadoPor = (m?.realizado_por?.nombre || '').toLowerCase()
      const notas = (m?.notas || '').toLowerCase()
      const tipoLabel = formatTipo(m.tipo).toLowerCase()

      return (
        itemNombre.includes(q) ||
        itemCategoria.includes(q) ||
        tecnicoNombre.includes(q) ||
        realizadoPor.includes(q) ||
        notas.includes(q) ||
        tipoLabel.includes(q)
      )
    })
  }, [movimientos, search, tipo, itemTipo])

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
          <h1 className="text-2xl font-bold text-gray-900">Movimientos</h1>
          <p className="mt-1 text-sm text-gray-600">Historial de entregas/devoluciones y quién las realizó</p>
        </div>
        <button className="btn btn-outline" onClick={load}>Actualizar</button>
      </div>

      {error ? (
        <div className="card border border-red-200 bg-red-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-red-800">No se pudieron cargar los movimientos</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button className="btn btn-outline" onClick={load}>Reintentar</button>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="form-input md:col-span-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar (herramienta/consumible, técnico, usuario, notas, tipo...)"
          />
          <select className="form-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="consumible_asignacion">Entrega consumible</option>
            <option value="consumible_devolucion">Devolución consumible</option>
            <option value="herramienta_asignacion">Asignación herramienta</option>
            <option value="herramienta_devolucion">Devolución herramienta</option>
          </select>
          <select className="form-input" value={itemTipo} onChange={(e) => setItemTipo(e.target.value)}>
            <option value="">Todos los items</option>
            <option value="Consumible">Consumible</option>
            <option value="Herramienta">Herramienta</option>
          </select>
        </div>
        <div className="mt-3 text-sm text-gray-600">Total: <span className="font-medium text-gray-900">{filtered.length}</span></div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="table-header">Fecha</th>
              <th className="table-header">Movimiento</th>
              <th className="table-header">Item</th>
              <th className="table-header">Categoría</th>
              <th className="table-header text-right">Cantidad</th>
              <th className="table-header">Técnico</th>
              <th className="table-header">Realizado por</th>
              <th className="table-header">Rol</th>
              <th className="table-header">Notas</th>
              {isAdmin ? (
                <th className="table-header text-right sticky right-0 bg-white shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">Acciones</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr className="table-row">
                <td colSpan={isAdmin ? 10 : 9} className="table-cell text-center py-10 text-gray-500">No hay movimientos para mostrar</td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m._id} className="table-row">
                  <td className="table-cell">{formatFecha(m.fecha)}</td>
                  <td className="table-cell">
                    <span className="badge badge-gray">{formatTipo(m.tipo)}</span>
                  </td>
                  <td className="table-cell font-medium">{m?.item_id?.nombre || '—'}</td>
                  <td className="table-cell">{m?.item_id?.categoria || '—'}</td>
                  <td className="table-cell text-right">{m?.cantidad ?? 0}</td>
                  <td className="table-cell">{m?.tecnico_id?.nombre || '—'}</td>
                  <td className="table-cell">{m?.realizado_por?.nombre || '—'}</td>
                  <td className="table-cell">{m?.rol_realizador || m?.realizado_por?.rol || '—'}</td>
                  <td className="table-cell">{m?.notas || '—'}</td>
                  {isAdmin ? (
                    <td className="table-cell text-right sticky right-0 bg-white shadow-[-8px_0_12px_-12px_rgba(0,0,0,0.25)]">
                      <div className="flex items-center justify-end gap-2">
                        <button className="btn btn-outline" onClick={() => openEdit(m)}>Editar</button>
                        <button className="btn btn-outline" onClick={() => onDelete(m)}>Eliminar</button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showEditModal && isAdmin ? (
        <div className="modal-overlay">
          <div className="modal-container p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Editar movimiento</h3>
                <p className="text-sm text-gray-600 mt-1">{editing?._id || ''}</p>
              </div>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => { setShowEditModal(false); setEditing(null) }}>×</button>
            </div>

            {catalogError ? (
              <div className="card border border-red-200 bg-red-50 mb-4">
                <p className="text-sm font-medium text-red-800">No se pudieron cargar los catálogos</p>
                <p className="text-sm text-red-700 mt-1">{catalogError}</p>
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={onSubmitEdit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label" htmlFor="tipo">Tipo</label>
                  <select
                    id="tipo"
                    className="form-input"
                    value={editForm.tipo}
                    onChange={(e) => setEditForm((p) => ({ ...p, tipo: e.target.value }))}
                    disabled={catalogLoading || editSubmitting}
                    required
                  >
                    <option value="consumible_asignacion">Entrega consumible</option>
                    <option value="consumible_devolucion">Devolución consumible</option>
                    <option value="herramienta_asignacion">Asignación herramienta</option>
                    <option value="herramienta_devolucion">Devolución herramienta</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" htmlFor="item_tipo">Tipo de item</label>
                  <select
                    id="item_tipo"
                    className="form-input"
                    value={editForm.item_tipo}
                    onChange={(e) => setEditForm((p) => ({ ...p, item_tipo: e.target.value, item_id: '' }))}
                    disabled={catalogLoading || editSubmitting}
                    required
                  >
                    <option value="Consumible">Consumible</option>
                    <option value="Herramienta">Herramienta</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="form-label" htmlFor="item_id">Item</label>
                  <select
                    id="item_id"
                    className="form-input"
                    value={editForm.item_id}
                    onChange={(e) => setEditForm((p) => ({ ...p, item_id: e.target.value }))}
                    disabled={catalogLoading || editSubmitting}
                    required
                  >
                    <option value="">Selecciona...</option>
                    {editForm.item_tipo === 'Consumible'
                      ? catConsumibles.map((c) => (
                        <option key={c._id} value={c._id}>{c.nombre} ({c.categoria})</option>
                      ))
                      : catHerramientas.map((h) => (
                        <option key={h._id} value={h._id}>{h.nombre} ({h.categoria})</option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="form-label" htmlFor="tecnico_id">Técnico</label>
                  <select
                    id="tecnico_id"
                    className="form-input"
                    value={editForm.tecnico_id}
                    onChange={(e) => setEditForm((p) => ({ ...p, tecnico_id: e.target.value }))}
                    disabled={catalogLoading || editSubmitting}
                    required
                  >
                    <option value="">Selecciona...</option>
                    {catTecnicos.map((t) => (
                      <option key={t._id} value={t._id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" htmlFor="cantidad">Cantidad</label>
                  <input
                    id="cantidad"
                    type="number"
                    min={1}
                    className="form-input"
                    value={editForm.cantidad}
                    onChange={(e) => setEditForm((p) => ({ ...p, cantidad: e.target.value }))}
                    disabled={catalogLoading || editSubmitting}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className="btn btn-outline" onClick={() => { setShowEditModal(false); setEditing(null) }} disabled={editSubmitting}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={catalogLoading || editSubmitting}>
                  {editSubmitting ? <LoadingSpinner size="sm" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
