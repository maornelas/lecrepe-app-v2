#!/bin/bash

# Script automático para ejecutar Android con Java de Android Studio

set -e

echo "🚀 Iniciando configuración automática..."

# Detectar JDK de Android Studio
if [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
    JAVA_HOME_PATH="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
    echo "✅ JDK encontrado en: $JAVA_HOME_PATH"
elif [ -d "/Applications/Android Studio.app/Contents/jre/Contents/Home" ]; then
    JAVA_HOME_PATH="/Applications/Android Studio.app/Contents/jre/Contents/Home"
    echo "✅ JDK encontrado en: $JAVA_HOME_PATH"
else
    echo "❌ No se encontró JDK de Android Studio"
    exit 1
fi

# Configurar variables de entorno
export JAVA_HOME="$JAVA_HOME_PATH"
export PATH="$JAVA_HOME/bin:$PATH"

# Verificar Java
echo "📋 Verificando Java..."
java -version

# Configurar .zshrc si no está configurado
if ! grep -q "JAVA_HOME.*Android Studio" ~/.zshrc 2>/dev/null; then
    echo "" >> ~/.zshrc
    echo "# Java Home para Android Studio" >> ~/.zshrc
    echo "export JAVA_HOME=\"$JAVA_HOME_PATH\"" >> ~/.zshrc
    echo "export PATH=\"\$JAVA_HOME/bin:\$PATH\"" >> ~/.zshrc
    echo "✅ JAVA_HOME configurado en ~/.zshrc"
fi

# Ir al proyecto
cd "$(dirname "$0")"
echo "📁 Directorio: $(pwd)"

# Verificar emulador
echo "📱 Verificando emulador..."
if adb devices | grep -q "device$"; then
    echo "✅ Emulador conectado:"
    adb devices | grep "device$"
else
    echo "⚠️  No hay emulador conectado. Esperando..."
    sleep 5
    if adb devices | grep -q "device$"; then
        echo "✅ Emulador encontrado"
    else
        echo "❌ Por favor inicia un emulador"
        exit 1
    fi
fi

# Iniciar Metro si no está corriendo
if ! pgrep -f "react-native.*start" > /dev/null; then
    echo "📦 Iniciando Metro bundler..."
    npm start > /tmp/metro-android.log 2>&1 &
    METRO_PID=$!
    echo "   Metro iniciado (PID: $METRO_PID)"
    sleep 5
else
    echo "✅ Metro bundler ya está corriendo"
fi

# Ejecutar aplicación
echo "🔨 Compilando e instalando aplicación..."
echo "   Esto puede tomar varios minutos..."
npx react-native run-android

echo "✅ ¡Proceso completado!"

