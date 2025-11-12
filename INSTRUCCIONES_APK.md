# Instrucciones para Generar APK de Android

Esta guía te ayudará a generar el APK de la aplicación PrinterApp para Android.

## Requisitos Previos

1. **Android Studio** instalado (o al menos Android SDK)
2. **Java JDK** (versión 17 o superior recomendada) - **REQUERIDO**
3. **Variables de entorno configuradas**:
   - `ANDROID_HOME` apuntando al SDK de Android
   - `JAVA_HOME` apuntando al JDK

### Instalar Java JDK (si no está instalado)

**En macOS:**
```bash
# Opción 1: Usando Homebrew (recomendado)
brew install openjdk@17

# Configurar JAVA_HOME
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
source ~/.zshrc

# Opción 2: Descargar desde Oracle
# Visita: https://www.oracle.com/java/technologies/downloads/#java17
```

**Verificar instalación:**
```bash
java -version
javac -version
echo $JAVA_HOME
```

Si no tienes Java instalado, el build fallará con el error: "Unable to locate a Java Runtime"

## Generar APK de Debug (Para Pruebas)

El APK de debug es más fácil de generar y es suficiente para probar en dispositivos:

```bash
# Dar permisos de ejecución al script
chmod +x build-apk.sh

# Generar APK de debug
./build-apk.sh debug
```

O manualmente:

```bash
cd android
./gradlew assembleDebug
```

El APK se generará en: `android/app/build/outputs/apk/debug/app-debug.apk`

## Generar APK de Release (Para Producción)

### Paso 1: Generar Keystore

Para publicar en Google Play Store, necesitas un keystore firmado:

```bash
# Dar permisos de ejecución
chmod +x generar-keystore.sh

# Ejecutar el script
./generar-keystore.sh
```

El script te pedirá:
- Alias del keystore
- Contraseña del keystore (mínimo 6 caracteres)
- Contraseña de la clave
- Información de certificado (nombre, organización, etc.)

**⚠️ IMPORTANTE**: Guarda esta información de forma segura. Si la pierdes, no podrás actualizar tu app en Google Play Store.

### Paso 2: Configurar build.gradle

Edita `android/app/build.gradle` y agrega la configuración de signing:

```gradle
android {
    // ... código existente ...
    
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release
            minifyEnabled enableProguardInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}
```

### Paso 3: Crear archivo gradle.properties

Crea o edita `android/gradle.properties` y agrega (NO commitees este archivo al repositorio):

```properties
MYAPP_RELEASE_STORE_FILE=printerapp-release.keystore
MYAPP_RELEASE_KEY_ALIAS=printerapp-key
MYAPP_RELEASE_STORE_PASSWORD=tu_contraseña_del_keystore
MYAPP_RELEASE_KEY_PASSWORD=tu_contraseña_de_la_clave
```

### Paso 4: Generar APK de Release

```bash
./build-apk.sh release
```

O manualmente:

```bash
cd android
./gradlew assembleRelease
```

El APK se generará en: `android/app/build/outputs/apk/release/app-release.apk`

## Instalar APK en Dispositivo Android

### Opción 1: Usando ADB (Android Debug Bridge)

1. Conecta tu dispositivo Android a la computadora vía USB
2. Habilita "Depuración USB" en las opciones de desarrollador
3. Ejecuta:

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

O para release:

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Opción 2: Transferencia Manual

1. Transfiere el archivo APK a tu dispositivo Android (por email, Google Drive, USB, etc.)
2. En el dispositivo, abre el archivo APK
3. Si aparece una advertencia sobre "Fuentes desconocidas", permite la instalación desde esa fuente
4. Sigue las instrucciones para instalar

### Opción 3: Usando Android Studio

1. Abre el proyecto en Android Studio
2. Conecta tu dispositivo o inicia un emulador
3. Haz clic en "Run" (▶️) o presiona `Shift + F10`
4. Selecciona tu dispositivo y espera a que se instale

## Solución de Problemas

### Error: "SDK location not found"

Asegúrate de tener configurado `ANDROID_HOME`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# o
export ANDROID_HOME=$HOME/Android/Sdk  # Linux
```

Agrega esto a tu `~/.zshrc` o `~/.bashrc` para que persista.

### Error: "Gradle sync failed"

1. Abre Android Studio
2. File → Sync Project with Gradle Files
3. O ejecuta: `cd android && ./gradlew clean`

### Error: "INSTALL_FAILED_INSUFFICIENT_STORAGE"

El dispositivo no tiene suficiente espacio. Libera espacio e intenta de nuevo.

### Error: "INSTALL_PARSE_FAILED_NO_CERTIFICATES"

El APK no está firmado correctamente. Asegúrate de seguir los pasos de generación de keystore.

### La app se cierra al abrirla

1. Revisa los logs: `adb logcat | grep ReactNativeJS`
2. Verifica que todas las dependencias estén instaladas: `npm install`
3. Asegúrate de que el Metro bundler esté corriendo: `npm start`

## Verificar Permisos en AndroidManifest.xml

Asegúrate de que `android/app/src/main/AndroidManifest.xml` tenga los permisos necesarios:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## Optimizaciones para Producción

Antes de publicar en Google Play Store:

1. **Habilitar ProGuard** (minificación de código):
   - En `android/app/build.gradle`, cambia `enableProguardInReleaseBuilds = true`
   - Revisa `android/app/proguard-rules.pro` para agregar reglas personalizadas

2. **Generar AAB (Android App Bundle)** en lugar de APK:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   El AAB se genera en: `android/app/build/outputs/bundle/release/app-release.aab`
   Google Play Store prefiere AAB sobre APK.

3. **Verificar el tamaño del APK**:
   - El APK debería ser razonablemente pequeño (< 50MB recomendado)
   - Usa `./gradlew assembleRelease --info` para ver detalles del build

## Notas Importantes

- El keystore de debug (`debug.keystore`) es solo para desarrollo. NO lo uses para producción.
- Guarda el keystore de release en un lugar seguro y haz backup.
- Si pierdes el keystore de release, NO podrás actualizar tu app en Google Play Store.
- El APK de debug expira después de un tiempo. El de release no expira.

## Recursos Adicionales

- [Documentación oficial de React Native - Android](https://reactnative.dev/docs/signed-apk-android)
- [Guía de Google Play Console](https://support.google.com/googleplay/android-developer/answer/113469)

