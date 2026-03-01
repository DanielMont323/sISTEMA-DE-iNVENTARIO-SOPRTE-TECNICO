const express = require('express');
const Herramienta = require('../models/Herramienta');
const Tecnico = require('../models/Tecnico');
const Movimiento = require('../models/Movimiento');
const ResguardoHerramienta = require('../models/ResguardoHerramienta');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validate, herramientaSchema, asignacionSchema } = require('../middleware/validacion');

const router = express.Router();

// GET /api/herramientas - Listar todas las herramientas
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, categoria, activo } = req.query;
    const filtro = {};

    // Filtros
    if (search) {
      filtro.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { descripcion: { $regex: search, $options: 'i' } },
        { categoria: { $regex: search, $options: 'i' } }
      ];
    }

    if (categoria) {
      filtro.categoria = categoria;
    }

    if (activo !== undefined) {
      filtro.activo = activo === 'true';
    }

    const skip = (page - 1) * limit;
    
    const [herramientas, total] = await Promise.all([
      Herramienta.find(filtro)
        .sort({ nombre: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Herramienta.countDocuments(filtro)
    ]);

    res.json({
      herramientas,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listando herramientas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/herramientas/:id/resguardos - Resguardos (técnicos con herramienta asignada)
router.get('/:id/resguardos', authMiddleware, async (req, res) => {
  try {
    const herramienta = await Herramienta.findById(req.params.id);
    if (!herramienta) {
      return res.status(404).json({ error: 'Herramienta no encontrada' });
    }

    const resguardos = await ResguardoHerramienta.find({ herramienta_id: herramienta._id })
      .populate('tecnico_id', 'nombre email telefono')
      .sort({ fecha_asignacion: 1 });

    res.json({
      herramienta: {
        _id: herramienta._id,
        nombre: herramienta.nombre,
        categoria: herramienta.categoria,
        ubicacion: herramienta.ubicacion
      },
      resguardos
    });
  } catch (error) {
    console.error('Error obteniendo resguardos de herramienta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/herramientas/:id - Obtener herramienta por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const herramienta = await Herramienta.findById(req.params.id);
    
    if (!herramienta) {
      return res.status(404).json({ error: 'Herramienta no encontrada' });
    }

    res.json(herramienta);
  } catch (error) {
    console.error('Error obteniendo herramienta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/herramientas - Crear nueva herramienta (solo admin)
router.post('/', authMiddleware, adminMiddleware, validate(herramientaSchema), async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.cantidad_disponible === undefined || payload.cantidad_disponible === null) {
      payload.cantidad_disponible = payload.cantidad_total;
    }
    if (payload.cantidad_mantenimiento === undefined || payload.cantidad_mantenimiento === null) {
      payload.cantidad_mantenimiento = 0;
    }
    if ((payload.cantidad_disponible + payload.cantidad_mantenimiento) > payload.cantidad_total) {
      return res.status(400).json({ error: 'La suma de disponible + mantenimiento no puede exceder la cantidad total' });
    }

    const herramienta = new Herramienta(payload);
    await herramienta.save();
    
    res.status(201).json({
      mensaje: 'Herramienta creada exitosamente',
      herramienta
    });
  } catch (error) {
    console.error('Error creando herramienta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/herramientas/:id - Actualizar herramienta (solo admin)
router.put('/:id', authMiddleware, adminMiddleware, validate(herramientaSchema), async (req, res) => {
  try {
    const payload = { ...req.body };

    if (payload.cantidad_disponible === undefined || payload.cantidad_disponible === null) {
      // Mantener disponible actual si no viene en request
      const actual = await Herramienta.findById(req.params.id);
      if (!actual) {
        return res.status(404).json({ error: 'Herramienta no encontrada' });
      }
      payload.cantidad_disponible = actual.cantidad_disponible;
    }
    if (payload.cantidad_mantenimiento === undefined || payload.cantidad_mantenimiento === null) {
      payload.cantidad_mantenimiento = 0;
    }
    if ((payload.cantidad_disponible + payload.cantidad_mantenimiento) > payload.cantidad_total) {
      return res.status(400).json({ error: 'La suma de disponible + mantenimiento no puede exceder la cantidad total' });
    }

    const herramienta = await Herramienta.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    );
    
    if (!herramienta) {
      return res.status(404).json({ error: 'Herramienta no encontrada' });
    }
    
    res.json({
      mensaje: 'Herramienta actualizada exitosamente',
      herramienta
    });
  } catch (error) {
    console.error('Error actualizando herramienta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/herramientas/:id - Eliminar herramienta (solo admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const resguardos = await ResguardoHerramienta.countDocuments({ herramienta_id: req.params.id });
    if (resguardos > 0) {
      return res.status(400).json({ error: 'No se puede eliminar: la herramienta tiene resguardos activos' });
    }

    const herramienta = await Herramienta.findByIdAndDelete(req.params.id);
    
    if (!herramienta) {
      return res.status(404).json({ error: 'Herramienta no encontrada' });
    }
    
    res.json({ mensaje: 'Herramienta eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando herramienta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/herramientas/:id/asignar - Asignar herramienta a técnico
router.post('/:id/asignar', authMiddleware, validate(asignacionSchema, { itemTipo: 'herramienta' }), async (req, res) => {
  try {
    const { tecnico_id, cantidad, notas } = req.body;
    
    // Verificar que la herramienta existe
    const herramienta = await Herramienta.findById(req.params.id);
    if (!herramienta) {
      return res.status(404).json({ error: 'Herramienta no encontrada' });
    }

    const cant = Number(cantidad);
    if (!Number.isFinite(cant) || cant < 1) {
      return res.status(400).json({ error: 'Cantidad inválida' });
    }

    // Verificar stock disponible
    if (herramienta.cantidad_disponible < cant) {
      return res.status(400).json({
        error: 'Stock disponible insuficiente',
        disponible: herramienta.cantidad_disponible,
        solicitado: cant
      });
    }

    // Verificar que el técnico existe
    const tecnico = await Tecnico.findById(tecnico_id);
    if (!tecnico) {
      return res.status(404).json({ error: 'Técnico no encontrado' });
    }

    // Actualizar herramienta
    herramienta.cantidad_disponible -= cant;
    await herramienta.save();

    // Actualizar/crear resguardo
    const resguardo = await ResguardoHerramienta.findOneAndUpdate(
      { herramienta_id: herramienta._id, tecnico_id },
      {
        $inc: { cantidad: cant },
        $setOnInsert: { fecha_asignacion: new Date() }
      },
      { new: true, upsert: true, runValidators: true }
    );

    // Registrar movimiento
    const movimiento = new Movimiento({
      tipo: 'herramienta_asignacion',
      item_id: herramienta._id,
      item_tipo: 'Herramienta',
      tecnico_id,
      cantidad: cant,
      realizado_por: req.usuario._id,
      rol_realizador: req.usuario.rol,
      notas
    });
    await movimiento.save();

    res.json({
      mensaje: 'Herramienta asignada exitosamente',
      herramienta,
      resguardo,
      movimiento
    });
  } catch (error) {
    console.error('Error asignando herramienta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/herramientas/:id/devolver - Registrar devolución de herramienta
router.post('/:id/devolver', authMiddleware, validate(asignacionSchema, { itemTipo: 'herramienta' }), async (req, res) => {
  try {
    const { tecnico_id, cantidad, notas } = req.body;
    
    // Verificar que la herramienta existe
    const herramienta = await Herramienta.findById(req.params.id);
    if (!herramienta) {
      return res.status(404).json({ error: 'Herramienta no encontrada' });
    }

    const cant = Number(cantidad);
    if (!Number.isFinite(cant) || cant < 1) {
      return res.status(400).json({ error: 'Cantidad inválida' });
    }

    // Verificar que el técnico existe
    const tecnico = await Tecnico.findById(tecnico_id);
    if (!tecnico) {
      return res.status(404).json({ error: 'Técnico no encontrado' });
    }

    const resguardo = await ResguardoHerramienta.findOne({ herramienta_id: herramienta._id, tecnico_id });
    if (!resguardo) {
      return res.status(400).json({ error: 'No existe resguardo activo de esta herramienta para el técnico' });
    }
    if (resguardo.cantidad < cant) {
      return res.status(400).json({ error: 'La cantidad a devolver excede la cantidad en resguardo', en_resguardo: resguardo.cantidad, devolucion: cant });
    }

    // Actualizar herramienta
    herramienta.cantidad_disponible += cant;
    await herramienta.save();

    resguardo.cantidad -= cant;
    if (resguardo.cantidad === 0) {
      await ResguardoHerramienta.deleteOne({ _id: resguardo._id });
    } else {
      await resguardo.save();
    }

    // Registrar movimiento
    const movimiento = new Movimiento({
      tipo: 'herramienta_devolucion',
      item_id: herramienta._id,
      item_tipo: 'Herramienta',
      tecnico_id,
      cantidad: cant,
      realizado_por: req.usuario._id,
      rol_realizador: req.usuario.rol,
      notas
    });
    await movimiento.save();

    res.json({
      mensaje: 'Devolución registrada exitosamente',
      herramienta,
      resguardo: resguardo.cantidad === 0 ? null : resguardo,
      movimiento
    });
  } catch (error) {
    console.error('Error registrando devolución:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/herramientas/disponibles - Obtener herramientas con disponible > 0
router.get('/disponibles/list', authMiddleware, async (req, res) => {
  try {
    const herramientas = await Herramienta.find({
      activo: true,
      cantidad_disponible: { $gt: 0 }
    }).sort({ nombre: 1 });

    res.json({ herramientas });
  } catch (error) {
    console.error('Error obteniendo herramientas disponibles:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/herramientas/asignadas-larga - Resguardos por más de 30 días
router.get('/asignadas-larga/list', authMiddleware, async (req, res) => {
  try {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 30);

    const resguardos = await ResguardoHerramienta.find({
      fecha_asignacion: { $lt: fechaLimite }
    })
      .populate('herramienta_id', 'nombre categoria ubicacion')
      .populate('tecnico_id', 'nombre email telefono')
      .sort({ fecha_asignacion: 1 });

    res.json({ resguardos });
  } catch (error) {
    console.error('Error obteniendo resguardos largos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/herramientas/categorias - Obtener categorías únicas
router.get('/categorias/list', authMiddleware, async (req, res) => {
  try {
    const categorias = await Herramienta.distinct('categoria', { activo: true });
    res.json({ categorias });
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
