#!/bin/bash
set -e

cd "$(dirname "$0")"
cd android

echo "Limpiando proyecto..."
./gradlew clean

echo "Generando APK en modo release..."
./gradlew assembleRelease --no-daemon

echo ""
echo "✅ Build completado!"
echo ""
echo "APK generado en:"
find app/build/outputs/apk/release -name "*.apk" -type f 2>/dev/null | head -1

