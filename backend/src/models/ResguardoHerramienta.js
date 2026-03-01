const mongoose = require('mongoose');

const resguardoHerramientaSchema = new mongoose.Schema({
  herramienta_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Herramienta',
    required: [true, 'La herramienta es obligatoria'],
    index: true
  },
  tecnico_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tecnico',
    required: [true, 'El técnico es obligatorio'],
    index: true
  },
  cantidad: {
    type: Number,
    required: [true, 'La cantidad es obligatoria'],
    min: [1, 'La cantidad debe ser al menos 1']
  },
  fecha_asignacion: {
    type: Date,
    required: [true, 'La fecha de asignación es obligatoria'],
    default: Date.now
  }
}, {
  timestamps: true
});

resguardoHerramientaSchema.index({ herramienta_id: 1, tecnico_id: 1 }, { unique: true });

module.exports = mongoose.model('ResguardoHerramienta', resguardoHerramientaSchema);
