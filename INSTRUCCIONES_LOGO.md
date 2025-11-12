# Instrucciones para Agregar el Logo de Kokoro

## 1. Agregar el Logo como Icono de la App

### Para iOS:

1. **Preparar las imágenes del logo:**
   - Necesitas el logo en los siguientes tamaños:
     - 20x20 @2x (40x40px)
     - 20x20 @3x (60x60px)
     - 29x29 @2x (58x58px)
     - 29x29 @3x (87x87px)
     - 40x40 @2x (80x80px)
     - 40x40 @3x (120x120px)
     - 60x60 @2x (120x120px)
     - 60x60 @3x (180x180px)
     - 1024x1024 (App Store)

2. **Agregar las imágenes:**
   - Abre Xcode
   - Navega a `ios/PrinterApp/Images.xcassets/AppIcon.appiconset/`
   - Arrastra cada imagen al tamaño correspondiente en Xcode
   - O copia los archivos directamente y actualiza el `Contents.json`

### Alternativa rápida:
- Puedes usar una herramienta online como [AppIcon.co](https://www.appicon.co) para generar todos los tamaños desde una imagen de 1024x1024

## 2. Agregar el Logo a la Impresión

El logo se agregará automáticamente en la parte superior del ticket de prueba usando comandos ESC/POS.

Si necesitas ajustar el logo en la impresión, puedes modificar la función `handleTestPrint` en `App.tsx`.

