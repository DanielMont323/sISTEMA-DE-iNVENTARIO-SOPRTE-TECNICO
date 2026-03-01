const Joi = require('joi');

// Validación para login
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'El email es obligatorio'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'La contraseña debe tener al menos 6 caracteres',
    'any.required': 'La contraseña es obligatoria'
  })
});

// Validación para crear/actualizar usuario
const usuarioSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 100 caracteres',
    'any.required': 'El nombre es obligatorio'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'El email es obligatorio'
  }),
  password: Joi.string().min(6).when('$isUpdate', {
    is: true,
    then: Joi.optional(),
    otherwise: Joi.required()
  }).messages({
    'string.min': 'La contraseña debe tener al menos 6 caracteres',
    'any.required': 'La contraseña es obligatoria'
  }),
  rol: Joi.string().valid('admin', 'secretaria').required().messages({
    'any.only': 'El rol debe ser admin o secretaria',
    'any.required': 'El rol es obligatorio'
  }),
  activo: Joi.boolean().default(true)
});

// Validación para técnico
const tecnicoSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 100 caracteres',
    'any.required': 'El nombre es obligatorio'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email inválido',
    'any.required': 'El email es obligatorio'
  }),
  telefono: Joi.string().min(5).max(20).required().messages({
    'string.min': 'El teléfono debe tener al menos 5 caracteres',
    'string.max': 'El teléfono no puede exceder 20 caracteres',
    'any.required': 'El teléfono es obligatorio'
  }),
  departamento: Joi.string().min(2).max(50).required().messages({
    'string.min': 'El departamento debe tener al menos 2 caracteres',
    'string.max': 'El departamento no puede exceder 50 caracteres',
    'any.required': 'El departamento es obligatorio'
  }),
  activo: Joi.boolean().default(true)
});

// Validación para consumible
const consumibleSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 100 caracteres',
    'any.required': 'El nombre es obligatorio'
  }),
  descripcion: Joi.string().max(500).optional().allow(''),
  categoria: Joi.string().min(2).max(50).required().messages({
    'string.min': 'La categoría debe tener al menos 2 caracteres',
    'string.max': 'La categoría no puede exceder 50 caracteres',
    'any.required': 'La categoría es obligatoria'
  }),
  unidad: Joi.string().valid('pieza', 'caja', 'paquete', 'metro', 'kilogramo', 'litro', 'rollo').required().messages({
    'any.only': 'La unidad debe ser una de las opciones válidas',
    'any.required': 'La unidad es obligatoria'
  }),
  stock_actual: Joi.number().min(0).required().messages({
    'number.min': 'El stock no puede ser negativo',
    'any.required': 'El stock actual es obligatorio'
  }),
  stock_minimo: Joi.number().min(0).required().messages({
    'number.min': 'El stock mínimo no puede ser negativo',
    'any.required': 'El stock mínimo es obligatorio'
  }),
  ubicacion: Joi.string().min(1).max(50).required().messages({
    'string.min': 'La ubicación es obligatoria',
    'string.max': 'La ubicación no puede exceder 50 caracteres',
    'any.required': 'La ubicación es obligatoria'
  }),
  activo: Joi.boolean().default(true)
});

// Validación para herramienta
const herramientaSchema = Joi.object({
  nombre: Joi.string().min(2).max(100).required().messages({
    'string.min': 'El nombre debe tener al menos 2 caracteres',
    'string.max': 'El nombre no puede exceder 100 caracteres',
    'any.required': 'El nombre es obligatorio'
  }),
  descripcion: Joi.string().max(500).optional().allow(''),
  categoria: Joi.string().min(2).max(50).required().messages({
    'string.min': 'La categoría debe tener al menos 2 caracteres',
    'string.max': 'La categoría no puede exceder 50 caracteres',
    'any.required': 'La categoría es obligatoria'
  }),
  ubicacion: Joi.string().min(1).max(50).required().messages({
    'string.min': 'La ubicación es obligatoria',
    'string.max': 'La ubicación no puede exceder 50 caracteres',
    'any.required': 'La ubicación es obligatoria'
  }),
  cantidad_total: Joi.number().min(0).required().messages({
    'number.min': 'La cantidad total no puede ser negativa',
    'any.required': 'La cantidad total es obligatoria'
  }),
  cantidad_disponible: Joi.number().min(0).optional().messages({
    'number.min': 'La cantidad disponible no puede ser negativa'
  }),
  cantidad_mantenimiento: Joi.number().min(0).optional().messages({
    'number.min': 'La cantidad en mantenimiento no puede ser negativa'
  }),
  activo: Joi.boolean().default(true)
});

// Validación para asignación/devolución
const asignacionSchema = Joi.object({
  tecnico_id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.pattern.base': 'ID de técnico inválido',
    'any.required': 'El técnico es obligatorio'
  }),
  cantidad: Joi.number().min(1).when('$itemTipo', {
    is: Joi.valid('consumible', 'herramienta'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'number.min': 'La cantidad debe ser al menos 1',
    'any.required': 'La cantidad es obligatoria'
  }),
  notas: Joi.string().max(500).optional().allow('')
});

// Middleware de validación
const validate = (schema, context = {}) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { 
      abortEarly: false,
      context: { ...context, isUpdate: req.method !== 'POST' }
    });
    
    if (error) {
      const errores = error.details.map(detail => detail.message);
      return res.status(400).json({ 
        error: 'Datos inválidos',
        detalles: errores
      });
    }
    
    next();
  };
};

module.exports = {
  validate,
  loginSchema,
  usuarioSchema,
  tecnicoSchema,
  consumibleSchema,
  herramientaSchema,
  asignacionSchema
};
