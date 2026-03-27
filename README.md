# API REST con Node.js, Supabase y Cloudflare

La API gestiona clips de escenas: metadatos en Supabase y archivos multimedia (clip, thumbnail o storyboard) con almacenamiento local o rclone.

## Instalación

```shell
npm install

```
## Tecnologías utilizadas: 
    - `bcrypt`
    - `body-parser`
    - `cors`
    - `dotenv`
    - `express`
    - `jsonwebtoken`
  - `@supabase/supabase-js`
  - `multer`


## URL en render: https://api-node-ivanh.onrender.com

# Rutas disponibles

## Nuevo módulo de clips de escenas

Base URL protegida por JWT: `.api/clips`

- `GET .api/clips` -> Lista clips (queries opcionales: `filmado`, `color`, `decorado`)
- `GET .api/clips/:id` -> Obtiene un clip
- `POST .api/clips` -> Carga/actualiza media de una escena existente
- `PUT .api/clips/:id` -> Actualiza clip
- `PATCH .api/clips/:id` -> Actualiza parcialmente clip
- `DELETE .api/clips/:id` -> Elimina clip

### Body para crear/actualizar clips

`multipart/form-data`

- Campos de texto: `escena`, `titulo`, `filmado`, `descripcion`, `orden`, `color`, `fecha_aprox`, `comentarios_filmacion`, `decorado`
- Archivos opcionales:
  - `clip` o `url` (video)
  - `thumbnail` (imagen)
  - `storyboard` o `url_storyboard` (storyboard)
  - `storyboard2` o `url_storyboard2` (segundo storyboard opcional)

Las columnas `url`, `url_storyboard`, `url_storyboard2` y `thumbnail` se generan automaticamente en backend segun la escena.
Ejemplo de estructura: `clips/escena02/TPS_A014_0028.mp4`.

Flujo de escenas fijas en `POST /api/clips`:

- Busca la escena existente en Supabase por `escena` (ej: `26A` -> `Escena 26A`), o por `titulo`/`orden`
- Si no existe, responde error
- Si existe y no tenia `url`, se considera primera carga
- Si existe y ya tenia `url`, se considera reemplazo/actualizacion

Formato recomendado:

- Enviar `escena=26A` (tambien soporta `2`, `10`, `26B`)
- El backend lo transforma automaticamente a `titulo = Escena 26A` para buscar en la tabla

Validación mínima:

- `titulo` es obligatorio
- si `filmado=true`, se requiere subir archivo `clip`/`url`
- si `filmado=false`, se requiere subir `storyboard`/`url_storyboard` o `storyboard2`/`url_storyboard2`

### Supabase (metadatos)

Definí una tabla (por defecto `movie_clips`) con columnas sugeridas:

- `id` uuid primary key default gen_random_uuid()
- `titulo` text not null
- `url` text null
- `url_storyboard` text null
- `url_storyboard2` text null
- `filmado` boolean not null default false
- `descripcion` text null
- `orden` int4 null
- `color` text null
- `fecha_aprox` text null
- `comentarios_filmacion` text null
- `decorado` text null
- `thumbnail` text null

### Rclone para archivos pesados

Sí, se puede implementar en esta API y ya quedó integrado de forma opcional.

Variables importantes:

- `USE_RCLONE_UPLOAD=true` para activar rclone
- `RCLONE_REMOTE` por ejemplo `cloudflare-r2`
- `RCLONE_REMOTE_BASE_PATH` por ejemplo `fueguito-media`
- `STORAGE_PUBLIC_BASE_URL` URL pública base para construir links de archivos

Si `USE_RCLONE_UPLOAD=false`, guarda archivos en `LOCAL_UPLOAD_ROOT`.

# Autenticación:
Las credenciales como administrador son (En el código la contraseña esta hasheada): 

email: "user@email.com"
password: "strongPass123"

# En POST:

`.auth/login`  
Se pasa en un JSON las credenciales y se obtiene el token válido

```json
{
  "id": 1,
  "email": "user@email.com",
  "password": "strongPass123"
}

