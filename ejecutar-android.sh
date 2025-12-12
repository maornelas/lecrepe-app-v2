#!/bin/bash

# Script simple para ejecutar Android con salida visible

# Configurar Java
if [ -d "/Applications/Android Studio.app/Contents/jbr" ]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
elif [ -d "/Applications/Android Studio.app/Contents/jre" ]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jre/Contents/Home"
fi

export PATH="$JAVA_HOME/bin:$PATH"

echo "========================================="
echo "🚀 EJECUTANDO APLICACIÓN ANDROID"
echo "========================================="
echo ""
echo "Java:"
java -version
echo ""
echo "Dispositivos Android:"
adb devices
echo ""
echo "Iniciando Metro bundler..."
cd "$(dirname "$0")"
npm start &
METRO_PID=$!
echo "Metro PID: $METRO_PID"
sleep 5
echo ""
echo "Ejecutando aplicación..."
echo "========================================="
npx react-native run-android
echo "========================================="
echo "Proceso completado"

