const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User schema (simplified version)
const userSchema = new mongoose.Schema({
  nombre: String,
  email: String,
  password: String,
  rol: String,
  activo: Boolean
}, { collection: 'usuarios' });

// Add password comparison method
userSchema.methods.compararPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

const Usuario = mongoose.model('Usuario', userSchema);

async function seedUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');

    // Clear existing users
    await Usuario.deleteMany({});
    console.log('Usuarios existentes eliminados');

    // Create default users
    const users = [
      {
        nombre: 'Administrador',
        email: 'admin@empresa.com',
        password: 'admin123',
        rol: 'admin',
        activo: true
      },
      {
        nombre: 'Secretaria',
        email: 'secretaria@empresa.com',
        password: 'secret123',
        rol: 'secretaria',
        activo: true
      }
    ];

    // Hash passwords and create users
    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = new Usuario({
        ...userData,
        password: hashedPassword
      });
      await user.save();
      console.log(`Usuario creado: ${userData.email}`);
    }

    console.log('Usuarios creados exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error creando usuarios:', error);
    process.exit(1);
  }
}

seedUsers();
