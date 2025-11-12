#!/bin/bash

# Script para generar APK standalone de Android (con bundle incluido)
# Este APK funcionará sin necesidad de Metro bundler
# Uso: ./build-apk-standalone.sh [debug|release]

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BUILD_TYPE=${1:-debug}

echo -e "${GREEN}🚀 Generando APK standalone para Android...${NC}"
echo -e "${YELLOW}Tipo de build: ${BUILD_TYPE}${NC}"
echo -e "${YELLOW}Este APK incluirá el bundle de JavaScript y funcionará sin Metro bundler${NC}"

# Verificar que estamos en el directorio correcto
if [ ! -d "android" ]; then
    echo -e "${RED}❌ Error: No se encontró el directorio android. Ejecuta este script desde la raíz del proyecto.${NC}"
    exit 1
fi

# Verificar que Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js no está instalado${NC}"
    exit 1
fi

# Configurar variables de entorno si no están configuradas
if [ -z "$JAVA_HOME" ]; then
    if [ -d "/opt/homebrew/opt/openjdk@17" ]; then
        export JAVA_HOME=/opt/homebrew/opt/openjdk@17
        export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
    fi
fi

if [ -z "$ANDROID_HOME" ]; then
    if [ -d "$HOME/Library/Android/sdk" ]; then
        export ANDROID_HOME=$HOME/Library/Android/sdk
    fi
fi

# Generar el bundle de JavaScript
echo -e "${YELLOW}📦 Generando bundle de JavaScript...${NC}"
mkdir -p android/app/src/main/assets

if [ "$BUILD_TYPE" = "release" ]; then
    npx react-native bundle \
        --platform android \
        --dev false \
        --entry-file index.js \
        --bundle-output android/app/src/main/assets/index.android.bundle \
        --assets-dest android/app/src/main/res/
else
    npx react-native bundle \
        --platform android \
        --dev true \
        --entry-file index.js \
        --bundle-output android/app/src/main/assets/index.android.bundle \
        --assets-dest android/app/src/main/res/
fi

if [ ! -f "android/app/src/main/assets/index.android.bundle" ]; then
    echo -e "${RED}❌ Error: No se pudo generar el bundle de JavaScript${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Bundle generado exitosamente${NC}"

# Limpiar builds anteriores
echo -e "${YELLOW}🧹 Limpiando builds anteriores...${NC}"
cd android
./gradlew clean

# Generar el APK
if [ "$BUILD_TYPE" = "release" ]; then
    echo -e "${YELLOW}📦 Generando APK de RELEASE...${NC}"
    echo -e "${YELLOW}⚠️  Nota: Para producción, necesitas un keystore firmado.${NC}"
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
    echo -e "${GREEN}✅ APK standalone generado exitosamente!${NC}"
    echo -e "${GREEN}📁 Ubicación: android/$APK_PATH${NC}"
    echo -e "${GREEN}📊 Tamaño: $APK_SIZE${NC}"
    echo ""
    echo -e "${YELLOW}Este APK funciona sin Metro bundler.${NC}"
    echo -e "${YELLOW}Para instalar en un dispositivo:${NC}"
    echo -e "  adb install android/$APK_PATH"
    echo ""
    echo -e "${YELLOW}O transfiere el archivo al dispositivo e instálalo manualmente.${NC}"
else
    echo -e "${RED}❌ Error: No se pudo generar el APK${NC}"
    exit 1
fi

