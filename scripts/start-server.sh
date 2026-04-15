#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"

if [ -d "${ROOT_DIR}/.bin" ]; then
  export PATH="${ROOT_DIR}/.bin:${PATH}"
fi

if [ -f "${ROOT_DIR}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "${ROOT_DIR}/.env"
  set +a
fi

if [ "${USE_RCLONE_UPLOAD:-false}" = "true" ]; then
  "${ROOT_DIR}/scripts/bootstrap-rclone.sh"
fi

exec npm start
