#!/bin/bash

# Script para ejecutar la aplicación en Android
# Uso: ./run-android.sh

set -e

echo "🚀 Iniciando aplicación Android..."

# Ir al directorio del proyecto
cd "$(dirname "$0")"

# Verificar que adb esté disponible
if ! command -v adb &> /dev/null; then
    echo "❌ Error: adb no encontrado. Asegúrate de que Android SDK esté instalado."
    exit 1
fi

# Verificar dispositivos conectados
echo "📱 Verificando dispositivos Android..."
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l | tr -d ' ')

if [ "$DEVICES" -eq "0" ]; then
    echo "⚠️  No hay dispositivos Android conectados."
    echo "   Por favor inicia un emulador o conecta un dispositivo físico."
    exit 1
fi

echo "✅ Dispositivo(s) encontrado(s):"
adb devices

# Verificar que local.properties existe
if [ ! -f "android/local.properties" ]; then
    echo "📝 Creando android/local.properties..."
    if [ -d "$HOME/Library/Android/sdk" ]; then
        echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
        echo "✅ local.properties creado"
    else
        echo "❌ Error: Android SDK no encontrado en $HOME/Library/Android/sdk"
        echo "   Por favor configura la ruta del SDK en android/local.properties"
        exit 1
    fi
fi

# Iniciar Metro bundler en segundo plano si no está corriendo
if ! pgrep -f "react-native.*start" > /dev/null; then
    echo "📦 Iniciando Metro bundler..."
    npm start > /tmp/metro-android.log 2>&1 &
    METRO_PID=$!
    echo "   Metro bundler iniciado (PID: $METRO_PID)"
    sleep 3
else
    echo "✅ Metro bundler ya está corriendo"
fi

# Ejecutar la aplicación
echo "🔨 Compilando e instalando aplicación..."
npx react-native run-android

echo "✅ ¡Aplicación ejecutada!"

