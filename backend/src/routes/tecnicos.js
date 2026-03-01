const express = require('express');
const Tecnico = require('../models/Tecnico');
const ResguardoHerramienta = require('../models/ResguardoHerramienta');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validate, tecnicoSchema } = require('../middleware/validacion');

const router = express.Router();

// GET /api/tecnicos - Listar todos los técnicos (todos los roles autenticados)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, activo } = req.query;
    const filtro = {};

    // Filtro por búsqueda
    if (search) {
      filtro.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { departamento: { $regex: search, $options: 'i' } }
      ];
    }

    // Filtro por estado activo
    if (activo !== undefined) {
      filtro.activo = activo === 'true';
    }

    const skip = (page - 1) * limit;
    
    const [tecnicos, total] = await Promise.all([
      Tecnico.find(filtro)
        .sort({ nombre: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Tecnico.countDocuments(filtro)
    ]);

    res.json({
      tecnicos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listando técnicos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/tecnicos/:id - Obtener técnico por ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const tecnico = await Tecnico.findById(req.params.id);
    
    if (!tecnico) {
      return res.status(404).json({ error: 'Técnico no encontrado' });
    }

    res.json(tecnico);
  } catch (error) {
    console.error('Error obteniendo técnico:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/tecnicos/:id/herramientas - Resguardos (herramientas asignadas) del técnico
router.get('/:id/herramientas', authMiddleware, async (req, res) => {
  try {
    const tecnico = await Tecnico.findById(req.params.id);
    if (!tecnico) {
      return res.status(404).json({ error: 'Técnico no encontrado' });
    }

    const resguardos = await ResguardoHerramienta.find({ tecnico_id: tecnico._id })
      .populate('herramienta_id', 'nombre categoria ubicacion')
      .sort({ fecha_asignacion: 1 });

    const total_cantidad = resguardos.reduce((acc, r) => acc + (Number(r.cantidad) || 0), 0);

    res.json({
      tecnico: {
        _id: tecnico._id,
        nombre: tecnico.nombre,
        email: tecnico.email,
        telefono: tecnico.telefono,
        departamento: tecnico.departamento
      },
      total_cantidad,
      resguardos
    });
  } catch (error) {
    console.error('Error obteniendo resguardos de técnico:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/tecnicos - Crear nuevo técnico (solo admin)
router.post('/', authMiddleware, adminMiddleware, validate(tecnicoSchema), async (req, res) => {
  try {
    const tecnico = new Tecnico(req.body);
    await tecnico.save();
    
    res.status(201).json({
      mensaje: 'Técnico creado exitosamente',
      tecnico
    });
  } catch (error) {
    console.error('Error creando técnico:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/tecnicos/:id - Actualizar técnico (solo admin)
router.put('/:id', authMiddleware, adminMiddleware, validate(tecnicoSchema), async (req, res) => {
  try {
    const tecnico = await Tecnico.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!tecnico) {
      return res.status(404).json({ error: 'Técnico no encontrado' });
    }
    
    res.json({
      mensaje: 'Técnico actualizado exitosamente',
      tecnico
    });
  } catch (error) {
    console.error('Error actualizando técnico:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/tecnicos/:id - Eliminar técnico (solo admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const tecnico = await Tecnico.findByIdAndDelete(req.params.id);
    
    if (!tecnico) {
      return res.status(404).json({ error: 'Técnico no encontrado' });
    }
    
    res.json({ mensaje: 'Técnico eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando técnico:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PATCH /api/tecnicos/:id/toggle-estado - Activar/desactivar técnico (solo admin)
router.patch('/:id/toggle-estado', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const tecnico = await Tecnico.findById(req.params.id);
    
    if (!tecnico) {
      return res.status(404).json({ error: 'Técnico no encontrado' });
    }
    
    tecnico.activo = !tecnico.activo;
    await tecnico.save();
    
    res.json({
      mensaje: `Técnico ${tecnico.activo ? 'activado' : 'desactivado'} exitosamente`,
      tecnico
    });
  } catch (error) {
    console.error('Error cambiando estado del técnico:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
