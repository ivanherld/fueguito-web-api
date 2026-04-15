#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="${ROOT_DIR}/.bin"

mkdir -p "${BIN_DIR}"

echo "[render-build] Instalando rclone en ${BIN_DIR}..."
curl -fsSL https://rclone.org/install.sh | bash -s -- -b "${BIN_DIR}"

export PATH="${BIN_DIR}:${PATH}"

echo "[render-build] Verificando rclone..."
rclone version

echo "[render-build] Instalando dependencias Node..."
npm install

echo "[render-build] Build completado."
