# Sistema de Inventario - Soporte Técnico

Sistema web completo para la gestión de inventario de materiales y herramientas en departamentos de soporte técnico, con control de resguardos, auditoría de movimientos y roles de usuario.

## 🎯 Características Principales

### 📋 Gestión Completa
- **Consumibles**: Control por cantidades con alertas de stock bajo
- **Herramientas**: Seguimiento individual de asignaciones y resguardos
- **Técnicos**: Registro completo del personal de soporte técnico
- **Movimientos**: Historial detallado de todas las transacciones

### 🔐 Roles de Usuario
- **Admin**: Control total del sistema, CRUD completo, autorizaciones
- **Secretaria**: Registro de movimientos, consulta de inventario, sin eliminaciones

### 📊 Dashboard y Reportes
- Estadísticas en tiempo real
- Alertas visuales automáticas
- Reportes por técnico, herramienta, rango de fechas
- KPIs y métricas clave

### 🎨 UI/UX Moderna
- Diseño visual e intuitivo
- Acciones rápidas (2-3 clics)
- Responsive para móviles
- Colores de estado y notificaciones

## 🏗️ Arquitectura Técnica

### Backend (Node.js + Express)
```
backend/
├── src/
│   ├── controllers/     # Lógica de negocio
│   ├── models/         # Modelos MongoDB
│   ├── routes/         # Definición de rutas
│   ├── middleware/     # Autenticación y validación
│   └── config/         # Configuración
├── package.json
└── server.js
```

### Frontend (React + Tailwind CSS)
```
frontend/
├── src/
│   ├── components/     # Componentes reutilizables
│   ├── pages/         # Páginas principales
│   ├── context/       # Context de autenticación
│   ├── services/      # API calls
│   └── utils/         # Utilidades
├── public/
└── package.json
```

### Base de Datos (MongoDB)
- **usuarios**: Autenticación y roles
- **tecnicos**: Información del personal
- **consumibles**: Materiales con control de stock
- **herramientas**: Equipos con seguimiento individual
- **movimientos**: Auditoría completa de todas las operaciones

## 🚀 Instalación y Configuración

### Requisitos Previos
- Node.js 18+
- MongoDB (local o MongoDB Atlas)
- npm o yarn

### 1. Clonar el Repositorio
```bash
git clone <repository-url>
cd sistema-inventario-soporte-tecnico
```

### 2. Configurar Backend
```bash
cd backend
npm install
cp .env.example .env
```

