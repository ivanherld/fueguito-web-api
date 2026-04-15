# Prompt para Frontend React - Panel Admin Fueguito

## Contexto

Necesito crear un frontend React simple y funcional para un panel admin que gestione clips de escenas cinematográficas. El backend ya está construido y disponible en Render/producción.

## Backend disponible

**Base URL:** https://api-node-ivanh.onrender.com (o tu URL en Render)

**Endpoints principales:**

- `POST /auth/login` - Login admin
  - Body: `{ "username": "admin26", "password": "LuFa_2026" }`
  - Response: `{ "token": "jwt_token" }`

- `GET /api/clips` - Listar todas las escenas (requiere JWT)
  - Headers: `Authorization: Bearer <token>`
  - Query params opcionales: `?filmado=true&color=rojo&decorado=true`

- `GET /api/clips/:id` - Obtener una escena (requiere JWT)

- `POST /api/clips` - Crear/actualizar escena (requiere JWT, multipart/form-data)
  - Headers: `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
  - Body campos:
    - `escena`: "26A" (o `titulo`: "Escena 26A", `orden`: 26)
    - `filmado`: true/false
    - `descripcion`: string (opcional)
    - `color`: string (opcional, ej: "rojo", "monocromo")
    - `fecha_aprox`: string (opcional)
    - `comentarios_filmacion`: string (opcional)
    - `decorado`: true/false (opcional)
  - Archivos opcionales:
    - `clip` (video, si filmado=true)
    - `thumbnail` (imagen portada)
    - `storyboard` (imagen del storyboard)
    - `storyboard2` (segundo storyboard, opcional)

- `PUT /api/clips/:id` - Actualizar escena completa (igual que POST)

- `DELETE /api/clips/:id` - Eliminar escena (requiere JWT)

## Requisitos funcionales

1. **Pantalla de Login**
   - Input: username
   - Input: password
   - Botón: Login
   - Guardar JWT en localStorage
   - Redirigir al dashboard si login exitoso

2. **Dashboard/Listado de Escenas**
   - Tabla o cards mostrando todas las escenas
   - Columnas: Escena, Titulo, Filmado, Color, Decorado, Acciones
   - Botón "Nueva Escena" → modal/página de creación
   - Botón "Editar" → abre formulario precargado
   - Botón "Eliminar" → confirma y elimina
   - Buscador por escena/titulo
   - Filtro por filmado/color/decorado

3. **Formulario de Creación/Edición de Escena**
   - Campo: Escena (ej: "26A") - requerido
   - Campo: Titulo (autollenado según escena)
   - Toggle: Filmado (true/false)
   - Campo: Descripción (textarea)
   - Campo: Color (dropdown: rojo, monocromo, otro)
   - Campo: Fecha aproximada
   - Campo: Comentarios de filmación (textarea)
   - Toggle: Decorado
   - Upload: Clip/Video (si filmado=true) - requerido si filmado
   - Upload: Thumbnail (imagen)
   - Upload: Storyboard
   - Upload: Storyboard2
   - Botón: Guardar
   - Botón: Cancelar
   - Mensajes de error y carga

4. **Características técnicas**
   - React Router para navegación
   - Axios o fetch para peticiones HTTP
   - Context API o Zustand para manejar estado de autenticación
   - Validaciones en frontend
   - Manejo de errores HTTP
   - Mensajes de confirmación (toast/alert)
   - Loading spinners durante cargas
   - Interfaz limpia y responsive
   - Si filmado=false, ocultar upload de clip y mostrar storyboards como requeridos

5. **Estructura de carpetas recomendada**
   ```
   src/
   ├── components/
   │   ├── Login.jsx
   │   ├── Dashboard.jsx
   │   ├── SceneForm.jsx
   │   ├── SceneList.jsx
   │   └── ProtectedRoute.jsx
   ├── context/
   │   └── AuthContext.jsx
   ├── services/
   │   └── api.js
   ├── App.jsx
   └── index.css
   ```

6. **Stack sugerido**
   - React 18+
   - React Router v6
   - Axios
   - Context API (autenticación)
   - CSS Modules o Tailwind CSS (estilos)
   - Vite (build tool, opcional)

## Notas importantes

- El token JWT se debe incluir en TODAS las peticiones a `/api/*` en header `Authorization: Bearer <token>`
- Las rutas `/api/*` están protegidas, sin token devuelven 401
- El login no está protegido, cualquiera puede intentar
- Los archivos se suben directamente a Cloudflare R2 via rclone en el backend
- La respuesta del POST/PUT incluye las URLs de los archivos en R2

## Ejemplo de flujo

1. Usuario ingresa username "admin26" y password "LuFa_2026"
2. Frontend hace POST a `/auth/login`
3. Backend devuelve token JWT
4. Frontend guarda token en localStorage y redirige a dashboard
5. Dashboard hace GET a `/api/clips` con JWT en header
6. Muestra listado de escenas
7. Usuario hace click en "Nueva Escena"
8. Abre modal/página con formulario vacío
9. Usuario completa: escena "26A", filmado=true, sube video clip, thumbnail
10. Frontend valida y hace POST a `/api/clips` con multipart/form-data y JWT
11. Backend sube archivos a R2 y devuelve escena con URLs
12. Frontend cierra modal y refrescar listado

## Opcional/Futuro

- Previsualización de videos/imágenes
- Exportar listado a CSV
- Drag-and-drop para archivos
- Sincronización en tiempo real
- Historial de cambios
