#!/usr/bin/env bash
set -euo pipefail

if ! command -v rclone >/dev/null 2>&1; then
  echo "[bootstrap-rclone] rclone no esta instalado en el servidor."
  echo "[bootstrap-rclone] Instala rclone y vuelve a ejecutar."
  exit 1
fi

RCLONE_REMOTE="${RCLONE_REMOTE:-cloudflare-r2}"
R2_ENDPOINT="${R2_S3_ENDPOINT_EU:-${R2_S3_ENDPOINT:-}}"

if [ -z "${R2_ACCESS_KEY_ID:-}" ]; then
  echo "[bootstrap-rclone] Falta R2_ACCESS_KEY_ID en variables de entorno."
  exit 1
fi

if [ -z "${R2_SECRET_ACCESS_KEY:-}" ]; then
  echo "[bootstrap-rclone] Falta R2_SECRET_ACCESS_KEY en variables de entorno."
  exit 1
fi

if [ -z "${R2_ENDPOINT}" ]; then
  echo "[bootstrap-rclone] Falta R2_S3_ENDPOINT_EU o R2_S3_ENDPOINT."
  exit 1
fi

if rclone listremotes | grep -qx "${RCLONE_REMOTE}:"; then
  echo "[bootstrap-rclone] Remote ${RCLONE_REMOTE} ya existe. Actualizando credenciales..."
  rclone config update "${RCLONE_REMOTE}" \
    provider Cloudflare \
    access_key_id "${R2_ACCESS_KEY_ID}" \
    secret_access_key "${R2_SECRET_ACCESS_KEY}" \
    endpoint "${R2_ENDPOINT}" \
    --non-interactive
else
  echo "[bootstrap-rclone] Creando remote ${RCLONE_REMOTE}..."
  rclone config create "${RCLONE_REMOTE}" s3 \
    provider Cloudflare \
    access_key_id "${R2_ACCESS_KEY_ID}" \
    secret_access_key "${R2_SECRET_ACCESS_KEY}" \
    endpoint "${R2_ENDPOINT}" \
    --non-interactive
fi

echo "[bootstrap-rclone] Verificando acceso al remote..."
rclone lsd "${RCLONE_REMOTE}:" >/dev/null

echo "[bootstrap-rclone] Remote ${RCLONE_REMOTE} listo."
