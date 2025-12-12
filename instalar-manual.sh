#!/bin/bash

# Script para compilar e instalar manualmente la aplicación

set -e

echo "========================================="
echo "🔨 COMPILANDO E INSTALANDO APLICACIÓN"
echo "========================================="
echo ""

# Configurar Java
if [ -d "/Applications/Android Studio.app/Contents/jbr" ]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
elif [ -d "/Applications/Android Studio.app/Contents/jre" ]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jre/Contents/Home"
fi

export PATH="$JAVA_HOME/bin:$PATH"

echo "✅ Java configurado: $JAVA_HOME"
echo ""

# Verificar emulador
echo "📱 Verificando emulador..."
if ! adb devices | grep -q "device$"; then
    echo "❌ No hay emulador conectado"
    exit 1
fi
echo "✅ Emulador conectado"
echo ""

# Ir al directorio android
cd "$(dirname "$0")/android"

echo "🧹 Limpiando proyecto anterior..."
./gradlew clean

echo ""
echo "🔨 Compilando aplicación (esto puede tardar varios minutos)..."
./gradlew assembleDebug

echo ""
echo "📦 Instalando aplicación en el emulador..."
./gradlew installDebug

echo ""
echo "🚀 Iniciando aplicación..."
adb shell am start -n com.lecrepeapp/.MainActivity

echo ""
echo "✅ ¡Proceso completado!"
echo ""
echo "La aplicación debería estar visible en el emulador."

