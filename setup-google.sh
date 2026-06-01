#!/bin/bash
# Adds Google OAuth authorized origins to the local Vite app and opens
# Google Cloud Console for the one manual step required.

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="$REPO_DIR/web"

echo ""
echo "  Nexo Finanzas — Configuración Gmail"
echo ""

# ── Detect Vite port ────────────────────────────────────────────────────────
PORT=5173
for p in 5173 5174 5175 5176; do
  if lsof -ti tcp:$p &>/dev/null; then PORT=$p; break; fi
done
echo "  ✓ App detectada en http://localhost:$PORT"
echo ""

# ── Instrucción única que el usuario debe hacer ─────────────────────────────
echo "  ┌─────────────────────────────────────────────────────────────────┐"
echo "  │  UN PASO en Google Cloud Console (se abre ahora en el browser) │"
echo "  │                                                                 │"
echo "  │  1. Ve a: Credenciales → tu cliente OAuth → Editar             │"
echo "  │  2. En «Orígenes autorizados» agrega:                           │"
echo "  │       http://localhost:$PORT                                    │"
echo "  │  3. En «URIs de redireccionamiento autorizados» agrega:         │"
echo "  │       http://localhost:$PORT                                    │"
echo "  │  4. Guardar                                                     │"
echo "  └─────────────────────────────────────────────────────────────────┘"
echo ""

# Abre Google Cloud Console en la página correcta
open "https://console.cloud.google.com/apis/credentials" 2>/dev/null || \
  xdg-open "https://console.cloud.google.com/apis/credentials" 2>/dev/null || true

echo "  Cuando termines ese paso, abre la app en el browser:"
echo "  → http://localhost:$PORT"
echo "  → Ir a ⚙️ Configurar → Conectar con Google"
echo ""
