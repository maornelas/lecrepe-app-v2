#!/bin/bash

# Script para agregar el logo de Le Crêpe a la aplicación
# Uso: ./agregar-logo-lecrepe.sh [ruta-al-logo.png]

set -e

LOGO_SOURCE="$1"
IOS_DIR="ios/lecrepe-app"
ANDROID_DIR="android/app/src/main/res"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Agregando logo de Le Crêpe a la aplicación...${NC}"

# Verificar que se proporcionó el archivo del logo
if [ -z "$LOGO_SOURCE" ]; then
    echo -e "${RED}❌ Error: Debes proporcionar la ruta al archivo del logo${NC}"
    echo "Uso: ./agregar-logo-lecrepe.sh [ruta-al-logo.png]"
    exit 1
fi

# Verificar que el archivo existe
if [ ! -f "$LOGO_SOURCE" ]; then
    echo -e "${RED}❌ Error: El archivo no existe: $LOGO_SOURCE${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Paso 1: Copiando logo para impresión (iOS)...${NC}"
# Copiar logo para iOS (impresión)
cp "$LOGO_SOURCE" "$IOS_DIR/logo-lecrepe.png"
echo -e "${GREEN}✅ Logo copiado a $IOS_DIR/logo-lecrepe.png${NC}"

echo -e "${YELLOW}📋 Paso 2: Verificando si ImageMagick está instalado para generar iconos...${NC}"
# Verificar si ImageMagick está instalado
if command -v convert &> /dev/null; then
    echo -e "${GREEN}✅ ImageMagick encontrado${NC}"
    
    echo -e "${YELLOW}📋 Paso 3: Generando iconos para Android...${NC}"
    # Generar iconos para Android
    # mipmap-mdpi: 48x48
    convert "$LOGO_SOURCE" -resize 48x48 "$ANDROID_DIR/mipmap-mdpi/ic_launcher.png"
    convert "$LOGO_SOURCE" -resize 48x48 "$ANDROID_DIR/mipmap-mdpi/ic_launcher_round.png"
    
    # mipmap-hdpi: 72x72
    convert "$LOGO_SOURCE" -resize 72x72 "$ANDROID_DIR/mipmap-hdpi/ic_launcher.png"
    convert "$LOGO_SOURCE" -resize 72x72 "$ANDROID_DIR/mipmap-hdpi/ic_launcher_round.png"
    
    # mipmap-xhdpi: 96x96
    convert "$LOGO_SOURCE" -resize 96x96 "$ANDROID_DIR/mipmap-xhdpi/ic_launcher.png"
    convert "$LOGO_SOURCE" -resize 96x96 "$ANDROID_DIR/mipmap-xhdpi/ic_launcher_round.png"
    
    # mipmap-xxhdpi: 144x144
    convert "$LOGO_SOURCE" -resize 144x144 "$ANDROID_DIR/mipmap-xxhdpi/ic_launcher.png"
    convert "$LOGO_SOURCE" -resize 144x144 "$ANDROID_DIR/mipmap-xxhdpi/ic_launcher_round.png"
    
    # mipmap-xxxhdpi: 192x192
    convert "$LOGO_SOURCE" -resize 192x192 "$ANDROID_DIR/mipmap-xxxhdpi/ic_launcher.png"
    convert "$LOGO_SOURCE" -resize 192x192 "$ANDROID_DIR/mipmap-xxxhdpi/ic_launcher_round.png"
    
    echo -e "${GREEN}✅ Iconos de Android generados${NC}"
    
    echo -e "${YELLOW}📋 Paso 4: Generando iconos para iOS...${NC}"
    # Generar iconos para iOS
    IOS_ICONS_DIR="$IOS_DIR/Images.xcassets/AppIcon.appiconset"
    
    # icon-20@2x: 40x40
    convert "$LOGO_SOURCE" -resize 40x40 "$IOS_ICONS_DIR/icon-20@2x.png"
    
    # icon-20@3x: 60x60
    convert "$LOGO_SOURCE" -resize 60x60 "$IOS_ICONS_DIR/icon-20@3x.png"
    
    # icon-29@2x: 58x58
    convert "$LOGO_SOURCE" -resize 58x58 "$IOS_ICONS_DIR/icon-29@2x.png"
    
    # icon-29@3x: 87x87
    convert "$LOGO_SOURCE" -resize 87x87 "$IOS_ICONS_DIR/icon-29@3x.png"
    
    # icon-40@2x: 80x80
    convert "$LOGO_SOURCE" -resize 80x80 "$IOS_ICONS_DIR/icon-40@2x.png"
    
    # icon-40@3x: 120x120
    convert "$LOGO_SOURCE" -resize 120x120 "$IOS_ICONS_DIR/icon-40@3x.png"
    
    # icon-60@2x: 120x120
    convert "$LOGO_SOURCE" -resize 120x120 "$IOS_ICONS_DIR/icon-60@2x.png"
    
    # icon-60@3x: 180x180
    convert "$LOGO_SOURCE" -resize 180x180 "$IOS_ICONS_DIR/icon-60@3x.png"
    
    # icon-1024: 1024x1024
    convert "$LOGO_SOURCE" -resize 1024x1024 "$IOS_ICONS_DIR/icon-1024.png"
    
    echo -e "${GREEN}✅ Iconos de iOS generados${NC}"
    
else
    echo -e "${YELLOW}⚠️  ImageMagick no está instalado.${NC}"
    echo -e "${YELLOW}   Para generar los iconos automáticamente, instala ImageMagick:${NC}"
    echo -e "${YELLOW}   macOS: brew install imagemagick${NC}"
    echo -e "${YELLOW}   Linux: sudo apt-get install imagemagick${NC}"
    echo ""
    echo -e "${YELLOW}   O puedes generar los iconos manualmente:${NC}"
    echo -e "${YELLOW}   - Android: Reemplaza los archivos en $ANDROID_DIR/mipmap-*/${NC}"
    echo -e "${YELLOW}   - iOS: Reemplaza los archivos en $IOS_DIR/Images.xcassets/AppIcon.appiconset/${NC}"
fi

echo ""
echo -e "${GREEN}✅ ¡Logo agregado exitosamente!${NC}"
echo ""
echo -e "${YELLOW}📝 Notas importantes:${NC}"
echo -e "${YELLOW}   1. El logo para impresión está en: $IOS_DIR/logo-lecrepe.png${NC}"
echo -e "${YELLOW}   2. Asegúrate de que el logo esté incluido en el bundle de iOS${NC}"
echo -e "${YELLOW}   3. Para iOS, verifica que logo-lecrepe.png esté agregado en Xcode${NC}"
echo ""


