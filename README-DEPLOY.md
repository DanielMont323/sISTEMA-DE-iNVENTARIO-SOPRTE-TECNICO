# 🚀 Deploy Guide: Render + Netlify

## 📁 Archivos de Configuración Creados

### Backend (Render)
- `render-backend.yaml` - Configuración para Render
- Variables de entorno necesarias:
  - `MONGODB_URI`: Tu conexión a MongoDB Atlas
  - `JWT_SECRET`: Clave secreta para JWT
  - `NODE_ENV`: production
  - `FRONTEND_URL`: https://inventario-app.netlify.app

### Frontend (Netlify)
- `netlify.toml` - Configuración de build y deploy
- `frontend/.env.production` - Variables de producción

## 🎯 Pasos para Deploy

### 1. Backend en Render
1. **Sube código a GitHub**
   ```bash
   git add .
   git commit -m "Ready for deploy"
   git push origin main
   ```

2. **Configura Render**
   - Ve a [render.com](https://render.com)
   - Conecta tu repositorio de GitHub
   - Usa el archivo `render-backend.yaml`
   - Configura variables de entorno

3. **Variables de Entorno en Render**
   ```
   MONGODB_URI=mongodb+srv://Spacecards:Yomero2420@cluster0.xi0cc.mongodb.net/inventario?retryWrites=true&w=majority
   JWT_SECRET=tu_clave_secreta_aqui
   NODE_ENV=production
   FRONTEND_URL=https://inventario-app.netlify.app
   ```

### 2. Frontend en Netlify
1. **Sube código a GitHub** (si no está subido)

2. **Configura Netlify**
   - Ve a [netlify.com](https://netlify.com)
   - Conecta tu repositorio de GitHub
   - Netlify detectará automáticamente `netlify.toml`

3. **Variables de Entorno en Netlify**
   - Ve a Site settings → Build & deploy → Environment
   - Agrega: `VITE_API_URL=https://inventario-backend.onrender.com/api`

## 🔧 Configuraciones Importantes

### CORS en Backend
El backend ya está configurado para aceptar peticiones de Netlify.

### Environment Variables
- Frontend usa `VITE_API_URL` para conectar al backend
- Backend usa `FRONTEND_URL` para CORS

## 🌐 URLs Finales
- **Backend**: https://inventario-backend.onrender.com
- **Frontend**: https://inventario-app.netlify.app
- **API**: https://inventario-backend.onrender.com/api

## ✅ Verificación
1. Una vez deployado, prueba:
   - Login: https://inventario-app.netlify.app
   - API Health: https://inventario-backend.onrender.com/api/health

## 🛠️ Solución de Problemas Comunes

### CORS Errors
Si tienes errores de CORS:
1. Verifica que `FRONTEND_URL` en Render sea correcta
2. Verifica que `VITE_API_URL` en Netlify sea correcta

### Build Errors
Si el frontend no compila:
1. Verifica `netlify.toml`
2. Verifica que `frontend/package.json` tenga `build` script

### Database Connection
Si el backend no conecta a DB:
1. Verifica `MONGODB_URI` en Render
2. Asegúrate que MongoDB Atlas permita conexiones desde cualquier IP
