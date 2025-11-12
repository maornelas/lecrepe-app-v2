# Instrucciones para Subir el Proyecto a Git

## Estado Actual

✅ Repositorio Git inicializado
✅ Commit inicial realizado
✅ Rama: `main`

## Pasos para Subir a GitHub

### Paso 1: Crear el Repositorio en GitHub

1. Ve a [GitHub](https://github.com) e inicia sesión
2. Haz clic en el botón "+" en la esquina superior derecha
3. Selecciona "New repository"
4. **Nombre del repositorio**: `PrinterApp` (o el que prefieras)
5. **Descripción**: "Aplicación React Native para imprimir tickets en impresora Xprinter 80mm vía TCP/IP"
6. Elige si será **público** o **privado**
7. **NO** marques "Initialize this repository with a README" (ya tenemos archivos)
8. Haz clic en "Create repository"

### Paso 2: Conectar el Repositorio Local con GitHub

Ejecuta estos comandos en la terminal (reemplaza `TU_USUARIO` con tu usuario de GitHub):

```bash
cd /Users/maornelas/PrinterApp

# Agregar el repositorio remoto
git remote add origin https://github.com/TU_USUARIO/PrinterApp.git

# Subir el código
git push -u origin main
```

### Autenticación en GitHub

Si GitHub te pide autenticación, tienes dos opciones:

#### Opción A: Personal Access Token (Recomendado)

1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Haz clic en "Generate new token (classic)"
3. Dale un nombre (ej: "PrinterApp")
4. Selecciona el scope `repo` (acceso completo a repositorios)
5. Haz clic en "Generate token"
6. **Copia el token** (solo se muestra una vez)
7. Cuando Git te pida credenciales:
   - Usuario: tu usuario de GitHub
   - Contraseña: pega el token

#### Opción B: SSH (Alternativa)

```bash
# Cambiar la URL del remoto a SSH
git remote set-url origin git@github.com:TU_USUARIO/PrinterApp.git

# Subir
git push -u origin main
```

**Nota**: Para usar SSH, necesitas tener configuradas tus claves SSH en GitHub.

## Verificar el Estado

```bash
# Ver el repositorio remoto configurado
git remote -v

# Ver el estado del repositorio
git status

# Ver el historial de commits
git log --oneline
```

## Comandos Útiles para el Futuro

```bash
# Agregar cambios
git add .

# Hacer commit
git commit -m "Descripción de los cambios"

# Subir cambios
git push

# Ver diferencias
git diff

# Ver historial
git log
```

## Archivos Incluidos en el Repositorio

El repositorio incluye:
- ✅ Código fuente completo (`App.tsx`)
- ✅ Configuración de iOS y Android
- ✅ Scripts de build (`build-apk.sh`, `build-ipa.sh`)
- ✅ Documentación (`README.md`, `INSTRUCCIONES_IPA.md`, `INSTRUCCIONES_APK.md`)
- ✅ Configuración de permisos y networking

## Archivos Excluidos (por .gitignore)

Los siguientes archivos NO se subirán (están en `.gitignore`):
- ❌ `node_modules/` - Dependencias de Node.js
- ❌ `ios/Pods/` - Dependencias de CocoaPods
- ❌ `ios/build/` - Archivos de build de iOS
- ❌ `android/build/` - Archivos de build de Android
- ❌ `android/app/build/` - APKs generados
- ❌ `.DS_Store` - Archivos del sistema macOS
- ❌ Archivos temporales y de sistema

## Notas Importantes

⚠️ **NO subas archivos sensibles**:
- Keystores de producción (excepto `debug.keystore` que es seguro)
- Archivos `.env` con secretos o API keys
- Credenciales personales

✅ **Archivos seguros para subir**:
- `debug.keystore` - Es el keystore de debug, es seguro compartirlo
- Configuraciones públicas
- Código fuente

## Solución de Problemas

### Error: "remote origin already exists"

Si ya existe un remoto, puedes:
```bash
# Ver remotos existentes
git remote -v

# Eliminar el remoto existente
git remote remove origin

# Agregar el nuevo
git remote add origin https://github.com/TU_USUARIO/PrinterApp.git
```

### Error: "failed to push some refs"

Si hay conflictos con el repositorio remoto:
```bash
# Hacer pull primero (si hay contenido en el remoto)
git pull origin main --allow-unrelated-histories

# Luego hacer push
git push -u origin main
```

### Error de autenticación

- Verifica que el token tenga permisos `repo`
- Asegúrate de usar el token correcto
- Si usas SSH, verifica que tu clave esté agregada a GitHub

## Recursos Adicionales

- [Documentación de GitHub](https://docs.github.com)
- [Guía de Git](https://git-scm.com/doc)
- [Autenticación en GitHub](https://docs.github.com/en/authentication)

