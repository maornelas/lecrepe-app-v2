#!/bin/bash

# Script para agregar logo-kokoro.png al proyecto de Xcode

PROJECT_DIR="ios/lecrepe-app"
LOGO_FILE="logo-kokoro.png"
PROJECT_FILE="ios/lecrepe-app.xcodeproj/project.pbxproj"

echo "📱 Agregando logo al proyecto de Xcode..."

# Verificar que el logo existe
if [ ! -f "$LOGO_FILE" ]; then
    echo "❌ Error: No se encontró $LOGO_FILE en la raíz del proyecto"
    exit 1
fi

# Copiar el logo a la carpeta del proyecto iOS
echo "📋 Copiando logo a $PROJECT_DIR..."
cp "$LOGO_FILE" "$PROJECT_DIR/$LOGO_FILE"

# Generar un UUID único para el archivo
FILE_UUID=$(uuidgen | tr '[:lower:]' '[:upper:]' | tr -d '\n')
REF_UUID=$(uuidgen | tr '[:lower:]' '[:upper:]' | tr -d '\n')

echo "🔧 Agregando referencias al proyecto..."

# Leer el project.pbxproj
if [ ! -f "$PROJECT_FILE" ]; then
    echo "❌ Error: No se encontró $PROJECT_FILE"
    exit 1
fi

# Crear backup
cp "$PROJECT_FILE" "$PROJECT_FILE.backup"

# Buscar la sección PBXFileReference y agregar el logo
# Buscar la sección PBXBuildFile y agregar el logo
# Buscar la sección PBXResourcesBuildPhase y agregar el logo

# Nota: Modificar project.pbxproj manualmente es complejo y propenso a errores
# Es mejor hacerlo manualmente en Xcode o usar una herramienta como xcodeproj gem

echo "✅ Logo copiado a $PROJECT_DIR/$LOGO_FILE"
echo ""
echo "⚠️  IMPORTANTE: Necesitas agregar el logo manualmente en Xcode:"
echo "   1. Abre Xcode"
echo "   2. Abre el proyecto: ios/lecrepe-app.xcworkspace"
echo "   3. En el navegador de archivos (izquierda), haz clic derecho en la carpeta 'lecrepe-app'"
echo "   4. Selecciona 'Add Files to lecrepe-app...'"
echo "   5. Selecciona: $PROJECT_DIR/$LOGO_FILE"
echo "   6. Asegúrate de que 'Copy items if needed' esté marcado"
echo "   7. Asegúrate de que 'Add to targets: lecrepe-app' esté marcado"
echo "   8. Haz clic en 'Add'"
echo ""
echo "O ejecuta este comando para intentar agregarlo automáticamente (experimental):"
echo "   ruby -e \"require 'xcodeproj'; project = Xcodeproj::Project.open('$PROJECT_FILE'); target = project.targets.first; file_ref = project.main_group.find_subpath('lecrepe-app').new_file('$LOGO_FILE'); target.add_file_references([file_ref]); project.save\""

