# Lecrepe App

Aplicación React Native para gestión de órdenes y pedidos de Lecrepe, con funcionalidad de impresión de tickets a impresoras Bluetooth térmicas.

## 📍 Descripción

Aplicación móvil desarrollada en React Native para la gestión completa de órdenes, pedidos, cocina, ventas y reportes del restaurante Lecrepe. Incluye funcionalidad de impresión de tickets de órdenes a impresoras Bluetooth térmicas (58mm).

## ✨ Características

- ✅ Gestión completa de órdenes y pedidos
- ✅ Pantalla de cocina para seguimiento de órdenes
- ✅ Sistema de ventas y reportes
- ✅ Impresión de tickets a impresoras Bluetooth térmicas
- ✅ Configuración de impresora Bluetooth
- ✅ Funciona en Android e iOS
- ✅ Conexión Bluetooth directa (no requiere red WiFi)

## 🚀 Instalación y Uso

### 1. Instalar dependencias

```bash
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

### 4. Generar APK para Android

```bash
# APK de debug
./build-apk.sh debug

# APK de release
./build-apk.sh release
```

## 📱 Configuración de Impresora Bluetooth

1. Abre la aplicación en tu tablet/dispositivo Android
2. Ve a la pantalla de **Configuración**
3. Selecciona **Bluetooth** como tipo de conexión
4. Presiona **"Escanear Dispositivos"** para buscar impresoras Bluetooth emparejadas
5. Selecciona tu impresora Bluetooth (ej: Printer001)
6. La aplicación se conectará automáticamente
7. Presiona **"Impresión de Prueba"** para verificar la conexión

## 🔧 Requisitos

- Node.js 16+
- React Native CLI
- Android Studio (para Android) o Xcode (para iOS)
- Dispositivo Android/iOS con Bluetooth habilitado
- Impresora térmica Bluetooth (58mm) emparejada con el dispositivo

## 🐛 Solución de Problemas

### Error de conexión Bluetooth

- ✅ Verifica que Bluetooth esté activado en el dispositivo
- ✅ Verifica que la impresora esté encendida y en modo emparejamiento
- ✅ Asegúrate de que la impresora esté emparejada en la configuración de Bluetooth del dispositivo
- ✅ Verifica que la impresora no esté conectada a otro dispositivo
- ✅ Intenta desconectar y volver a conectar la impresora
- ✅ Reinicia la aplicación si la conexión falla

### La app no compila

- Ejecuta `npm install` de nuevo
- Para Android: `cd android && ./gradlew clean && cd ..`
- Para iOS: `cd ios && pod install && cd ..`

## 📝 Notas Técnicas

- La aplicación usa **Bluetooth Classic** para la conexión con impresoras térmicas
- Compatible con impresoras térmicas Bluetooth de **58mm** (formato estándar para tickets)
- Utiliza comandos **ESC/POS** para el formato de impresión
- La conexión Bluetooth se mantiene persistente entre pantallas
- Compatible con impresoras térmicas como Xprinter, Epson, Star Micronics, etc.

## 🔒 Seguridad

✅ **Ventajas de la conexión Bluetooth:**
- No requiere conexión a red WiFi
- Conexión directa y segura entre dispositivo e impresora
- No expone la impresora a la red local
- Funciona sin necesidad de configuración de red

## 📋 Funcionalidades Principales

- **Gestión de Órdenes**: Crear, editar y gestionar órdenes para llevar
- **Pantalla de Cocina**: Seguimiento de órdenes pendientes, listas y cerradas
- **Ventas**: Visualización de órdenes cerradas y reportes de ventas
- **Reportes**: Gráficas de ventas y productos más vendidos
- **Impresión**: Impresión de tickets de órdenes a impresoras Bluetooth térmicas
