#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "  ███╗   ██╗███████╗██╗  ██╗ ██████╗ "
echo "  ████╗  ██║██╔════╝╚██╗██╔╝██╔═══██╗"
echo "  ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║"
echo "  ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║"
echo "  ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝"
echo "  ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ "
echo ""
echo "  Nexo Finanzas — iniciando..."
echo ""

if ! command -v node &>/dev/null; then
  echo "  ❌  Node.js no está instalado."
  echo "  → Instala Node desde https://nodejs.org y vuelve a correr este script."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "  📦  Instalando dependencias (solo la primera vez)..."
  npm install --silent
  echo "  ✅  Dependencias instaladas."
  echo ""
fi

echo "  🚀  Abriendo en http://localhost:5173"
echo "  (presiona Ctrl+C para detener)"
echo ""

# Open browser after 2s
(sleep 2 && open "http://localhost:5173" 2>/dev/null || xdg-open "http://localhost:5173" 2>/dev/null || true) &

npm run dev
