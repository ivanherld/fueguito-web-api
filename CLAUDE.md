# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start with nodemon (auto-reload on changes)
npm start         # Start production server (node index.js)
```

No test suite is configured. To generate a bcrypt hash for `ADMIN_PASS_HASH`:
```bash
node -e "import('bcrypt').then(m => m.default.hash('YOUR_PASSWORD', 10).then(console.log))"
```

## Environment Variables

Copy `.env-example` to `.env` and fill in:

| Variable | Purpose |
|---|---|
| `PORT` | Server port (default 3001) |
| `JWT_SECRET_KEY` | Secret for signing JWTs |
| `ADMIN_PASS_HASH` | bcrypt hash of the admin password |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SUPABASE_CLIPS_TABLE` | Table name (default: `movie_clips`) |
| `USE_RCLONE_UPLOAD` | `true` to upload via rclone, `false` for local storage |
| `RCLONE_REMOTE` | rclone remote name (e.g. `cloudflare-r2`) |
| `RCLONE_REMOTE_BASE_PATH` | Prefix within the bucket |
| `STORAGE_PUBLIC_BASE_URL` | Base URL prepended to stored file paths |
| `LOCAL_UPLOAD_ROOT` | Local upload directory (default: `uploads/files`) |
| `R2_BUCKET_NAME` | Cloudflare R2 bucket name (required for presigned URL flow) |

## Architecture

The project is an **ES Module** (`"type": "module"` in package.json) Express 5 REST API.

### Request flow

```
index.js
  ├── /auth  → src/routes/auth.routes.js → src/controllers/auth.controller.js
  └── /api   → authentication middleware → src/routes/clips.routes.js
                                              → src/controllers/clips.controller.js
                                                  → src/services/clips.services.js
                                                  │   ├── src/models/clips.model.js  (Supabase queries)
                                                  │   └── src/services/storage.service.js (file upload via rclone/local)
                                                  └── src/services/presigned.service.js (presigned URL generation)
```

### Layer responsibilities

- **controllers** (`src/controllers/`) — parse `req`/`res`, call service, return HTTP responses
- **services** (`src/services/clips.services.js`) — business logic: scene title normalization, file routing, validation, orchestrating model + storage calls
- **models** (`src/models/clips.model.js`) — raw Supabase queries, one function per operation
- **storage** (`src/services/storage.service.js`) — saves multer temp files either locally or via `rclone copyto` to a remote (Cloudflare R2). Controlled by `USE_RCLONE_UPLOAD`.
- **presigned** (`src/services/presigned.service.js`) — generates S3-compatible presigned PUT URLs for direct client→R2 uploads, bypassing the server for heavy files.
- **middlewares** — `authentication.js` verifies Bearer JWT; `not-found.js` handles 404s
- **supabase** (`src/models/supabase.js`) — lazily creates a singleton Supabase client

### Authentication

Single hardcoded admin user (`admin26`). Login at `POST /auth/login` returns a 1-hour JWT. All `/api/*` routes require `Authorization: Bearer <token>`.

### Clips / scene model

`POST /api/clips` does **not** create new rows — scenes must pre-exist in Supabase. It finds the existing row by `titulo` (e.g. `Escena 26A`) or `orden`, uploads any media files, then patches the row. `PUT/PATCH /api/clips/:id` update existing clips by ID.

Scene folder structure in storage: `fueguitoweb/clips/escena<token>/filename` (e.g. `fueguitoweb/clips/escena26a/TPS_A014_0028.mp4`).

### File uploads — two modes

**Via server (rclone/local):** multer stores temp files in `uploads/tmp`, then `storage.service.js` moves them to R2 via rclone or to `LOCAL_UPLOAD_ROOT`. File fields: `clip`/`url` (video), `thumbnail`, `storyboard`/`url_storyboard`, `storyboard2`/`url_storyboard2`. Max: 2 GB. Limited by server RAM and request timeout.

**Via presigned URL (recommended for large files):**
1. `POST /api/clips/upload-url` — body: `{ escena, filename, contentType, fileType }` → returns `{ uploadUrl, publicUrl, key, expiresIn }`
2. Client uploads the file directly to R2 with `PUT uploadUrl` (no server involvement)
3. `PATCH /api/clips/:id` — body: `{ url: publicUrl }` (or `url_storyboard`, `url_storyboard2`, `thumbnail`) to persist the URL in Supabase

`PATCH /api/clips/:id` accepts URL fields both as uploaded files (multer) and as plain text body fields, so both flows use the same endpoint.

### Server-side rclone bootstrap

`scripts/bootstrap-rclone.sh` auto-configures a rclone remote from env vars on startup (used by `scripts/start-server.sh` and the systemd service in `deploy/`).
