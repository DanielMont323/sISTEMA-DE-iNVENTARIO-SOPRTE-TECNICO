const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

// Middleware para verificar token JWT
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Obtener usuario completo desde la base de datos
    const usuario = await Usuario.findById(decoded.id).select('-password');
    
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Token inválido o usuario inactivo.' });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    console.error('Error en authMiddleware:', error);
    res.status(401).json({ error: 'Token inválido.' });
  }
};

// Middleware para verificar roles específicos
const roleMiddleware = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuario no autenticado.' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ 
        error: 'Acceso denegado. No tienes los permisos necesarios.' 
      });
    }

    next();
  };
};

// Middleware específico para admin
const adminMiddleware = roleMiddleware(['admin']);

// Middleware para admin o secretaria
const authUserMiddleware = roleMiddleware(['admin', 'secretaria']);

module.exports = {
  authMiddleware,
  roleMiddleware,
  adminMiddleware,
  authUserMiddleware
};
