#!/bin/bash

# Script para generar el archivo .ipa de la aplicación

set -e

echo "🚀 Iniciando proceso de generación del .ipa..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directorios
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_DIR="$PROJECT_DIR/ios"
ARCHIVE_PATH="$IOS_DIR/build/lecrepe-app.xcarchive"
EXPORT_PATH="$IOS_DIR/build/export"
IPA_PATH="$EXPORT_PATH/lecrepe-app.ipa"

# Limpiar builds anteriores (pero mantener archivos generados)
echo -e "${YELLOW}🧹 Limpiando builds anteriores...${NC}"
# No eliminar ios/build/generated ya que contiene archivos generados por Codegen
if [ -d "$IOS_DIR/build" ]; then
    find "$IOS_DIR/build" -mindepth 1 -maxdepth 1 ! -name "generated" -exec rm -rf {} +
else
    mkdir -p "$IOS_DIR/build"
fi

# Navegar al directorio iOS
cd "$IOS_DIR"

# Verificar que el workspace existe
if [ ! -f "lecrepe-app.xcworkspace/contents.xcworkspacedata" ]; then
    echo -e "${RED}❌ Error: No se encontró el workspace de Xcode${NC}"
    exit 1
fi

# Compilar y crear el archive
echo -e "${YELLOW}📦 Compilando y creando archive...${NC}"
if command -v xcpretty &> /dev/null; then
    xcodebuild archive \
        -workspace lecrepe-app.xcworkspace \
        -scheme lecrepe-app \
        -configuration Release \
        -archivePath "$ARCHIVE_PATH" \
        -allowProvisioningUpdates \
        CODE_SIGN_STYLE="Automatic" \
        | xcpretty || exit 1
else
    xcodebuild archive \
        -workspace lecrepe-app.xcworkspace \
        -scheme lecrepe-app \
        -configuration Release \
        -archivePath "$ARCHIVE_PATH" \
        -allowProvisioningUpdates \
        CODE_SIGN_STYLE="Automatic" || exit 1
fi

# Verificar que el archive se creó
if [ ! -d "$ARCHIVE_PATH" ]; then
    echo -e "${RED}❌ Error: No se pudo crear el archive${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Archive creado exitosamente${NC}"

# Crear directorio de exportación
mkdir -p "$EXPORT_PATH"

# Exportar el .ipa
echo -e "${YELLOW}📤 Exportando .ipa...${NC}"

# Intentar exportar con diferentes métodos
EXPORT_OPTIONS="$IOS_DIR/ExportOptions.plist"

# Si el archivo ExportOptions.plist existe, usarlo
if [ -f "$EXPORT_OPTIONS" ]; then
    if command -v xcpretty &> /dev/null; then
        xcodebuild -exportArchive \
            -archivePath "$ARCHIVE_PATH" \
            -exportPath "$EXPORT_PATH" \
            -exportOptionsPlist "$EXPORT_OPTIONS" \
            -allowProvisioningUpdates \
            | xcpretty || {
            echo -e "${YELLOW}⚠️  Exportación con plist falló, intentando método alternativo...${NC}"
            
            # Método alternativo: exportar sin plist (para desarrollo)
            xcodebuild -exportArchive \
                -archivePath "$ARCHIVE_PATH" \
                -exportPath "$EXPORT_PATH" \
                -exportMethod development \
                -allowProvisioningUpdates \
                | xcpretty || exit 1
        }
    else
        xcodebuild -exportArchive \
            -archivePath "$ARCHIVE_PATH" \
            -exportPath "$EXPORT_PATH" \
            -exportOptionsPlist "$EXPORT_OPTIONS" \
            -allowProvisioningUpdates || {
            echo -e "${YELLOW}⚠️  Exportación con plist falló, intentando método alternativo...${NC}"
            
            # Método alternativo: exportar sin plist (para desarrollo)
            xcodebuild -exportArchive \
                -archivePath "$ARCHIVE_PATH" \
                -exportPath "$EXPORT_PATH" \
                -exportMethod development \
                -allowProvisioningUpdates || exit 1
        }
    fi
else
    # Exportar sin plist (método development)
    if command -v xcpretty &> /dev/null; then
        xcodebuild -exportArchive \
            -archivePath "$ARCHIVE_PATH" \
            -exportPath "$EXPORT_PATH" \
            -exportMethod development \
            -allowProvisioningUpdates \
            | xcpretty || exit 1
    else
        xcodebuild -exportArchive \
            -archivePath "$ARCHIVE_PATH" \
            -exportPath "$EXPORT_PATH" \
            -exportMethod development \
            -allowProvisioningUpdates || exit 1
    fi
fi

# Verificar que el .ipa se creó
if [ -f "$IPA_PATH" ]; then
    echo -e "${GREEN}✅ .ipa generado exitosamente en:${NC}"
    echo -e "${GREEN}   $IPA_PATH${NC}"
    
    # Mostrar información del archivo
    IPA_SIZE=$(du -h "$IPA_PATH" | cut -f1)
    echo -e "${GREEN}   Tamaño: $IPA_SIZE${NC}"
    
    # Abrir el directorio en Finder (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$EXPORT_PATH"
    fi
else
    # Buscar el .ipa en el directorio de exportación
    FOUND_IPA=$(find "$EXPORT_PATH" -name "*.ipa" | head -1)
    if [ -n "$FOUND_IPA" ]; then
        echo -e "${GREEN}✅ .ipa generado exitosamente en:${NC}"
        echo -e "${GREEN}   $FOUND_IPA${NC}"
        IPA_SIZE=$(du -h "$FOUND_IPA" | cut -f1)
        echo -e "${GREEN}   Tamaño: $IPA_SIZE${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "$EXPORT_PATH"
        fi
    else
        echo -e "${RED}❌ Error: No se pudo encontrar el archivo .ipa generado${NC}"
        echo -e "${YELLOW}   Revisa los logs anteriores para más detalles${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}🎉 ¡Proceso completado!${NC}"

