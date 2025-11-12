#!/bin/bash

# Script para generar un keystore para firmar el APK de producción
# Este keystore es necesario para publicar la app en Google Play Store

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

KEYSTORE_NAME="printerapp-release.keystore"
KEYSTORE_PATH="android/app/$KEYSTORE_NAME"

echo -e "${GREEN}🔐 Generando keystore para producción...${NC}"
echo ""

# Verificar si ya existe un keystore
if [ -f "$KEYSTORE_PATH" ]; then
    echo -e "${YELLOW}⚠️  Ya existe un keystore en: $KEYSTORE_PATH${NC}"
    read -p "¿Deseas sobrescribirlo? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo -e "${YELLOW}Operación cancelada.${NC}"
        exit 0
    fi
    rm -f "$KEYSTORE_PATH"
fi

echo -e "${YELLOW}Por favor, proporciona la siguiente información:${NC}"
echo ""

# Solicitar información para el keystore
read -p "Alias del keystore (ej: printerapp-key): " KEY_ALIAS
read -p "Contraseña del keystore (mínimo 6 caracteres): " -s KEYSTORE_PASSWORD
echo ""
read -p "Confirmar contraseña del keystore: " -s KEYSTORE_PASSWORD_CONFIRM
echo ""

if [ "$KEYSTORE_PASSWORD" != "$KEYSTORE_PASSWORD_CONFIRM" ]; then
    echo -e "${RED}❌ Las contraseñas no coinciden${NC}"
    exit 1
fi

if [ ${#KEYSTORE_PASSWORD} -lt 6 ]; then
    echo -e "${RED}❌ La contraseña debe tener al menos 6 caracteres${NC}"
    exit 1
fi

read -p "Contraseña de la clave (puede ser la misma): " -s KEY_PASSWORD
echo ""

if [ -z "$KEY_PASSWORD" ]; then
    KEY_PASSWORD=$KEYSTORE_PASSWORD
fi

read -p "Nombre completo (CN): " CN
read -p "Unidad organizacional (OU): " OU
read -p "Organización (O): " O
read -p "Ciudad (L): " L
read -p "Estado/Provincia (ST): " ST
read -p "Código de país (C, ej: MX): " C

# Valores por defecto si están vacíos
CN=${CN:-"PrinterApp"}
OU=${OU:-"Development"}
O=${O:-"Kokoro"}
L=${L:-"Ciudad"}
ST=${ST:-"Estado"}
C=${C:-"MX"}

echo ""
echo -e "${YELLOW}Generando keystore...${NC}"

# Generar el keystore
keytool -genkeypair -v \
    -storetype PKCS12 \
    -keystore "$KEYSTORE_PATH" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=$CN, OU=$OU, O=$O, L=$L, ST=$ST, C=$C"

if [ -f "$KEYSTORE_PATH" ]; then
    echo ""
    echo -e "${GREEN}✅ Keystore generado exitosamente!${NC}"
    echo -e "${GREEN}📁 Ubicación: $KEYSTORE_PATH${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANTE: Guarda esta información de forma segura:${NC}"
    echo -e "   Alias: $KEY_ALIAS"
    echo -e "   Contraseña del keystore: [la que ingresaste]"
    echo -e "   Contraseña de la clave: [la que ingresaste]"
    echo ""
    echo -e "${YELLOW}Ahora necesitas actualizar android/app/build.gradle con esta información.${NC}"
    echo -e "${YELLOW}Revisa INSTRUCCIONES_APK.md para más detalles.${NC}"
else
    echo -e "${RED}❌ Error al generar el keystore${NC}"
    exit 1
fi

