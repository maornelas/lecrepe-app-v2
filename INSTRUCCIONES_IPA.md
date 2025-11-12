# Instrucciones para Generar el archivo .ipa

## Requisitos Previos

1. **Tener una cuenta de Apple ID** (gratis) o cuenta de Apple Developer (de pago)
2. **Configurar el Team en Xcode**

## Pasos para Configurar el Team

### Opción 1: Desde Xcode (Recomendado)

1. Abre el proyecto en Xcode:
   ```bash
   open ios/PrinterApp.xcworkspace
   ```

2. En Xcode:
   - Selecciona el proyecto "PrinterApp" en el navegador izquierdo
   - Selecciona el target "PrinterApp"
   - Ve a la pestaña **"Signing & Capabilities"**
   - Marca la casilla **"Automatically manage signing"**
   - En el menú desplegable **"Team"**, selecciona tu cuenta de Apple ID
     - Si no aparece, haz clic en **"Add Account..."** e inicia sesión con tu Apple ID
   - Xcode generará automáticamente un Bundle Identifier único

3. Guarda los cambios (Cmd + S)

### Opción 2: Desde la Terminal (Después de configurar en Xcode)

Una vez configurado el Team en Xcode, puedes ejecutar:

```bash
./build-ipa.sh
```

## Generar el .ipa

Después de configurar el Team, ejecuta:

```bash
./build-ipa.sh
```

El archivo .ipa se generará en: `ios/build/export/PrinterApp.ipa`

## Métodos de Distribución

### Para Instalación en Dispositivos Propios (Development)

El .ipa generado con el método "development" solo se puede instalar en:
- Dispositivos registrados en tu cuenta de Apple Developer
- Usando herramientas como:
  - **Xcode** (arrastra el .ipa al Organizer)
  - **Apple Configurator 2** (gratis en Mac App Store)
  - **3uTools** o **iMazing** (herramientas de terceros)

### Para Distribución Externa (Ad-Hoc o Enterprise)

Si necesitas distribuir la app a otros usuarios sin App Store, necesitas:

1. **Ad-Hoc Distribution**:
   - Requiere una cuenta de Apple Developer ($99/año)
   - Necesitas los UDIDs de los dispositivos destino
   - Genera un .ipa firmado para esos dispositivos específicos

2. **Enterprise Distribution**:
   - Requiere una cuenta de Apple Developer Enterprise ($299/año)
   - Permite distribución ilimitada dentro de tu organización

## Instalación del .ipa

### Método 1: Usando Xcode
1. Conecta tu iPhone por USB
2. Abre Xcode → Window → Devices and Simulators
3. Selecciona tu dispositivo
4. Arrastra el archivo .ipa a la sección "Installed Apps"

### Método 2: Usando Apple Configurator 2
1. Descarga Apple Configurator 2 desde Mac App Store
2. Conecta tu iPhone
3. Selecciona tu dispositivo
4. Haz clic en "Add" → "Apps"
5. Selecciona el archivo .ipa

### Método 3: Usando herramientas de terceros
- **3uTools**: https://www.3u.com/
- **iMazing**: https://imazing.com/

## Notas Importantes

⚠️ **Limitaciones del método Development**:
- El .ipa solo funciona en dispositivos registrados en tu cuenta
- La app expira después de 7 días (si usas cuenta gratuita)
- Necesitas volver a firmar cada 7 días

✅ **Para distribución permanente**:
- Necesitas una cuenta de Apple Developer ($99/año)
- Puedes usar TestFlight para distribución beta
- O publicar en App Store para distribución pública

