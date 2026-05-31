#!/bin/bash
# ================================================================
# NEXO FINANZAS — Setup automático para Mac
# Uso: bash setup.sh
# ================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════╗${NC}"
echo -e "${BLUE}║     NEXO FINANZAS — Setup        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════╝${NC}"
echo ""

# ── 1. Homebrew ──────────────────────────────────────────────
echo -e "${YELLOW}[1/5] Verificando Homebrew...${NC}"
if ! command -v brew &>/dev/null; then
  echo "  Instalando Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  echo -e "  ${GREEN}✓ Homebrew ya está instalado${NC}"
fi

# ── 2. Node.js ───────────────────────────────────────────────
echo -e "${YELLOW}[2/5] Verificando Node.js...${NC}"
if ! command -v node &>/dev/null; then
  echo "  Instalando Node.js..."
  brew install node
else
  NODE_VER=$(node --version)
  echo -e "  ${GREEN}✓ Node.js $NODE_VER${NC}"
fi

# ── 3. Yarn ──────────────────────────────────────────────────
echo -e "${YELLOW}[3/5] Verificando Yarn...${NC}"
if ! command -v yarn &>/dev/null; then
  echo "  Instalando Yarn..."
  npm install -g yarn
else
  echo -e "  ${GREEN}✓ Yarn ya instalado${NC}"
fi

# ── 4. Dependencias del proyecto ─────────────────────────────
echo -e "${YELLOW}[4/5] Instalando dependencias (puede tardar 2-3 min)...${NC}"
yarn install
echo -e "  ${GREEN}✓ Dependencias instaladas${NC}"

# ── 5. Archivo .env del backend ──────────────────────────────
echo -e "${YELLOW}[5/5] Configurando variables de entorno...${NC}"
ENV_FILE="apps/api/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo ""
  echo -e "${BLUE}Ingresa tus credenciales de Supabase:${NC}"
  echo -e "(Las encuentras en supabase.com → tu proyecto → Settings → API)"
  echo ""

  read -p "  SUPABASE_URL (ej: https://xxx.supabase.co): " SUPA_URL
  read -p "  SUPABASE_ANON_KEY (empieza con sb_publishable_): " SUPA_ANON
  read -p "  SUPABASE_SERVICE_ROLE_KEY (empieza con sb_secret_): " SUPA_SECRET
  read -p "  OPENAI_API_KEY (o presiona Enter para omitir): " OPENAI_KEY

  cat > "$ENV_FILE" << EOF
SUPABASE_URL=$SUPA_URL
SUPABASE_SERVICE_ROLE_KEY=$SUPA_SECRET
SUPABASE_ANON_KEY=$SUPA_ANON
OPENAI_API_KEY=$OPENAI_KEY
PORT=3001
NODE_ENV=development
JWT_SECRET=nexo-local-dev-secret
EOF

  echo -e "  ${GREEN}✓ apps/api/.env creado${NC}"
else
  echo -e "  ${GREEN}✓ apps/api/.env ya existe${NC}"
fi

# ── Listo ────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Setup completado con éxito            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "Ahora ejecuta:"
echo -e "  ${BLUE}bash start.sh${NC}"
echo ""
