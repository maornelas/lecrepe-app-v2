#!/bin/bash

# Script con salida detallada para debug

LOG_FILE="/tmp/android-debug-$(date +%s).log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "========================================="
echo "INICIO: $(date)"
echo "========================================="

# Configurar Java
if [ -d "/Applications/Android Studio.app/Contents/jbr" ]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
    echo "✅ JAVA_HOME configurado desde jbr: $JAVA_HOME"
elif [ -d "/Applications/Android Studio.app/Contents/jre" ]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jre/Contents/Home"
    echo "✅ JAVA_HOME configurado desde jre: $JAVA_HOME"
else
    echo "❌ ERROR: No se encontró JDK de Android Studio"
    exit 1
fi

export PATH="$JAVA_HOME/bin:$PATH"

echo ""
echo "Java version:"
java -version

echo ""
echo "Verificando dispositivos Android:"
adb devices

echo ""
echo "Verificando que el emulador esté listo..."
adb wait-for-device
echo "✅ Emulador listo"

cd "$(dirname "$0")"
echo ""
echo "Directorio actual: $(pwd)"
echo ""

# Iniciar Metro
echo "Iniciando Metro bundler..."
npm start > /tmp/metro.log 2>&1 &
METRO_PID=$!
echo "Metro PID: $METRO_PID"
sleep 5

# Ejecutar aplicación
echo ""
echo "========================================="
echo "EJECUTANDO: npx react-native run-android"
echo "========================================="
echo ""

npx react-native run-android

echo ""
echo "========================================="
echo "FIN: $(date)"
echo "Log guardado en: $LOG_FILE"
echo "========================================="

