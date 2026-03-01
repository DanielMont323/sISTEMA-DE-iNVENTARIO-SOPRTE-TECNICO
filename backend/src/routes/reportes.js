const express = require('express');
const Consumible = require('../models/Consumible');
const Herramienta = require('../models/Herramienta');
const Tecnico = require('../models/Tecnico');
const Movimiento = require('../models/Movimiento');
const ResguardoHerramienta = require('../models/ResguardoHerramienta');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/reportes/general - Dashboard statistics
router.get('/general', authMiddleware, async (req, res) => {
  try {
    // Estadísticas generales
    const [
      totalConsumibles,
      totalHerramientas,
      totalTecnicos,
      herramientasDisponiblesAgg,
      herramientasTotalesAgg,
      consumiblesBajoStock,
      resguardosLargos
    ] = await Promise.all([
      Consumible.countDocuments({ activo: true }),
      Herramienta.countDocuments({ activo: true }),
      Tecnico.countDocuments({ activo: true }),
      Herramienta.aggregate([
        { $match: { activo: true } },
        { $group: { _id: null, disponible: { $sum: '$cantidad_disponible' } } }
      ]),
      Herramienta.aggregate([
        { $match: { activo: true } },
        { $group: { _id: null, total: { $sum: '$cantidad_total' }, mantenimiento: { $sum: '$cantidad_mantenimiento' } } }
      ]),
      Consumible.countDocuments({ 
        activo: true,
        $expr: { $lte: ['$stock_actual', '$stock_minimo'] }
      }),
      ResguardoHerramienta.countDocuments({
        fecha_asignacion: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    const herramientasDisponibles = herramientasDisponiblesAgg?.[0]?.disponible || 0;
    const herramientasTotalCantidad = herramientasTotalesAgg?.[0]?.total || 0;
    const herramientasMantenimiento = herramientasTotalesAgg?.[0]?.mantenimiento || 0;
    const herramientasAsignadas = Math.max(0, herramientasTotalCantidad - herramientasDisponibles - herramientasMantenimiento);
    const herramientasAsignadasLarga = resguardosLargos || 0;

    // Movimientos hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const movimientosHoy = await Movimiento.countDocuments({
      fecha: { $gte: hoy, $lt: manana }
    });

    // Herramientas más asignadas (últimos 30 días)
    const fecha30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const herramientasMasAsignadas = await Movimiento.aggregate([
      {
        $match: {
          tipo: 'herramienta_asignacion',
          fecha: { $gte: fecha30Dias }
        }
      },
      {
        $group: {
          _id: '$item_id',
          asignaciones: { $sum: 1 }
        }
      },
      { $sort: { asignaciones: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'herramientas',
          localField: '_id',
          foreignField: '_id',
          as: 'herramienta'
        }
      },
      { $unwind: '$herramienta' },
      {
        $project: {
          nombre: '$herramienta.nombre',
          categoria: '$herramienta.categoria',
          asignaciones: 1
        }
      }
    ]);

    // Consumibles más utilizados (últimos 30 días)
    const consumiblesMasUsados = await Movimiento.aggregate([
      {
        $match: {
          tipo: 'consumible_asignacion',
          fecha: { $gte: fecha30Dias }
        }
      },
      {
        $group: {
          _id: '$item_id',
          total_asignado: { $sum: '$cantidad' },
          asignaciones: { $sum: 1 }
        }
      },
      { $sort: { total_asignado: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'consumibles',
          localField: '_id',
          foreignField: '_id',
          as: 'consumible'
        }
      },
      { $unwind: '$consumible' },
      {
        $project: {
          nombre: '$consumible.nombre',
          categoria: '$consumible.categoria',
          total_asignado: 1,
          asignaciones: 1
        }
      }
    ]);

    res.json({
      resumen: {
        total_consumibles: totalConsumibles,
        total_herramientas: totalHerramientas,
        total_tecnicos: totalTecnicos,
        movimientos_hoy: movimientosHoy
      },
      herramientas: {
        disponibles: herramientasDisponibles,
        asignadas: herramientasAsignadas,
        mantenimiento: herramientasMantenimiento,
        asignadas_larga_tiempo: herramientasAsignadasLarga
      },
      consumibles: {
        bajo_stock: consumiblesBajoStock
      },
      top_herramientas: herramientasMasAsignadas,
      top_consumibles: consumiblesMasUsados
    });
  } catch (error) {
    console.error('Error generando reporte general:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reportes/tecnicos - Reporte por técnicos
router.get('/tecnicos', authMiddleware, async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    const fechaLimite = new Date(Date.now() - parseInt(dias) * 24 * 60 * 60 * 1000);

    // Obtener todos los técnicos activos
    const tecnicos = await Tecnico.find({ activo: true }).sort({ nombre: 1 });

    // Para cada técnico, obtener sus estadísticas
    const tecnicosConEstadisticas = await Promise.all(
      tecnicos.map(async (tecnico) => {
        const [
          totalMovimientos,
          herramientasAsignadas,
          consumiblesAsignados,
          ultimoMovimiento
        ] = await Promise.all([
          Movimiento.countDocuments({
            tecnico_id: tecnico._id,
            fecha: { $gte: fechaLimite }
          }),
          Movimiento.countDocuments({
            tecnico_id: tecnico._id,
            tipo: 'herramienta_asignacion',
            fecha: { $gte: fechaLimite }
          }),
          Movimiento.aggregate([
            {
              $match: {
                tecnico_id: tecnico._id,
                tipo: 'consumible_asignacion',
                fecha: { $gte: fechaLimite }
              }
            },
            {
              $group: {
                _id: null,
                total_cantidad: { $sum: '$cantidad' }
              }
            }
          ]),
          Movimiento.findOne({
            tecnico_id: tecnico._id
          }).sort({ fecha: -1 })
        ]);

        // Herramientas actualmente asignadas
        const resguardos = await ResguardoHerramienta.find({ tecnico_id: tecnico._id });
        const herramientasActuales = resguardos.reduce((acc, r) => acc + (r.cantidad || 0), 0);

        return {
          _id: tecnico._id,
          nombre: tecnico.nombre,
          email: tecnico.email,
          telefono: tecnico.telefono,
          departamento: tecnico.departamento,
          estadisticas: {
            total_movimientos: totalMovimientos,
            herramientas_asignadas: herramientasAsignadas,
            consumibles_asignados: consumiblesAsignados[0]?.total_cantidad || 0,
            herramientas_actuales: herramientasActuales,
            ultimo_movimiento: ultimoMovimiento?.fecha || null
          }
        };
      })
    );

    res.json({
      periodo_dias: parseInt(dias),
      tecnicos: tecnicosConEstadisticas
    });
  } catch (error) {
    console.error('Error generando reporte de técnicos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reportes/herramientas - Reporte por herramientas
router.get('/herramientas', authMiddleware, async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    const fechaLimite = new Date(Date.now() - parseInt(dias) * 24 * 60 * 60 * 1000);

    // Estadísticas generales de herramientas
    const [
      herramientasPorCategoria,
      herramientasConMasMovimientos
    ] = await Promise.all([
      Herramienta.aggregate([
        { $match: { activo: true } },
        { $group: { _id: '$categoria', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Movimiento.aggregate([
        {
          $match: {
            item_tipo: 'Herramienta',
            fecha: { $gte: fechaLimite }
          }
        },
        {
          $group: {
            _id: '$item_id',
            total_movimientos: { $sum: 1 }
          }
        },
        { $sort: { total_movimientos: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'herramientas',
            localField: '_id',
            foreignField: '_id',
            as: 'herramienta'
          }
        },
        { $unwind: '$herramienta' },
        {
          $project: {
            nombre: '$herramienta.nombre',
            categoria: '$herramienta.categoria',
            cantidad_total: '$herramienta.cantidad_total',
            cantidad_disponible: '$herramienta.cantidad_disponible',
            cantidad_mantenimiento: '$herramienta.cantidad_mantenimiento',
            total_movimientos: 1
          }
        }
      ])
    ]);

    // Resguardos por más tiempo
    const herramientasAsignadasLarga = await ResguardoHerramienta.find({
      fecha_asignacion: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    })
      .populate('herramienta_id', 'nombre categoria ubicacion')
      .populate('tecnico_id', 'nombre email')
      .sort({ fecha_asignacion: 1 });

    res.json({
      periodo_dias: parseInt(dias),
      por_categoria: herramientasPorCategoria,
      mas_movimientos: herramientasConMasMovimientos,
      asignadas_larga_tiempo: herramientasAsignadasLarga
    });
  } catch (error) {
    console.error('Error generando reporte de herramientas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/reportes/fechas - Reporte por rango de fechas
router.get('/fechas', authMiddleware, async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ 
        error: 'Se requieren las fechas de inicio y fin' 
      });
    }

    const inicio = new Date(fecha_inicio);
    const fin = new Date(fecha_fin);
    fin.setHours(23, 59, 59, 999);

    // Movimientos por día
    const movimientosPorDia = await Movimiento.aggregate([
      {
        $match: {
          fecha: { $gte: inicio, $lte: fin }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$fecha' },
            month: { $month: '$fecha' },
            day: { $dayOfMonth: '$fecha' }
          },
          total: { $sum: 1 },
          asignaciones: {
            $sum: {
              $cond: [
                { $in: ['$tipo', ['consumible_asignacion', 'herramienta_asignacion']] },
                1,
                0
              ]
            }
          },
          devoluciones: {
            $sum: {
              $cond: [
                { $in: ['$tipo', ['consumible_devolucion', 'herramienta_devolucion']] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Resumen general del período
    const [
      totalMovimientos,
      movimientosPorTipo,
      movimientosPorRol
    ] = await Promise.all([
      Movimiento.countDocuments({
        fecha: { $gte: inicio, $lte: fin }
      }),
      Movimiento.aggregate([
        {
          $match: {
            fecha: { $gte: inicio, $lte: fin }
          }
        },
        {
          $group: {
            _id: '$tipo',
            count: { $sum: 1 }
          }
        }
      ]),
      Movimiento.aggregate([
        {
          $match: {
            fecha: { $gte: inicio, $lte: fin }
          }
        },
        {
          $group: {
            _id: '$rol_realizador',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    res.json({
      periodo: {
        inicio: fecha_inicio,
        fin: fecha_fin
      },
      resumen: {
        total_movimientos: totalMovimientos,
        por_tipo: movimientosPorTipo,
        por_rol: movimientosPorRol
      },
      por_dia: movimientosPorDia
    });
  } catch (error) {
    console.error('Error generando reporte por fechas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
