#!/bin/bash
# ================================================================
# NEXO FINANZAS — Iniciar backend + app móvil
# Uso: bash start.sh
# ================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════╗${NC}"
echo -e "${BLUE}║   NEXO FINANZAS — Iniciando      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════╝${NC}"
echo ""

# Abrir nueva ventana de Terminal para el backend
echo -e "${YELLOW}Iniciando backend API en puerto 3001...${NC}"
osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && yarn workspace @nexo/api start:dev"'

# Esperar 3 segundos para que el backend arranque
sleep 3

# Iniciar la app móvil en esta terminal
echo -e "${YELLOW}Iniciando app móvil...${NC}"
echo ""
echo -e "${GREEN}Escanea el QR con tu iPhone (app Expo Go)${NC}"
echo -e "${GREEN}O abre http://localhost:19006 en Chrome para verla en el navegador${NC}"
echo ""

yarn workspace @nexo/mobile start
