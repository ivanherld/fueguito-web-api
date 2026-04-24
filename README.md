# fueguito-pagina-backend

API REST para gestión de clips de escenas de una película. Almacena metadatos en Supabase y archivos multimedia (video, thumbnail, storyboard) en Cloudflare R2.

## Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express 5
- **Base de datos:** Supabase (PostgreSQL)
- **Almacenamiento:** Cloudflare R2
- **Auth:** JWT + bcrypt

## Instalación

```bash
npm install
cp .env-example .env   # completar variables
npm run dev            # desarrollo con nodemon
npm start              # producción
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (default: 3001) |
| `JWT_SECRET_KEY` | Secreto para firmar JWTs |
| `ADMIN_PASS_HASH` | Hash bcrypt de la contraseña del admin |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase |
| `SUPABASE_CLIPS_TABLE` | Nombre de la tabla (default: `movie_clips`) |
| `STORAGE_PUBLIC_BASE_URL` | URL pública base del CDN de R2 |
| `R2_BUCKET_NAME` | Nombre del bucket en Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | Access key de R2 |
| `R2_SECRET_ACCESS_KEY` | Secret key de R2 |
| `R2_S3_ENDPOINT_EU` | Endpoint S3-compatible de R2 |
| `USE_RCLONE_UPLOAD` | `true` para subir via rclone, `false` para local |
| `RCLONE_REMOTE` | Nombre del remote rclone (ej: `cloudflare-r2`) |
| `LOCAL_UPLOAD_ROOT` | Carpeta local de uploads (default: `uploads/files`) |

Para generar `ADMIN_PASS_HASH`:
```bash
node -e "import('bcrypt').then(m => m.default.hash('TU_PASSWORD', 10).then(console.log))"
```

---

## Documentación interactiva (Swagger)

Con el servidor corriendo, abrí en el navegador:

```
http://localhost:3000/api-docs
```

Desde ahí podés explorar y probar todos los endpoints. Para autenticarte en la UI: hacé login con `POST /auth/login`, copiá el token y pegalo en el botón **Authorize** con el formato `Bearer <token>`.

---

## Autenticación

Todas las rutas bajo `/api` requieren un Bearer token JWT.

### `POST /auth/login`

```json
{ "username": "admin26", "password": "..." }
```

Respuesta: `{ "token": "..." }` — expira en 1 hora.

---

## Rutas de clips

Base: `/api/clips` — requiere `Authorization: Bearer <token>`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/clips` | Lista todos los clips |
| `GET` | `/api/clips/:id` | Obtiene un clip por ID |
| `POST` | `/api/clips` | Carga media en una escena existente |
| `PUT` | `/api/clips/:id` | Reemplaza un clip |
| `PATCH` | `/api/clips/:id` | Actualiza parcialmente un clip |
| `DELETE` | `/api/clips/:id` | Elimina un clip |
| `POST` | `/api/clips/upload-url` | Genera URL firmada para subir directo a R2 |

### Queries opcionales en `GET /api/clips`

- `filmado=true|false`
- `color=<valor>`
- `decorado=<valor>`

---

## Subida de archivos

Hay dos modos de subir archivos al bucket.

### Modo 1 — Via servidor (multipart/form-data)

El archivo pasa por el servidor antes de ir a R2 (via rclone) o guardarse localmente.

Campos aceptados en `POST /api/clips` y `PUT|PATCH /api/clips/:id`:

| Campo | Tipo | Contenido |
|---|---|---|
| `clip` o `url` | archivo | Video de la escena |
| `thumbnail` | archivo | Imagen de portada |
| `storyboard` o `url_storyboard` | archivo | Storyboard principal |
| `storyboard2` o `url_storyboard2` | archivo | Storyboard secundario (opcional) |

Campos de texto: `escena`, `titulo`, `filmado`, `descripcion`, `orden`, `color`, `fecha_aprox`, `comentarios_filmacion`, `decorado`.

Tamaño máximo por archivo: **2 GB**.

### Modo 2 — Presigned URL (recomendado para archivos pesados)

El archivo va directo del cliente a R2 sin pasar por el servidor.

**Paso 1 — Pedir la URL firmada**

`POST /api/clips/upload-url`

```json
{
  "escena": "26A",
  "filename": "TPS_A014_0028.mp4",
  "contentType": "video/mp4",
  "fileType": "clip"
}
```

Respuesta:
```json
{
  "uploadUrl": "https://...(URL firmada de R2)...",
  "publicUrl": "https://cdn.tudominio.com/fueguitoweb/clips/escena26a/TPS_A014_0028.mp4",
  "key": "fueguitoweb/clips/escena26a/TPS_A014_0028.mp4",
  "expiresIn": 3600
}
```

`fileType` puede ser: `clip`, `thumbnail`, `storyboard`, `storyboard2`.

**Paso 2 — Subir el archivo directo a R2**

```
PUT <uploadUrl>
Content-Type: video/mp4
Body: <binario del archivo>
```

**Paso 3 — Guardar la URL en Supabase**

`PATCH /api/clips/:id`

```json
{ "url": "<publicUrl del paso 1>" }
```

Usar `url_storyboard`, `url_storyboard2` o `thumbnail` según corresponda.

---

## Lógica de escenas

`POST /api/clips` **no crea filas nuevas**: la escena debe existir previamente en Supabase. El backend la busca por `titulo` (ej: `Escena 26A`) o `orden`, y actualiza la fila existente.

El campo `escena` acepta formatos: `2`, `10`, `26A`, `26B`. El backend lo convierte automáticamente a `Escena 26A` para la búsqueda.

Validaciones:
- Si `filmado=true` → se requiere `clip`/`url`
- Si `filmado=false` → se requiere `storyboard` o `storyboard2`

Estructura de archivos en el bucket:
```
fueguitoweb/clips/escena26a/TPS_A014_0028.mp4
fueguitoweb/clips/escena26a/thumbnail.jpg
fueguitoweb/clips/escena10/storyboard.png
```

---

## Tabla Supabase

Columnas sugeridas para la tabla (`movie_clips` por defecto, configurable con `SUPABASE_CLIPS_TABLE`):

```sql
id                    uuid primary key default gen_random_uuid()
titulo                text not null
filmado               boolean not null default false
orden                 int4 null
url                   text null
url_storyboard        text null
url_storyboard2       text null
thumbnail             text null
descripcion           text null
color                 text null
fecha_aprox           text null
comentarios_filmacion text null
decorado              text null
```

---

## Deploy

El proyecto incluye soporte para:

- **Railway / Render** — configurar variables de entorno en el dashboard y usar `npm start` como start command.
- **Docker** — `Dockerfile` incluido, instala rclone automáticamente.
- **VPS con systemd** — plantilla en `deploy/systemd/fueguito-api.service`. Los scripts `scripts/bootstrap-rclone.sh` y `scripts/start-server.sh` configuran rclone automáticamente al iniciar.

> El almacenamiento en Railway/Render es efímero. Usar siempre R2 como destino final (`USE_RCLONE_UPLOAD=true` o el flujo de presigned URLs).
