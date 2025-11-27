#!/bin/bash

# Script para generar APK de Android para lecrepe-app
# Uso: ./build-apk.sh [debug|release]

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BUILD_TYPE=${1:-debug}

echo -e "${GREEN}🚀 Generando APK para Android...${NC}"
echo -e "${YELLOW}Tipo de build: ${BUILD_TYPE}${NC}"

# Verificar que estamos en el directorio correcto
if [ ! -d "android" ]; then
    echo -e "${RED}❌ Error: No se encontró el directorio android. Ejecuta este script desde la raíz del proyecto.${NC}"
    exit 1
fi

# Limpiar builds anteriores
echo -e "${YELLOW}🧹 Limpiando builds anteriores...${NC}"
cd android
./gradlew clean

# Generar el APK
if [ "$BUILD_TYPE" = "release" ]; then
    echo -e "${YELLOW}📦 Generando APK de RELEASE...${NC}"
    echo -e "${YELLOW}⚠️  Nota: Para producción, necesitas un keystore firmado.${NC}"
    echo -e "${YELLOW}    Actualmente se está usando el keystore de debug.${NC}"
    ./gradlew assembleRelease
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
else
    echo -e "${YELLOW}📦 Generando APK de DEBUG...${NC}"
    ./gradlew assembleDebug
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

cd ..

# Verificar que el APK se generó correctamente
if [ -f "android/$APK_PATH" ]; then
    APK_SIZE=$(du -h "android/$APK_PATH" | cut -f1)
    echo -e "${GREEN}✅ APK generado exitosamente!${NC}"
    echo -e "${GREEN}📁 Ubicación: android/$APK_PATH${NC}"
    echo -e "${GREEN}📊 Tamaño: $APK_SIZE${NC}"
    echo ""
    echo -e "${YELLOW}Para instalar en un dispositivo:${NC}"
    echo -e "  adb install android/$APK_PATH"
    echo ""
    echo -e "${YELLOW}O transfiere el archivo al dispositivo e instálalo manualmente.${NC}"
else
    echo -e "${RED}❌ Error: No se pudo generar el APK${NC}"
    exit 1
fi

