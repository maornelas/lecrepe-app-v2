# Aplicación de Impresión Local

Aplicación React Native simple para imprimir desde tablets a impresoras en la misma red local.

## 📍 Ubicación del Proyecto

El proyecto está ubicado en: **`/Users/maornelas/PrinterApp`**

## ✨ Características

- ✅ Una sola pantalla con botón de imprimir
- ✅ Configuración de IP y puerto de la impresora
- ✅ Funciona en Android e iOS
- ✅ Conexión directa en red local (más seguro, no expone la red)

## 🚀 Instalación y Uso

### 1. Instalar dependencias

```bash
cd /Users/maornelas/PrinterApp
npm install
```

### 2. Para Android

```bash
# Asegúrate de tener un emulador Android corriendo o un dispositivo conectado
npm run android
```

### 3. Para iOS

```bash
cd ios
pod install
cd ..
npm run ios
```

## 📱 Configuración en la App

1. Abre la aplicación en tu tablet
2. Ingresa la **IP de la impresora**: `192.168.1.26`
3. Ingresa el **puerto**: `9100`
4. **Asegúrate de que la tablet esté en la misma red WiFi que la impresora**
5. Presiona el botón **"Imprimir"**

## 🔧 Requisitos

- Node.js 16+
- React Native CLI
- Android Studio (para Android) o Xcode (para iOS)
- Tablet conectada a la misma red WiFi que la impresora

## 🐛 Solución de Problemas

### Error de conexión

- ✅ Verifica que la tablet esté en la misma red WiFi
- ✅ Verifica que la IP sea correcta (`192.168.1.26`)
- ✅ Verifica que el puerto sea correcto (`9100`)
- ✅ Asegúrate de que la impresora esté encendida
- ✅ Prueba hacer ping a la impresora desde la tablet

### La app no compila

- Ejecuta `npm install` de nuevo
- Para Android: `cd android && ./gradlew clean && cd ..`
- Para iOS: `cd ios && pod install && cd ..`

## 🔒 Seguridad

✅ **Ventajas de esta solución:**
- No expone tu red a internet
- No requiere DMZ o Port Forwarding
- Conexión directa en red local
- Más seguro que exponer la impresora públicamente

## 📝 Notas Técnicas

- La aplicación usa el protocolo RAW (puerto 9100) que es el estándar para impresoras de red
- Funciona con impresoras que soporten el puerto RAW TCP
- Compatible con impresoras térmicas y de inyección de tinta
