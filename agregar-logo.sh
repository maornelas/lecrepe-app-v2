#!/bin/bash

# Script para agregar el logo de Kokoro como icono de la app

echo "📱 Agregando logo de Kokoro como icono de la app..."
echo ""

# Directorio de iconos
ICON_DIR="ios/lecrepe-app/Images.xcassets/AppIcon.appiconset"

# Verificar si existe el archivo del logo
if [ ! -f "logo-kokoro.png" ] && [ ! -f "logo-kokoro.jpg" ]; then
    echo "⚠️  No se encontró el archivo del logo."
    echo ""
    echo "Por favor:"
    echo "1. Guarda el logo como 'logo-kokoro.png' o 'logo-kokoro.jpg' en la raíz del proyecto"
    echo "2. El logo debe ser de al menos 1024x1024 píxeles"
    echo "3. Ejecuta este script nuevamente"
    echo ""
    echo "O usa una herramienta online como https://www.appicon.co para generar los tamaños"
    exit 1
fi

# Determinar el formato
LOGO_FILE=""
if [ -f "logo-kokoro.png" ]; then
    LOGO_FILE="logo-kokoro.png"
elif [ -f "logo-kokoro.jpg" ]; then
    LOGO_FILE="logo-kokoro.jpg"
fi

echo "✅ Logo encontrado: $LOGO_FILE"
echo ""
echo "Para agregar el logo como icono:"
echo "1. Abre Xcode"
echo "2. Navega a: ios/lecrepe-app/Images.xcassets/AppIcon.appiconset"
echo "3. Arrastra el logo a cada tamaño requerido"
echo ""
echo "O usa una herramienta online para generar todos los tamaños:"
echo "https://www.appicon.co"
echo ""

