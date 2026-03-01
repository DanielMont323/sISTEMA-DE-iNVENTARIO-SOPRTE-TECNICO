# Arquitectura del Sistema de Inventario para Soporte Técnico

## 🏗️ Arquitectura General

### Estructura del Proyecto
```
sistema-inventario/
├── backend/                    # API REST con Node.js + Express
│   ├── src/
│   │   ├── controllers/        # Lógica de negocio
│   │   ├── models/            # Modelos MongoDB
│   │   ├── routes/            # Definición de rutas
│   │   ├── middleware/        # Autenticación y validación
│   │   ├── config/            # Configuración de BD y variables
│   │   └── utils/             # Utilidades
│   ├── package.json
│   └── server.js
├── frontend/                   # SPA con React + Tailwind CSS
│   ├── src/
│   │   ├── components/        # Componentes reutilizables
│   │   ├── pages/             # Páginas principales
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # API calls
│   │   ├── context/           # Context de autenticación
│   │   └── utils/             # Utilidades
│   ├── public/
│   └── package.json
├── render.yaml                 # Configuración para deployment
└── README.md
```

### Stack Tecnológico
- **Backend**: Node.js + Express.js
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Base de Datos**: MongoDB (MongoDB Atlas)
- **Autenticación**: JWT con roles
- **Deployment**: Render
- **UI Components**: Headless UI + Heroicons

## 🗄️ Modelo de Datos (MongoDB)

### Colección: usuarios
```javascript
{
  _id: ObjectId,
  nombre: String,           // "Juan Pérez"
  email: String,           // "juan@empresa.com"
  password: String,        // Hash bcrypt
  rol: String,             // "admin" | "secretaria"
  activo: Boolean,         // true
  createdAt: Date,
  updatedAt: Date
}
```

### Colección: tecnicos
```javascript
{
  _id: ObjectId,
  nombre: String,          // "Kevin Rodríguez"
  email: String,          // "kevin@empresa.com"
  telefono: String,       // "123-456-7890"
  departamento: String,    // "Soporte Técnico"
  activo: Boolean,        // true
  createdAt: Date,
  updatedAt: Date
}
```

### Colección: consumibles
```javascript
{
  _id: ObjectId,
  nombre: String,          // "Tornillos 1/4"
  descripcion: String,     // "Tornillos de acero inoxidable"
  categoria: String,       // "Fijadores"
  unidad: String,          // "pieza", "caja", "paquete"
  stock_actual: Number,    // 150
  stock_minimo: Number,    // 20
  ubicacion: String,       // "Almacén A-12"
  activo: Boolean,         // true
  createdAt: Date,
  updatedAt: Date
}
```

### Colección: herramientas
```javascript
{
  _id: ObjectId,
  nombre: String,          // "Taladro DeWalt"
  descripcion: String,     // "Taladro inalámbrico 20V"
  codigo: String,          // "HERR-001" (código único)
  categoria: String,       // "Electricidad"
  estado: String,          // "disponible" | "asignada" | "mantenimiento"
  ubicacion: String,       // "Almacén B-05"
  asignada_a: ObjectId,    // Referencia a tecnicos (null si disponible)
  fecha_asignacion: Date,  // null si disponible
  activo: Boolean,         // true
  createdAt: Date,
  updatedAt: Date
}
```

### Colección: movimientos
```javascript
{
  _id: ObjectId,
  tipo: String,            // "consumible_asignacion" | "consumible_devolucion" | "herramienta_asignacion" | "herramienta_devolucion"
  item_id: ObjectId,       // Referencia a consumibles o herramientas
  item_tipo: String,       // "consumible" | "herramienta"
  tecnico_id: ObjectId,    // Referencia a tecnicos
  cantidad: Number,        // Para consumibles (null para herramientas)
  realizado_por: ObjectId, // Referencia a usuarios
  rol_realizador: String,  // "admin" | "secretaria"
  fecha: Date,
  notas: String,           // Notas adicionales
  createdAt: Date
}
```

## 🔐 Sistema de Autenticación

