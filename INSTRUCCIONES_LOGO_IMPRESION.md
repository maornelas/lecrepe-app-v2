# Instrucciones para Agregar el Logo y Solucionar la Impresión

## 📋 Paso 1: Agregar el Logo al Proyecto de Xcode

El logo **DEBE** estar incluido en el bundle de la app para que el módulo nativo pueda encontrarlo.

### Opción A: Manualmente en Xcode (Recomendado)

1. Abre Xcode:
   ```bash
   open ios/PrinterApp.xcworkspace
   ```

2. En el navegador de archivos (panel izquierdo), localiza la carpeta `PrinterApp`

3. Haz clic derecho en la carpeta `PrinterApp` y selecciona **"Add Files to PrinterApp..."**

4. Navega y selecciona: `ios/PrinterApp/logo-kokoro.png`

5. **IMPORTANTE**: Asegúrate de que estas opciones estén marcadas:
   - ✅ **"Copy items if needed"**
   - ✅ **"Add to targets: PrinterApp"**

6. Haz clic en **"Add"**

7. Verifica que el archivo aparezca en el proyecto (debería estar listado en el navegador de archivos)

### Opción B: Usar el Script Automático

```bash
cd /Users/maornelas/PrinterApp
./agregar-logo-xcode.sh
```

Luego sigue las instrucciones que aparecen en pantalla.

## 🔍 Paso 2: Verificar que el Logo Está en el Bundle

Después de agregar el logo, verifica que esté correctamente incluido:

1. En Xcode, selecciona el archivo `logo-kokoro.png` en el navegador
2. En el panel derecho (File Inspector), verifica que:
   - **Target Membership**: `PrinterApp` esté marcado ✅
   - El archivo aparezca en **Build Phases > Copy Bundle Resources**

## 🐛 Paso 3: Solución de Problemas

### El logo no se imprime

1. **Verifica los logs de la consola**:
   - Abre la consola de Xcode (View > Debug Area > Activate Console)
   - Busca mensajes que empiecen con "✅" o "ERROR:"
   - Deberías ver:
     - `✅ Imagen cargada exitosamente`
     - `✅ Imagen redimensionada`
     - `✅ Comandos ESC/POS generados`
     - `✅ Base64 generado`

2. **Si ves "ERROR: No se pudo cargar la imagen"**:
   - El logo no está en el bundle
   - Sigue el Paso 1 nuevamente
   - Asegúrate de que el archivo esté marcado en "Target Membership"

3. **Si el logo se carga pero no se imprime**:
   - Verifica la conexión con la impresora
   - Revisa que la IP y puerto sean correctos
   - Verifica que la impresora soporte comandos ESC/POS `GS v 0`

4. **Recompilar la app**:
   ```bash
   cd /Users/maornelas/PrinterApp
   npx react-native run-ios --simulator="iPhone 17 Pro"
   ```

## 📝 Notas Técnicas

- El módulo nativo busca el logo en este orden:
  1. `Bundle.main.path(forResource: "logo-kokoro", ofType: "png")`
  2. Ruta proporcionada (si no está vacía)
  3. `UIImage(named: "logo-kokoro")`

- El logo se redimensiona automáticamente a 384 píxeles de ancho (para impresora 80mm)

- La conversión a bitmap usa un umbral de 128 (píxeles más oscuros que 128 se convierten a negro)

## ✅ Verificación Final

Después de agregar el logo y recompilar:

1. Abre la app en el simulador
2. Ve a Settings
3. Presiona "Impresión de Prueba"
4. Revisa los logs en la consola de Xcode
5. Si todo está bien, deberías ver el logo impreso en la parte superior del ticket

