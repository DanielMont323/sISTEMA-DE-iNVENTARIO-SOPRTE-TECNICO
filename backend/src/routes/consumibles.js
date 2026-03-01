const express = require('express');
const Consumible = require('../models/Consumible');
const Tecnico = require('../models/Tecnico');
const Movimiento = require('../models/Movimiento');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validate, consumibleSchema, asignacionSchema } = require('../middleware/validacion');

const router = express.Router();

// GET /api/consumibles - Listar todos los consumibles
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, categoria, activo, stock_bajo } = req.query;
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

    if (stock_bajo === 'true') {
      filtro.$expr = { $lte: ['$stock_actual', '$stock_minimo'] };
    }

    const skip = (page - 1) * limit;
    
    const [consumibles, total] = await Promise.all([
      Consumible.find(filtro)
        .sort({ nombre: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Consumible.countDocuments(filtro)
    ]);

    res.json({
      consumibles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listando consumibles:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/consumibles/:id - Obtener consumible por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const consumible = await Consumible.findById(req.params.id);
    
    if (!consumible) {
      return res.status(404).json({ error: 'Consumible no encontrado' });
    }

    res.json(consumible);
  } catch (error) {
    console.error('Error obteniendo consumible:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/consumibles - Crear nuevo consumible (solo admin)
router.post('/', authMiddleware, adminMiddleware, validate(consumibleSchema), async (req, res) => {
  try {
    const consumible = new Consumible(req.body);
    await consumible.save();
    
    res.status(201).json({
      mensaje: 'Consumible creado exitosamente',
      consumible
    });
  } catch (error) {
    console.error('Error creando consumible:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/consumibles/:id - Actualizar consumible (solo admin)
router.put('/:id', authMiddleware, adminMiddleware, validate(consumibleSchema), async (req, res) => {
  try {
    const consumible = await Consumible.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!consumible) {
      return res.status(404).json({ error: 'Consumible no encontrado' });
    }
    
    res.json({
      mensaje: 'Consumible actualizado exitosamente',
      consumible
    });
  } catch (error) {
    console.error('Error actualizando consumible:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/consumibles/:id - Eliminar consumible (solo admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const consumible = await Consumible.findByIdAndDelete(req.params.id);
    
    if (!consumible) {
      return res.status(404).json({ error: 'Consumible no encontrado' });
    }
    
    res.json({ mensaje: 'Consumible eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando consumible:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/consumibles/:id/asignar - Asignar consumible a técnico
router.post('/:id/asignar', authMiddleware, validate(asignacionSchema, { itemTipo: 'consumible' }), async (req, res) => {
  try {
    const { tecnico_id, cantidad, notas } = req.body;
    
    // Verificar que el consumible existe
    const consumible = await Consumible.findById(req.params.id);
    if (!consumible) {
      return res.status(404).json({ error: 'Consumible no encontrado' });
    }

    // Verificar que el técnico existe
    const tecnico = await Tecnico.findById(tecnico_id);
    if (!tecnico) {
      return res.status(404).json({ error: 'Técnico no encontrado' });
    }

    // Verificar stock suficiente
    if (consumible.stock_actual < cantidad) {
      return res.status(400).json({ 
        error: 'Stock insuficiente',
        stock_actual: consumible.stock_actual,
        solicitado: cantidad
      });
    }

    // Actualizar stock
    consumible.stock_actual -= cantidad;
    await consumible.save();

    // Registrar movimiento
    const movimiento = new Movimiento({
      tipo: 'consumible_asignacion',
      item_id: consumible._id,
      item_tipo: 'Consumible',
      tecnico_id,
      cantidad,
      realizado_por: req.usuario._id,
      rol_realizador: req.usuario.rol,
      notas
    });
    await movimiento.save();

    res.json({
      mensaje: 'Consumible asignado exitosamente',
      consumible,
      movimiento
    });
  } catch (error) {
    console.error('Error asignando consumible:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/consumibles/:id/devolver - Registrar devolución de consumible
router.post('/:id/devolver', authMiddleware, validate(asignacionSchema, { itemTipo: 'consumible' }), async (req, res) => {
  try {
    const { tecnico_id, cantidad, notas } = req.body;
    
    // Verificar que el consumible existe
    const consumible = await Consumible.findById(req.params.id);
    if (!consumible) {
      return res.status(404).json({ error: 'Consumible no encontrado' });
    }

    // Verificar que el técnico existe
    const tecnico = await Tecnico.findById(tecnico_id);
    if (!tecnico) {
      return res.status(404).json({ error: 'Técnico no encontrado' });
    }

    // Actualizar stock
    consumible.stock_actual += cantidad;
    await consumible.save();

    // Registrar movimiento
    const movimiento = new Movimiento({
      tipo: 'consumible_devolucion',
      item_id: consumible._id,
      item_tipo: 'Consumible',
      tecnico_id,
      cantidad,
      realizado_por: req.usuario._id,
      rol_realizador: req.usuario.rol,
      notas
    });
    await movimiento.save();

    res.json({
      mensaje: 'Devolución registrada exitosamente',
      consumible,
      movimiento
    });
  } catch (error) {
    console.error('Error registrando devolución:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/consumibles/categorias - Obtener categorías únicas
router.get('/categorias/list', authMiddleware, async (req, res) => {
  try {
    const categorias = await Consumible.distinct('categoria', { activo: true });
    res.json({ categorias });
  } catch (error) {
    console.error('Error obteniendo categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
