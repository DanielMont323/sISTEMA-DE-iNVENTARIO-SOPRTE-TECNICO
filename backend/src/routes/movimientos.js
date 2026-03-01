const express = require('express');
const mongoose = require('mongoose');
const Movimiento = require('../models/Movimiento');
const Consumible = require('../models/Consumible');
const Herramienta = require('../models/Herramienta');
const Tecnico = require('../models/Tecnico');
const Usuario = require('../models/Usuario');
const ResguardoHerramienta = require('../models/ResguardoHerramienta');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const normalizeTipo = (tipo) => String(tipo || '').trim();
const normalizeItemTipo = (t) => String(t || '').trim();

const isValidObjectId = (v) => mongoose.Types.ObjectId.isValid(v);

const assertCantidad = (cantidad) => {
  const c = Number(cantidad);
  if (!Number.isFinite(c) || c < 1) {
    const err = new Error('Cantidad inválida');
    err.status = 400;
    throw err;
  }
  return c;
};

const assertTecnico = async (tecnico_id, session) => {
  if (!isValidObjectId(tecnico_id)) {
    const err = new Error('Técnico inválido');
    err.status = 400;
    throw err;
  }
  const tecnico = await Tecnico.findById(tecnico_id).session(session);
  if (!tecnico) {
    const err = new Error('Técnico no encontrado');
    err.status = 404;
    throw err;
  }
  return tecnico;
};

const getItemDoc = async ({ item_tipo, item_id, session }) => {
  if (!isValidObjectId(item_id)) {
    const err = new Error('Item inválido');
    err.status = 400;
    throw err;
  }
  if (item_tipo === 'Consumible') {
    const doc = await Consumible.findById(item_id).session(session);
    if (!doc) {
      const err = new Error('Consumible no encontrado');
      err.status = 404;
      throw err;
    }
    return doc;
  }
  if (item_tipo === 'Herramienta') {
    const doc = await Herramienta.findById(item_id).session(session);
    if (!doc) {
      const err = new Error('Herramienta no encontrada');
      err.status = 404;
      throw err;
    }
    return doc;
  }

  const err = new Error('item_tipo inválido');
  err.status = 400;
  throw err;
};

