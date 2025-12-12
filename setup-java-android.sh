#!/bin/bash

# Script para configurar Java desde Android Studio y ejecutar la app

echo "🔧 Configurando Java desde Android Studio..."

# Buscar el JDK de Android Studio
if [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
    JAVA_HOME_PATH="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
elif [ -d "/Applications/Android Studio.app/Contents/jre/Contents/Home" ]; then
    JAVA_HOME_PATH="/Applications/Android Studio.app/Contents/jre/Contents/Home"
else
    echo "❌ No se encontró el JDK de Android Studio"
    echo "   Por favor verifica que Android Studio esté instalado en /Applications/"
    exit 1
fi

echo "✅ JDK encontrado en: $JAVA_HOME_PATH"

# Configurar variables de entorno para esta sesión
export JAVA_HOME="$JAVA_HOME_PATH"
export PATH="$JAVA_HOME/bin:$PATH"

# Verificar que Java funciona
echo "📋 Verificando Java..."
java -version

# Agregar a .zshrc si no está ya configurado
if ! grep -q "JAVA_HOME.*Android Studio" ~/.zshrc 2>/dev/null; then
    echo "" >> ~/.zshrc
    echo "# Java Home para Android Studio" >> ~/.zshrc
    echo "export JAVA_HOME=\"$JAVA_HOME_PATH\"" >> ~/.zshrc
    echo "export PATH=\"\$JAVA_HOME/bin:\$PATH\"" >> ~/.zshrc
    echo "✅ JAVA_HOME agregado a ~/.zshrc"
else
    echo "✅ JAVA_HOME ya está configurado en ~/.zshrc"
fi

# Ir al directorio del proyecto
cd "$(dirname "$0")"

# Verificar que el emulador esté corriendo
echo "📱 Verificando emulador Android..."
if ! adb devices | grep -q "device$"; then
    echo "⚠️  No hay dispositivos Android conectados"
    echo "   Por favor inicia un emulador o conecta un dispositivo"
    exit 1
fi

echo "✅ Dispositivo Android encontrado"
adb devices

# Iniciar Metro bundler si no está corriendo
if ! pgrep -f "react-native.*start" > /dev/null; then
    echo "📦 Iniciando Metro bundler..."
    npm start > /tmp/metro.log 2>&1 &
    sleep 3
fi

# Ejecutar la aplicación
echo "🚀 Ejecutando aplicación Android..."
npx react-native run-android