Editar `.env` con tus credenciales:
```env
MONGODB_URI=mongodb://localhost:27017/inventario
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Configurar Frontend
```bash
cd frontend
npm install
```

### 4. Ejecutar en Desarrollo
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 5. Acceder a la Aplicación
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health Check: http://localhost:5000/api/health

## 👥 Usuarios por Defecto

Para comenzar, puedes crear usuarios manualmente en la base de datos:

### Admin
```javascript
{
  "nombre": "Administrador",
  "email": "admin@empresa.com",
  "password": "admin123",
  "rol": "admin"
}
```

### Secretaria
```javascript
{
  "nombre": "Secretaria",
  "email": "secretaria@empresa.com",
  "password": "secret123",
  "rol": "secretaria"
}
```

## 📱 Flujo de Usuario Principal

### Dashboard
- Vista general del inventario
- Alertas automáticas de stock bajo
- Herramientas asignadas por mucho tiempo
- Acciones rápidas principales

### Asignación de Herramientas (2-3 clics)
1. Dashboard → "Asignar Herramienta"
2. Seleccionar técnico (dropdown)
3. Seleccionar herramienta (disponibles)
4. Confirmar

### Asignación de Consumibles
1. Dashboard → "Asignar Consumible"
2. Seleccionar técnico
3. Seleccionar consumible
4. Ingresar cantidad
5. Confirmar

## 🔧 API Endpoints

### Autenticación
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verificar token

### Técnicos
- `GET /api/tecnicos` - Listar técnicos
- `POST /api/tecnicos` - Crear técnico (admin)
- `PUT /api/tecnicos/:id` - Actualizar técnico (admin)
- `DELETE /api/tecnicos/:id` - Eliminar técnico (admin)

### Consumibles
- `GET /api/consumibles` - Listar consumibles
- `POST /api/consumibles` - Crear consumible (admin)
- `PUT /api/consumibles/:id` - Actualizar consumible (admin)
- `DELETE /api/consumibles/:id` - Eliminar consumible (admin)
- `POST /api/consumibles/:id/asignar` - Asignar a técnico
- `POST /api/consumibles/:id/devolver` - Registrar devolución

### Herramientas
- `GET /api/herramientas` - Listar herramientas
- `POST /api/herramientas` - Crear herramienta (admin)
- `PUT /api/herramientas/:id` - Actualizar herramienta (admin)
- `DELETE /api/herramientas/:id` - Eliminar herramienta (admin)
- `POST /api/herramientas/:id/asignar` - Asignar a técnico
- `POST /api/herramientas/:id/devolver` - Registrar devolución

### Movimientos y Reportes
- `GET /api/movimientos` - Listar movimientos con filtros
- `GET /api/reportes/general` - Dashboard statistics
- `GET /api/reportes/tecnicos` - Reporte por técnicos
- `GET /api/reportes/herramientas` - Reporte por herramientas
- `GET /api/reportes/fechas` - Reporte por rango de fechas

## 🌐 Deployment en Render

### 1. Preparar Variables de Entorno
En Render, configura estas variables de entorno:

**Backend Service:**
- `MONGODB_URI`: Tu conexión a MongoDB Atlas
- `JWT_SECRET`: Clave secreta para JWT
- `NODE_ENV`: production
- `FRONTEND_URL`: URL del frontend en producción

**Frontend Service:**
- `VITE_API_URL`: URL del backend en producción

### 2. Deploy Automático
El archivo `render.yaml` está configurado para deployment automático:
- Backend: Servicio Node.js
- Frontend: Sitio estático
- Build automático desde GitHub

### 3. Dominio Personalizado (Opcional)
Configura tu dominio personalizado en el dashboard de Render para ambos servicios.

## 🔄 Integración de Lista de Materiales

El sistema está preparado para importar automáticamente listas de materiales existentes:

### Formato CSV Esperado
```csv
nombre,descripcion,categoria,unidad,stock_actual,stock_minimo,ubicacion
"Tornillo 1/4","Tornillo de acero inoxidable","Fijadores","pieza",100,20,"Almacén A-12"
"Taladro DeWalt","Taladro inalámbrico 20V","Electricidad","pieza",5,1,"Almacén B-05"
```

### Proceso de Importación
1. Prepara tu archivo CSV con el formato correcto
2. Utiliza el endpoint de importación (por implementar)
3. El sistema validará y creará los registros automáticamente

## 🛡️ Seguridad

### Autenticación
- JWT tokens con expiración configurable
- Password hashing con bcryptjs
- Validación de inputs en frontend y backend

### Autorización
- Middleware de roles en todas las rutas protegidas
- Validación de permisos por acción
- Auditoría completa de movimientos

### Validación de Datos
- Schema validation con Joi/Zod
- Sanitización de inputs
- Protección contra inyección SQL/NoSQL

## 📈 Monitoreo y Métricas

### Logs
- Sistema de logging estructurado
- Niveles de log (error, warn, info, debug)
- Logs de auditoría para movimientos

### Métricas
- Tiempo de respuesta de API
- Tasa de errores
- Uso de recursos
- Estadísticas de uso del sistema

## 🤝 Contribución

1. Fork del proyecto
2. Crear feature branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo LICENSE para detalles.

## 🆘 Soporte

Para soporte técnico o preguntas:
- Crear un issue en el repositorio
- Contactar al equipo de desarrollo
- Revisar la documentación técnica

---

**Desarrollado para equipos de soporte técnico que necesitan control total de su inventario.**