### Flujo de Login
1. Usuario ingresa email y contraseña
2. Backend valida credenciales
3. Se genera JWT con:
   - userId
   - rol
   - nombre
4. Token se almacena en localStorage
5. Cada petición incluye token en headers

### Middleware de Autenticación
```javascript
// Verifica token válido
const authMiddleware = (req, res, next) => {
  // Validar JWT
  // Adjuntar usuario a request
}

// Verifica rol específico
const roleMiddleware = (rolesPermitidos) => {
  return (req, res, next) => {
    // Validar rol del usuario
  }
}
```

## 🎨 UI/UX Design System

### Paleta de Colores
- **Primario**: Blue-600 (#2563eb)
- **Secundario**: Gray-600 (#4b5563)
- **Éxito**: Green-500 (#10b981)
- **Advertencia**: Yellow-500 (#eab308)
- **Error**: Red-500 (#ef4444)
- **Neutral**: Gray-50 a Gray-900

### Componentes Principales
- **Tarjetas**: Para mostrar información visual
- **Badges**: Estados y cantidades
- **Botones**: Acciones rápidas (Asignar, Devolver, Editar)
- **Modales**: Formularios rápidos
- **Tablas**: Listas con filtros y búsqueda

### Layout Principal
```
┌─────────────────────────────────────────┐
│ Header (Logo, Usuario, Logout)         │
├─────────────────────────────────────────┤
│ Sidebar │ Main Content                 │
│ - Dashboard                            │
│ - Técnicos                              │
│ - Consumibles                          │
│ - Herramientas                          │
│ - Movimientos                          │
│ - Reportes                             │
└─────────────────────────────────────────┘
```

## 📊 Endpoints del API

### Autenticación
- `POST /api/auth/login` - Login de usuarios
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

### Movimientos
- `GET /api/movimientos` - Listar movimientos con filtros
- `GET /api/movimientos/tecnicos/:id` - Movimientos por técnico
- `GET /api/movimientos/herramientas/:id` - Movimientos por herramienta

### Reportes
- `GET /api/reportes/general` - Dashboard statistics
- `GET /api/reportes/tecnicos` - Reporte por técnicos
- `GET /api/reportes/herramientas` - Reporte por herramientas
- `GET /api/reportes/fechas` - Reporte por rango de fechas

## 🚀 Flujo de Usuario Principal

### Dashboard (Todos los roles)
- **Cards**: Total items, herramientas asignadas, alertas
- **Gráficos**: Movimientos recientes
- **Acciones rápidas**: Asignar herramienta, registrar movimiento

### Admin
- Acceso completo a CRUD
- Autorización de asignaciones importantes
- Reportes avanzados
- Configuración del sistema

### Secretaria
- Registro de movimientos
- Consulta de inventario
- Visualización de resguardos
- Sin acceso a eliminación

## 🔄 Flujo de Asignación (2-3 clics)

### Asignar Herramienta
1. Dashboard → "Asignar Herramienta"
2. Seleccionar técnico (dropdown)
3. Seleccionar herramienta (dropdown con disponibles)
4. Confirmar (modal)

### Asignar Consumible
1. Dashboard → "Asignar Consumible"
2. Seleccionar técnico
3. Seleccionar consumible
4. Ingresar cantidad
5. Confirmar

## 📈 Métricas y Alertas

### Alertas Visuales
- Herramientas asignadas > 30 días
- Stock bajo de consumibles
- Herramientas en mantenimiento

### KPIs Dashboard
- Total herramientas: 45 (32 asignadas, 13 disponibles)
- Consumibles críticos: 3/15
- Movimientos hoy: 12
- Técnicos activos: 8

## 🎯 Prioridades de Desarrollo

### Fase 1 (MVP)
1. Autenticación y roles
2. CRUD básico
3. Dashboard principal
4. Asignación/devolución básica

### Fase 2
1. Reportes avanzados
2. Alertas y notificaciones
3. Mejoras UX
4. Integración lista materiales

### Fase 3
1. Móvil responsive
2. Exportación PDF/Excel
3. Integraciones externas
4. Analytics avanzado
