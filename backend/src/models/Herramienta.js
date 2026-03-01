const mongoose = require('mongoose');

const herramientaSchema = new mongoose.Schema({
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
  ubicacion: {
    type: String,
    required: [true, 'La ubicación es obligatoria'],
    trim: true,
    maxlength: [50, 'La ubicación no puede exceder 50 caracteres']
  },
  cantidad_total: {
    type: Number,
    required: [true, 'La cantidad total es obligatoria'],
    min: [0, 'La cantidad total no puede ser negativa'],
    default: 0
  },
  cantidad_disponible: {
    type: Number,
    required: [true, 'La cantidad disponible es obligatoria'],
    min: [0, 'La cantidad disponible no puede ser negativa'],
    default: 0
  },
  cantidad_mantenimiento: {
    type: Number,
    required: [true, 'La cantidad en mantenimiento es obligatoria'],
    min: [0, 'La cantidad en mantenimiento no puede ser negativa'],
    default: 0
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

herramientaSchema.virtual('cantidad_asignada').get(function() {
  const asignada = this.cantidad_total - this.cantidad_disponible - this.cantidad_mantenimiento;
  return Math.max(0, asignada);
});

// Index para búsquedas y rendimiento
herramientaSchema.index({ nombre: 1, categoria: 1 });
herramientaSchema.index({ activo: 1 });

// Middleware para incluir virtuals en JSON
herramientaSchema.set('toJSON', { virtuals: true });
herramientaSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Herramienta', herramientaSchema);
