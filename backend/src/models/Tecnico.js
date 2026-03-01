const mongoose = require('mongoose');

const tecnicoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es obligatorio'],
    trim: true,
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es obligatorio'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  telefono: {
    type: String,
    required: [true, 'El teléfono es obligatorio'],
    trim: true,
    maxlength: [20, 'El teléfono no puede exceder 20 caracteres']
  },
  departamento: {
    type: String,
    required: [true, 'El departamento es obligatorio'],
    trim: true,
    maxlength: [50, 'El departamento no puede exceder 50 caracteres'],
    default: 'Soporte Técnico'
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better search performance
tecnicoSchema.index({ nombre: 1, email: 1 });

module.exports = mongoose.model('Tecnico', tecnicoSchema);
