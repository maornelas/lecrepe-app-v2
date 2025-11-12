/**
 * Utilidad para convertir imágenes PNG a comandos ESC/POS
 * Para impresoras térmicas
 */

import RNFS from 'react-native-fs';
import { manipulateAsync, SaveFormat } from 'react-native-image-manipulator';

/**
 * Convierte una imagen PNG a comandos ESC/POS para impresoras térmicas
 * @param imagePath - Ruta al archivo de imagen
 * @param printerWidth - Ancho de la impresora en píxeles (384 para 80mm, 576 para 80mm alta resolución)
 * @returns Promise con los comandos ESC/POS como string
 */
export const imageToEscPos = async (
  imagePath: string,
  printerWidth: number = 384
): Promise<string> => {
  try {
    // 1. Verificar que el archivo existe
    const fileExists = await RNFS.exists(imagePath);
    if (!fileExists) {
      throw new Error(`El archivo no existe: ${imagePath}`);
    }

    // 2. Redimensionar la imagen al ancho de la impresora manteniendo la proporción
    const manipulatedImage = await manipulateAsync(
      imagePath,
      [{ resize: { width: printerWidth } }],
      { compress: 1, format: SaveFormat.PNG }
    );

    // 3. Leer el archivo redimensionado como base64
    const base64Image = await RNFS.readFile(manipulatedImage.uri, 'base64');

    // 4. Convertir base64 a Uint8Array para procesar los píxeles
    // Nota: En React Native, necesitamos procesar la imagen de otra manera
    // ya que no tenemos acceso directo a los píxeles desde JavaScript puro
    
    // Por ahora, usaremos una aproximación: convertir la imagen a bitmap usando
    // un método alternativo. Para una solución completa, necesitaríamos un módulo nativo.
    
    // Solución temporal: usar comandos ESC/POS básicos con espacio para el logo
    // y luego implementar la conversión real usando un módulo nativo o servicio
    
    return generateEscPosFromBase64(base64Image, printerWidth, manipulatedImage.height || 100);
  } catch (error: any) {
    console.error('Error al convertir imagen a ESC/POS:', error);
    throw error;
  }
};

/**
 * Genera comandos ESC/POS desde datos base64
 * Nota: Esta es una implementación simplificada. Para una solución completa,
 * necesitarías decodificar el PNG y convertir a bitmap real.
 */
function generateEscPosFromBase64(
  base64: string,
  width: number,
  height: number
): string {
  const GS = '\x1D';
  const ESC = '\x1B';
  const centerText = ESC + 'a' + '\x01'; // Centrar
  
  // Para una implementación completa, necesitarías:
  // 1. Decodificar el PNG desde base64
  // 2. Extraer los píxeles RGBA
  // 3. Convertir a escala de grises
  // 4. Aplicar dithering o umbral para convertir a blanco/negro
  // 5. Convertir a formato bitmap (1 bit por píxel)
  // 6. Generar comandos GS v 0
  
  // Por ahora, retornamos un placeholder que se reemplazará con la implementación real
  // usando un módulo nativo o procesamiento del lado del servidor
  
  return centerText + '\n\n';
}

/**
 * Genera comandos ESC/POS para imprimir una imagen bitmap
 * @param bitmapData - Datos de la imagen en formato bitmap (array de bytes)
 * @param width - Ancho de la imagen en píxeles
 * @param height - Alto de la imagen en píxeles
 * @returns Comandos ESC/POS para imprimir la imagen
 */
export const bitmapToEscPos = (
  bitmapData: Uint8Array,
  width: number,
  height: number
): string => {
  const GS = '\x1D';
  
  // Comando ESC/POS para imprimir imagen raster (GS v 0)
  // Formato: GS v 0 [xL xH yL yH] [d1...dk]
  // xL, xH: bytes bajos y altos del ancho en bytes
  // yL, yH: bytes bajos y altos del alto en píxeles
  // d1...dk: datos de la imagen
  
  const widthBytes = Math.ceil(width / 8);
  const xL = widthBytes & 0xFF;
  const xH = (widthBytes >> 8) & 0xFF;
  const yL = height & 0xFF;
  const yH = (height >> 8) & 0xFF;
  
  // Construir el comando
  let command = GS + 'v' + '\x00' + 
                String.fromCharCode(xL) + 
                String.fromCharCode(xH) + 
                String.fromCharCode(yL) + 
                String.fromCharCode(yH);
  
  // Agregar los datos de la imagen
  for (let i = 0; i < bitmapData.length; i++) {
    command += String.fromCharCode(bitmapData[i]);
  }
  
  return command;
};

/**
 * Convierte datos de píxeles RGBA a bitmap (blanco/negro)
 * @param rgbaData - Datos de píxeles en formato RGBA (4 bytes por píxel)
 * @param width - Ancho de la imagen
 * @param height - Alto de la imagen
 * @returns Datos bitmap (1 bit por píxel, empaquetados en bytes)
 */
export const rgbaToBitmap = (
  rgbaData: Uint8Array,
  width: number,
  height: number
): Uint8Array => {
  const widthBytes = Math.ceil(width / 8);
  const bitmapData = new Uint8Array(widthBytes * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgbaIndex = (y * width + x) * 4;
      const r = rgbaData[rgbaIndex];
      const g = rgbaData[rgbaIndex + 1];
      const b = rgbaData[rgbaIndex + 2];
      const a = rgbaData[rgbaIndex + 3];
      
      // Convertir a escala de grises usando la fórmula estándar
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      
      // Aplicar umbral (128) para convertir a blanco/negro
      const bit = gray < 128 ? 1 : 0;
      
      // Empaquetar bits en bytes
      const byteIndex = Math.floor(x / 8);
      const bitIndex = 7 - (x % 8);
      const bitmapIndex = y * widthBytes + byteIndex;
      
      if (bit === 1) {
        bitmapData[bitmapIndex] |= (1 << bitIndex);
      }
    }
  }
  
  return bitmapData;
};