const applyImpact = async ({ tipo, item_tipo, item_id, tecnico_id, cantidad, session, isRevert }) => {
  // isRevert=false => aplicar movimiento
  // isRevert=true  => revertir movimiento (aplicar inverso)
  const t = normalizeTipo(tipo);
  const it = normalizeItemTipo(item_tipo);
  const cant = assertCantidad(cantidad);

  // Consumibles
  if (it === 'Consumible') {
    const consumible = await getItemDoc({ item_tipo: it, item_id, session });

    if (t === 'consumible_asignacion') {
      // asignación => stock_actual -= cant
      // revertir   => stock_actual += cant
      const delta = isRevert ? cant : -cant;
      if (!isRevert && consumible.stock_actual < cant) {
        const err = new Error('Stock insuficiente');
        err.status = 400;
        throw err;
      }
      if (isRevert && (consumible.stock_actual + cant) < 0) {
        const err = new Error('Reversión inválida de stock');
        err.status = 400;
        throw err;
      }
      consumible.stock_actual += delta;
      await consumible.save({ session });
      return;
    }

    if (t === 'consumible_devolucion') {
      // devolución => stock_actual += cant
      // revertir   => stock_actual -= cant
      const delta = isRevert ? -cant : cant;
      if (isRevert && consumible.stock_actual < cant) {
        const err = new Error('No se puede revertir: stock quedaría negativo');
        err.status = 400;
        throw err;
      }
      consumible.stock_actual += delta;
      await consumible.save({ session });
      return;
    }

    const err = new Error('tipo inválido para Consumible');
    err.status = 400;
    throw err;
  }

  // Herramientas
  if (it === 'Herramienta') {
    await assertTecnico(tecnico_id, session);
    const herramienta = await getItemDoc({ item_tipo: it, item_id, session });

    if (t === 'herramienta_asignacion') {
      // asignación => disponible -= cant, resguardo += cant
      // revertir   => disponible += cant, resguardo -= cant
      if (!isRevert && herramienta.cantidad_disponible < cant) {
        const err = new Error('Stock disponible insuficiente');
        err.status = 400;
        throw err;
      }

      herramienta.cantidad_disponible += isRevert ? cant : -cant;
      if (herramienta.cantidad_disponible < 0) {
        const err = new Error('Operación inválida: disponible negativo');
        err.status = 400;
        throw err;
      }
      await herramienta.save({ session });

      const resguardo = await ResguardoHerramienta.findOne({ herramienta_id: herramienta._id, tecnico_id }).session(session);

      if (!isRevert) {
        if (resguardo) {
          resguardo.cantidad += cant;
          await resguardo.save({ session });
        } else {
          await ResguardoHerramienta.create([{
            herramienta_id: herramienta._id,
            tecnico_id,
            cantidad: cant,
            fecha_asignacion: new Date()
          }], { session });
        }
      } else {
        if (!resguardo) {
          const err = new Error('No se puede revertir: no existe resguardo');
          err.status = 400;
          throw err;
        }
        if (resguardo.cantidad < cant) {
          const err = new Error('No se puede revertir: cantidad excede resguardo');
          err.status = 400;
          throw err;
        }
        resguardo.cantidad -= cant;
        if (resguardo.cantidad === 0) {
          await ResguardoHerramienta.deleteOne({ _id: resguardo._id }).session(session);
        } else {
          await resguardo.save({ session });
        }
      }

      return;
    }

    if (t === 'herramienta_devolucion') {
      // devolución => disponible += cant, resguardo -= cant
      // revertir   => disponible -= cant, resguardo += cant
      const resguardo = await ResguardoHerramienta.findOne({ herramienta_id: herramienta._id, tecnico_id }).session(session);

      if (!isRevert) {
        if (!resguardo) {
          const err = new Error('No existe resguardo activo de esta herramienta para el técnico');
          err.status = 400;
          throw err;
        }
        if (resguardo.cantidad < cant) {
          const err = new Error('La cantidad a devolver excede la cantidad en resguardo');
          err.status = 400;
          throw err;
        }
      }

      // disponible
      herramienta.cantidad_disponible += isRevert ? -cant : cant;
      if (herramienta.cantidad_disponible < 0) {
        const err = new Error('Operación inválida: disponible negativo');
        err.status = 400;
        throw err;
      }
      await herramienta.save({ session });

      if (!isRevert) {
        resguardo.cantidad -= cant;
        if (resguardo.cantidad === 0) {
          await ResguardoHerramienta.deleteOne({ _id: resguardo._id }).session(session);
        } else {
          await resguardo.save({ session });
        }
      } else {
        if (resguardo) {
          resguardo.cantidad += cant;
          await resguardo.save({ session });
        } else {
          await ResguardoHerramienta.create([{
            herramienta_id: herramienta._id,
            tecnico_id,
            cantidad: cant,
            fecha_asignacion: new Date()
          }], { session });
        }
      }

      return;
    }

    const err = new Error('tipo inválido para Herramienta');
    err.status = 400;
    throw err;
  }
};

