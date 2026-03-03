const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Simple user schema
const userSchema = new mongoose.Schema({
  nombre: String,
  email: String,
  password: String,
  rol: String,
  activo: Boolean
}, { collection: 'usuarios' });

userSchema.methods.compararPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

const Usuario = mongoose.model('Usuario', userSchema);

async function createAdmin() {
  try {
    // Try to connect with different connection strings
    const connectionStrings = [
      'mongodb+srv://Spacecards:<db_password>@cluster0.xi0cc.mongodb.net/inventario?retryWrites=true&w=majority',
      'mongodb://127.0.0.1:27017/inventario',
      'mongodb://localhost:27017/inventario'
    ];

    let connected = false;
    for (const connStr of connectionStrings) {
      try {
        console.log(`Intentando conectar a: ${connStr}`);
        await mongoose.connect(connStr, { serverSelectionTimeoutMS: 5000 });
        connected = true;
        console.log('Conectado exitosamente');
        break;
      } catch (error) {
        console.log(`Fallo conexión: ${error.message}`);
        continue;
      }
    }

    if (!connected) {
      throw new Error('No se pudo conectar a ninguna base de datos');
    }

    // Check if admin exists
    const existingAdmin = await Usuario.findOne({ email: 'admin@empresa.com' });
    if (existingAdmin) {
      console.log('El usuario admin ya existe');
      await mongoose.disconnect();
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = new Usuario({
      nombre: 'Administrador',
      email: 'admin@empresa.com',
      password: hashedPassword,
      rol: 'admin',
      activo: true
    });

    await admin.save();
    console.log('Usuario admin creado exitosamente');

    // Create secretary user
    const hashedPasswordSec = await bcrypt.hash('secret123', 10);
    const secretary = new Usuario({
      nombre: 'Secretaria',
      email: 'secretaria@empresa.com',
      password: hashedPasswordSec,
      rol: 'secretaria',
      activo: true
    });

    await secretary.save();
    console.log('Usuario secretaria creado exitosamente');

    await mongoose.disconnect();
    console.log('Desconectado de la base de datos');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createAdmin();
