#!/bin/bash

# Script para instalar y ejecutar la aplicación Android

set -e

echo "========================================="
echo "🚀 INSTALANDO Y EJECUTANDO APLICACIÓN"
echo "========================================="
echo ""

# Configurar Java
if [ -d "/Applications/Android Studio.app/Contents/jbr" ]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
elif [ -d "/Applications/Android Studio.app/Contents/jre" ]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jre/Contents/Home"
fi

export PATH="$JAVA_HOME/bin:$PATH"

echo "✅ Java configurado"
echo ""

# Verificar emulador
echo "📱 Verificando emulador..."
if ! adb devices | grep -q "device$"; then
    echo "❌ No hay emulador conectado"
    echo "   Por favor inicia un emulador primero"
    exit 1
fi

echo "✅ Emulador conectado:"
adb devices | grep "device$"
echo ""

# Ir al proyecto
cd "$(dirname "$0")"

# Iniciar Metro si no está corriendo
if ! pgrep -f "react-native.*start" > /dev/null; then
    echo "📦 Iniciando Metro bundler..."
    npm start > /tmp/metro.log 2>&1 &
    sleep 5
    echo "✅ Metro bundler iniciado"
else
    echo "✅ Metro bundler ya está corriendo"
fi

echo ""
echo "🔨 Compilando e instalando aplicación..."
echo "   Esto puede tomar varios minutos..."
echo ""

# Ejecutar aplicación
npx react-native run-android

echo ""
echo "✅ Proceso completado"
echo ""
echo "Si la aplicación no se abrió automáticamente, ejecuta:"
echo "  adb shell am start -n com.lecrepeapp/.MainActivity"

