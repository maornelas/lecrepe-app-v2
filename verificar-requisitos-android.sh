#!/bin/bash

# Script para verificar que todos los requisitos para generar APK estén instalados

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 Verificando requisitos para generar APK de Android...${NC}"
echo ""

ERRORS=0

# Verificar Java
echo -e "${YELLOW}1. Verificando Java JDK...${NC}"
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1)
    echo -e "${GREEN}   ✅ Java encontrado: $JAVA_VERSION${NC}"
else
    echo -e "${RED}   ❌ Java NO encontrado${NC}"
    echo -e "${YELLOW}      Instala Java JDK 17 o superior:${NC}"
    echo -e "${YELLOW}      macOS: brew install openjdk@17${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Verificar JAVA_HOME
echo -e "${YELLOW}2. Verificando JAVA_HOME...${NC}"
if [ -n "$JAVA_HOME" ]; then
    echo -e "${GREEN}   ✅ JAVA_HOME configurado: $JAVA_HOME${NC}"
else
    echo -e "${YELLOW}   ⚠️  JAVA_HOME no configurado${NC}"
    echo -e "${YELLOW}      Configura con: export JAVA_HOME=\$(/usr/libexec/java_home -v 17)${NC}"
fi

# Verificar Android SDK
echo -e "${YELLOW}3. Verificando Android SDK...${NC}"
if [ -n "$ANDROID_HOME" ]; then
    echo -e "${GREEN}   ✅ ANDROID_HOME configurado: $ANDROID_HOME${NC}"
elif [ -d "$HOME/Library/Android/sdk" ]; then
    echo -e "${YELLOW}   ⚠️  ANDROID_HOME no configurado, pero SDK encontrado en: $HOME/Library/Android/sdk${NC}"
    echo -e "${YELLOW}      Configura con: export ANDROID_HOME=\$HOME/Library/Android/sdk${NC}"
elif [ -d "$HOME/Android/Sdk" ]; then
    echo -e "${YELLOW}   ⚠️  ANDROID_HOME no configurado, pero SDK encontrado en: $HOME/Android/Sdk${NC}"
    echo -e "${YELLOW}      Configura con: export ANDROID_HOME=\$HOME/Android/Sdk${NC}"
else
    echo -e "${RED}   ❌ Android SDK no encontrado${NC}"
    echo -e "${YELLOW}      Instala Android Studio desde: https://developer.android.com/studio${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Verificar Gradle
echo -e "${YELLOW}4. Verificando Gradle wrapper...${NC}"
if [ -f "android/gradlew" ]; then
    echo -e "${GREEN}   ✅ Gradle wrapper encontrado${NC}"
else
    echo -e "${RED}   ❌ Gradle wrapper no encontrado${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Verificar Node.js
echo -e "${YELLOW}5. Verificando Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}   ✅ Node.js encontrado: $NODE_VERSION${NC}"
else
    echo -e "${RED}   ❌ Node.js NO encontrado${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Verificar npm
echo -e "${YELLOW}6. Verificando npm...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}   ✅ npm encontrado: $NPM_VERSION${NC}"
else
    echo -e "${RED}   ❌ npm NO encontrado${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Todos los requisitos están instalados!${NC}"
    echo -e "${GREEN}Puedes generar el APK con: ./build-apk.sh debug${NC}"
    exit 0
else
    echo -e "${RED}❌ Faltan $ERRORS requisito(s). Por favor instálalos antes de continuar.${NC}"
    echo -e "${YELLOW}Revisa INSTRUCCIONES_APK.md para más detalles.${NC}"
    exit 1
fi

