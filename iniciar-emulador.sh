#!/bin/bash

# Script para iniciar el emulador de Android

echo "🔍 Buscando emuladores disponibles..."

# Buscar el ejecutable del emulador
if [ -f "$HOME/Library/Android/sdk/emulator/emulator" ]; then
    EMULATOR_PATH="$HOME/Library/Android/sdk/emulator/emulator"
elif [ -n "$ANDROID_HOME" ] && [ -f "$ANDROID_HOME/emulator/emulator" ]; then
    EMULATOR_PATH="$ANDROID_HOME/emulator/emulator"
else
    echo "❌ No se encontró el emulador de Android"
    echo "   Por favor verifica que Android SDK esté instalado"
    exit 1
fi

echo "✅ Emulador encontrado en: $EMULATOR_PATH"
echo ""

# Listar AVDs disponibles
echo "📱 Emuladores (AVDs) disponibles:"
echo "-----------------------------------"
"$EMULATOR_PATH" -list-avds

echo ""
echo "-----------------------------------"
echo ""

# Si hay AVDs, preguntar cuál iniciar
AVDS=$("$EMULATOR_PATH" -list-avds 2>/dev/null)

if [ -z "$AVDS" ]; then
    echo "❌ No hay emuladores (AVDs) configurados"
    echo ""
    echo "Para crear un emulador:"
    echo "1. Abre Android Studio"
    echo "2. Ve a Tools > Device Manager"
    echo "3. Click en 'Create Device'"
    echo "4. Selecciona un dispositivo y sigue las instrucciones"
    exit 1
fi

# Si se pasa un nombre como argumento, usarlo
if [ -n "$1" ]; then
    AVD_NAME="$1"
    echo "🚀 Iniciando emulador: $AVD_NAME"
    "$EMULATOR_PATH" -avd "$AVD_NAME" &
    echo "✅ Emulador iniciándose en segundo plano"
    echo "   Espera unos segundos a que arranque completamente"
else
    # Mostrar el primer AVD disponible
    FIRST_AVD=$(echo "$AVDS" | head -1)
    echo "🚀 Iniciando emulador: $FIRST_AVD"
    echo "   (Para iniciar otro, ejecuta: ./iniciar-emulador.sh <nombre_avd>)"
    "$EMULATOR_PATH" -avd "$FIRST_AVD" &
    echo "✅ Emulador iniciándose en segundo plano"
    echo "   Espera unos segundos a que arranque completamente"
fi

echo ""
echo "💡 Para verificar que el emulador está listo, ejecuta:"
echo "   adb devices"

