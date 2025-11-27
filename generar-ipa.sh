#!/bin/bash

# Script simplificado para generar .ipa
# Este script te guiará paso a paso

set -e

echo "══════════════════════════════════════════════════════════"
echo "  🚀 Generador de .ipa para lecrepe-app"
echo "══════════════════════════════════════════════════════════"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Directorios
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$PROJECT_DIR/ios"
ARCHIVE_PATH="$IOS_DIR/build/lecrepe-app.xcarchive"
EXPORT_PATH="$IOS_DIR/build/export"

echo -e "${BLUE}📋 Paso 1: Verificando configuración...${NC}"
echo ""

# Verificar que Xcode está instalado
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}❌ Error: Xcode no está instalado${NC}"
    exit 1
fi

# Verificar que el workspace existe
if [ ! -f "$IOS_DIR/lecrepe-app.xcworkspace/contents.xcworkspacedata" ]; then
    echo -e "${RED}❌ Error: No se encontró el workspace de Xcode${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Xcode encontrado${NC}"
echo ""

# Verificar si hay un Team configurado
echo -e "${YELLOW}⚠️  IMPORTANTE: Necesitas configurar un Development Team${NC}"
echo ""
echo "Para generar el .ipa, necesitas:"
echo "  1. Una cuenta de Apple ID (gratis) o Apple Developer"
echo "  2. Configurar el Team en Xcode"
echo ""
read -p "¿Ya tienes configurado el Team en Xcode? (s/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo -e "${BLUE}📝 Abriendo Xcode para configurar el Team...${NC}"
    echo ""
    echo "En Xcode:"
    echo "  1. Selecciona el proyecto 'lecrepe-app' (icono azul)"
    echo "  2. Selecciona el target 'lecrepe-app'"
    echo "  3. Ve a la pestaña 'Signing & Capabilities'"
    echo "  4. Marca 'Automatically manage signing'"
    echo "  5. Selecciona tu Team en el menú desplegable"
    echo "  6. Si no aparece, haz clic en 'Add Account...'"
    echo ""
    read -p "Presiona Enter cuando hayas configurado el Team..."
    echo ""
fi

# Limpiar builds anteriores
echo -e "${YELLOW}🧹 Limpiando builds anteriores...${NC}"
rm -rf "$IOS_DIR/build"
mkdir -p "$IOS_DIR/build"

cd "$IOS_DIR"

# Compilar y crear el archive
echo ""
echo -e "${BLUE}📦 Paso 2: Compilando y creando archive...${NC}"
echo "Esto puede tardar varios minutos..."
echo ""

xcodebuild archive \
    -workspace lecrepe-app.xcworkspace \
    -scheme lecrepe-app \
    -configuration Release \
    -archivePath "$ARCHIVE_PATH" \
    -allowProvisioningUpdates \
    CODE_SIGN_STYLE="Automatic" \
    || {
    echo ""
    echo -e "${RED}❌ Error al crear el archive${NC}"
    echo ""
    echo "Posibles soluciones:"
    echo "  1. Verifica que tienes configurado un Team en Xcode"
    echo "  2. Asegúrate de estar conectado a internet"
    echo "  3. Verifica que tu cuenta de Apple ID está activa"
    exit 1
}

# Verificar que el archive se creó
if [ ! -d "$ARCHIVE_PATH" ]; then
    echo -e "${RED}❌ Error: No se pudo crear el archive${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Archive creado exitosamente${NC}"

# Crear directorio de exportación
mkdir -p "$EXPORT_PATH"

# Exportar el .ipa
echo ""
echo -e "${BLUE}📤 Paso 3: Exportando .ipa...${NC}"
echo ""

xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist "$IOS_DIR/ExportOptions.plist" \
    -allowProvisioningUpdates \
    || {
    echo ""
    echo -e "${YELLOW}⚠️  Exportación con plist falló, intentando método alternativo...${NC}"
    echo ""
    
    xcodebuild -exportArchive \
        -archivePath "$ARCHIVE_PATH" \
        -exportPath "$EXPORT_PATH" \
        -exportMethod development \
        -allowProvisioningUpdates \
        || {
        echo ""
        echo -e "${RED}❌ Error al exportar el .ipa${NC}"
        exit 1
    }
}

# Buscar el .ipa generado
IPA_FILE=$(find "$EXPORT_PATH" -name "*.ipa" | head -1)

if [ -n "$IPA_FILE" ]; then
    echo ""
    echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ ¡.ipa generado exitosamente!${NC}"
    echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "📦 Archivo: ${BLUE}$IPA_FILE${NC}"
    IPA_SIZE=$(du -h "$IPA_FILE" | cut -f1)
    echo -e "📊 Tamaño: ${BLUE}$IPA_SIZE${NC}"
    echo ""
    
    # Abrir el directorio en Finder
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$EXPORT_PATH"
        echo -e "${GREEN}📂 Carpeta abierta en Finder${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}📱 Para instalar en tu iPhone:${NC}"
    echo "  1. Conecta tu iPhone por USB"
    echo "  2. Abre Xcode → Window → Devices and Simulators"
    echo "  3. Arrastra el archivo .ipa a la sección 'Installed Apps'"
    echo ""
    echo -e "${YELLOW}⚠️  Nota: El .ipa generado con método 'development' solo funciona${NC}"
    echo -e "${YELLOW}   en dispositivos registrados en tu cuenta de Apple Developer${NC}"
    echo ""
else
    echo -e "${RED}❌ Error: No se pudo encontrar el archivo .ipa generado${NC}"
    exit 1
fi

