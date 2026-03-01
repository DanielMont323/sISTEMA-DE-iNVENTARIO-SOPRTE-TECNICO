const mongoose = require('mongoose');

const movimientoSchema = new mongoose.Schema({
  tipo: {
    type: String,
    required: [true, 'El tipo de movimiento es obligatorio'],
    enum: [
      'consumible_asignacion',
      'consumible_devolucion',
      'herramienta_asignacion',
      'herramienta_devolucion'
    ]
  },
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'El ID del item es obligatorio'],
    refPath: 'item_tipo'
  },
  item_tipo: {
    type: String,
    required: [true, 'El tipo de item es obligatorio'],
    enum: ['Consumible', 'Herramienta']
  },
  tecnico_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'El técnico es obligatorio'],
    ref: 'Tecnico'
  },
  cantidad: {
    type: Number,
    min: [1, 'La cantidad debe ser al menos 1'],
    default: null // null para herramientas
  },
  realizado_por: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'El usuario que realizó el movimiento es obligatorio'],
    ref: 'Usuario'
  },
  rol_realizador: {
    type: String,
    required: [true, 'El rol del realizador es obligatorio'],
    enum: ['admin', 'secretaria']
  },
  fecha: {
    type: Date,
    required: [true, 'La fecha del movimiento es obligatoria'],
    default: Date.now
  },
  notas: {
    type: String,
    trim: true,
    maxlength: [500, 'Las notas no pueden exceder 500 caracteres']
  }
}, {
  timestamps: true
});

// Virtual para descripción legible del tipo
movimientoSchema.virtual('tipo_descripcion').get(function() {
  const descripciones = {
    'consumible_asignacion': 'Asignación de Consumible',
    'consumible_devolucion': 'Devolución de Consumible',
    'herramienta_asignacion': 'Asignación de Herramienta',
    'herramienta_devolucion': 'Devolución de Herramienta'
  };
  return descripciones[this.tipo] || this.tipo;
});

// Index para búsquedas y reportes
movimientoSchema.index({ tecnico_id: 1, fecha: -1 });
movimientoSchema.index({ item_id: 1, fecha: -1 });
movimientoSchema.index({ tipo: 1, fecha: -1 });
movimientoSchema.index({ realizado_por: 1, fecha: -1 });
movimientoSchema.index({ fecha: -1 });

// Middleware para incluir virtuals en JSON
movimientoSchema.set('toJSON', { virtuals: true });
movimientoSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Movimiento', movimientoSchema);
