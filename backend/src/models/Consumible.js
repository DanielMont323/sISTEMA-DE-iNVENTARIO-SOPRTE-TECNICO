const mongoose = require('mongoose');

const consumibleSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción no puede exceder 500 caracteres']
  },
  categoria: {
    type: String,
    required: [true, 'La categoría es obligatoria'],
    trim: true,
    maxlength: [50, 'La categoría no puede exceder 50 caracteres']
  },
  unidad: {
    type: String,
    required: [true, 'La unidad es obligatoria'],
    trim: true,
    enum: ['pieza', 'caja', 'paquete', 'metro', 'kilogramo', 'litro', 'rollo'],
    default: 'pieza'
  },
  stock_actual: {
    type: Number,
    required: [true, 'El stock actual es obligatorio'],
    min: [0, 'El stock no puede ser negativo'],
    default: 0
  },
  stock_minimo: {
    type: Number,
    required: [true, 'El stock mínimo es obligatorio'],
    min: [0, 'El stock mínimo no puede ser negativo'],
    default: 10
  },
  ubicacion: {
    type: String,
    required: [true, 'La ubicación es obligatoria'],
    trim: true,
    maxlength: [50, 'La ubicación no puede exceder 50 caracteres']
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual para verificar si está bajo stock mínimo
consumibleSchema.virtual('stock_bajo').get(function() {
  return this.stock_actual <= this.stock_minimo;
});

// Index para búsquedas
consumibleSchema.index({ nombre: 1, categoria: 1 });
consumibleSchema.index({ activo: 1 });

// Middleware para incluir virtuals en JSON
consumibleSchema.set('toJSON', { virtuals: true });
consumibleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Consumible', consumibleSchema);