// GET /api/movimientos - Listar todos los movimientos con filtros
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      tipo, 
      tecnico_id, 
      item_tipo, 
      fecha_inicio, 
      fecha_fin,
      realizado_por 
    } = req.query;
    
    const filtro = {};

    // Filtros
    if (tipo) {
      filtro.tipo = tipo;
    }

    if (tecnico_id) {
      filtro.tecnico_id = tecnico_id;
    }

    if (item_tipo) {
      filtro.item_tipo = item_tipo;
    }

    if (realizado_por) {
      filtro.realizado_por = realizado_por;
    }

    // Filtro por rango de fechas
    if (fecha_inicio || fecha_fin) {
      filtro.fecha = {};
      if (fecha_inicio) {
        filtro.fecha.$gte = new Date(fecha_inicio);
      }
      if (fecha_fin) {
        filtro.fecha.$lte = new Date(fecha_fin);
      }
    }

    const skip = (page - 1) * limit;
    
    const [movimientos, total] = await Promise.all([
      Movimiento.find(filtro)
        .populate('item_id', 'nombre categoria')
        .populate('tecnico_id', 'nombre email')
        .populate('realizado_por', 'nombre rol')
        .sort({ fecha: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Movimiento.countDocuments(filtro)
    ]);

    res.json({
      movimientos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listando movimientos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/movimientos/tecnicos/:id - Movimientos por técnico
router.get('/tecnicos/:id', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, tipo, item_tipo } = req.query;
    
    const filtro = { tecnico_id: req.params.id };
    
    if (tipo) {
      filtro.tipo = tipo;
    }

    if (item_tipo) {
      filtro.item_tipo = item_tipo;
    }

    const skip = (page - 1) * limit;
    
    const [movimientos, total] = await Promise.all([
      Movimiento.find(filtro)
        .populate('item_id', 'nombre categoria')
        .populate('realizado_por', 'nombre rol')
        .sort({ fecha: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Movimiento.countDocuments(filtro)
    ]);

    res.json({
      movimientos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo movimientos del técnico:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/movimientos/herramientas/:id - Movimientos por herramienta
router.get('/herramientas/:id', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const filtro = { 
      item_id: req.params.id,
      item_tipo: 'Herramienta'
    };
    
    const skip = (page - 1) * limit;
    
    const [movimientos, total] = await Promise.all([
      Movimiento.find(filtro)
        .populate('tecnico_id', 'nombre email')
        .populate('realizado_por', 'nombre rol')
        .sort({ fecha: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Movimiento.countDocuments(filtro)
    ]);

    res.json({
      movimientos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo movimientos de la herramienta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/movimientos/consumibles/:id - Movimientos por consumible
router.get('/consumibles/:id', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const filtro = { 
      item_id: req.params.id,
      item_tipo: 'Consumible'
    };
    
    const skip = (page - 1) * limit;
    
    const [movimientos, total] = await Promise.all([
      Movimiento.find(filtro)
        .populate('tecnico_id', 'nombre email')
        .populate('realizado_por', 'nombre rol')
        .sort({ fecha: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Movimiento.countDocuments(filtro)
    ]);

    res.json({
      movimientos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error obteniendo movimientos del consumible:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/movimientos/estadisticas - Estadísticas de movimientos
router.get('/estadisticas/general', authMiddleware, async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - parseInt(dias));

    // Estadísticas generales
    const [
      totalMovimientos,
      movimientosPorTipo,
      movimientosPorRol,
      movimientosRecientes
    ] = await Promise.all([
      Movimiento.countDocuments({ fecha: { $gte: fechaLimite } }),
      Movimiento.aggregate([
        { $match: { fecha: { $gte: fechaLimite } } },
        { $group: { _id: '$tipo', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Movimiento.aggregate([
        { $match: { fecha: { $gte: fechaLimite } } },
        { $group: { _id: '$rol_realizador', count: { $sum: 1 } } }
      ]),
      Movimiento.find({ fecha: { $gte: fechaLimite } })
        .populate('item_id', 'nombre categoria')
        .populate('tecnico_id', 'nombre')
        .populate('realizado_por', 'nombre')
        .sort({ fecha: -1 })
        .limit(10)
    ]);

    res.json({
      periodo_dias: parseInt(dias),
      total_movimientos: totalMovimientos,
      movimientos_por_tipo: movimientosPorTipo,
      movimientos_por_rol: movimientosPorRol,
      movimientos_recientes: movimientosRecientes
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/movimientos/tecnicos-activos - Técnicos con más movimientos
router.get('/tecnicos-activos/list', authMiddleware, async (req, res) => {
  try {
    const { dias = 30, limite = 10 } = req.query;
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - parseInt(dias));

    const tecnicosActivos = await Movimiento.aggregate([
      { $match: { fecha: { $gte: fechaLimite } } },
      { $group: { 
        _id: '$tecnico_id', 
        total_movimientos: { $sum: 1 },
        ultimo_movimiento: { $max: '$fecha' }
      }},
      { $sort: { total_movimientos: -1 } },
      { $limit: parseInt(limite) },
      { $lookup: {
        from: 'tecnicos',
        localField: '_id',
        foreignField: '_id',
        as: 'tecnico'
      }},
      { $unwind: '$tecnico' },
      { $project: {
        tecnico: '$tecnico.nombre',
        email: '$tecnico.email',
        total_movimientos: 1,
        ultimo_movimiento: 1
      }}
    ]);

    res.json({ tecnicos_activos: tecnicosActivos });
  } catch (error) {
    console.error('Error obteniendo técnicos activos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/movimientos/:id - Obtener movimiento por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const movimiento = await Movimiento.findById(req.params.id)
      .populate('item_id')
      .populate('tecnico_id', 'nombre email telefono')
      .populate('realizado_por', 'nombre rol');

    if (!movimiento) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }

    res.json(movimiento);
  } catch (error) {
    console.error('Error obteniendo movimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/movimientos/:id - Eliminar movimiento (solo admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const movimiento = await Movimiento.findByIdAndDelete(req.params.id);

    if (!movimiento) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }

    res.json({ mensaje: 'Movimiento eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando movimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/movimientos/:id - Editar movimiento (solo admin) revirtiendo y reaplicando impacto
router.patch('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const movimiento = await Movimiento.findById(req.params.id).session(session);
      if (!movimiento) {
        const err = new Error('Movimiento no encontrado');
        err.status = 404;
        throw err;
      }

      const nextTipo = normalizeTipo(req.body.tipo ?? movimiento.tipo);
      const nextItemTipo = normalizeItemTipo(req.body.item_tipo ?? movimiento.item_tipo);
      const nextItemId = req.body.item_id ?? movimiento.item_id;
      const nextTecnicoId = req.body.tecnico_id ?? movimiento.tecnico_id;
      const nextCantidad = req.body.cantidad ?? movimiento.cantidad;
      const nextNotas = req.body.notas ?? movimiento.notas;
      const nextFecha = req.body.fecha ?? movimiento.fecha;

      // Validaciones mínimas
      assertCantidad(nextCantidad);
      if (!['Consumible', 'Herramienta'].includes(nextItemTipo)) {
        const err = new Error('item_tipo inválido');
        err.status = 400;
        throw err;
      }
      if (!isValidObjectId(nextItemId)) {
        const err = new Error('item_id inválido');
        err.status = 400;
        throw err;
      }
      if (!isValidObjectId(nextTecnicoId)) {
        const err = new Error('tecnico_id inválido');
        err.status = 400;
        throw err;
      }

      // 1) Revertir impacto del movimiento actual
      await applyImpact({
        tipo: movimiento.tipo,
        item_tipo: movimiento.item_tipo,
        item_id: movimiento.item_id,
        tecnico_id: movimiento.tecnico_id,
        cantidad: movimiento.cantidad,
        session,
        isRevert: true,
      });

      // 2) Aplicar impacto con los datos nuevos
      await applyImpact({
        tipo: nextTipo,
        item_tipo: nextItemTipo,
        item_id: nextItemId,
        tecnico_id: nextTecnicoId,
        cantidad: nextCantidad,
        session,
        isRevert: false,
      });

      // 3) Guardar el movimiento con los nuevos valores
      movimiento.tipo = nextTipo;
      movimiento.item_tipo = nextItemTipo;
      movimiento.item_id = nextItemId;
      movimiento.tecnico_id = nextTecnicoId;
      movimiento.cantidad = Number(nextCantidad);
      movimiento.notas = nextNotas;
      movimiento.fecha = nextFecha;

      await movimiento.save({ session });
    });

    const updated = await Movimiento.findById(req.params.id)
      .populate('item_id', 'nombre categoria')
      .populate('tecnico_id', 'nombre email')
      .populate('realizado_por', 'nombre rol');

    res.json({ mensaje: 'Movimiento actualizado exitosamente', movimiento: updated });
  } catch (error) {
    const status = error?.status || 500;
    console.error('Error actualizando movimiento:', error);
    res.status(status).json({ error: error?.message || 'Error interno del servidor' });
  } finally {
    session.endSession();
  }
});

module.exports = router;
