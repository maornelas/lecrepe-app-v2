import UIKit
import Foundation
import React

@objc(ImageToEscPos)
class ImageToEscPos: NSObject, RCTBridgeModule {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  /**
   * Convierte una imagen PNG a comandos ESC/POS para impresoras térmicas
   */
  @objc
  func convertImageToEscPos(_ imagePath: String, printerWidth: NSInteger, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        // 1. Cargar la imagen - intentar desde el bundle primero, luego desde la ruta proporcionada
        var image: UIImage?
        
        // Intentar cargar desde el bundle
        if let bundlePath = Bundle.main.path(forResource: "logo-kokoro", ofType: "png") {
          image = UIImage(contentsOfFile: bundlePath)
        }
        
        // Si no se encontró en el bundle, intentar desde la ruta proporcionada
        if image == nil && !imagePath.isEmpty {
          image = UIImage(contentsOfFile: imagePath)
        }
        
        // Si aún no se encontró, intentar desde el main bundle directamente
        if image == nil {
          if let bundleImage = UIImage(named: "logo-kokoro") {
            image = bundleImage
          }
        }
        
        guard let finalImage = image else {
          let errorMsg = "No se pudo cargar la imagen. Ruta intentada: \(imagePath). Bundle path: \(Bundle.main.bundlePath)"
          print("ERROR: \(errorMsg)")
          reject("IMAGE_LOAD_ERROR", errorMsg, nil)
          return
        }
        
        print("✅ Imagen cargada exitosamente. Tamaño original: \(finalImage.size)")
        
        // 2. Redimensionar la imagen al ancho de la impresora manteniendo la proporción
        let targetWidth = CGFloat(printerWidth)
        let aspectRatio = finalImage.size.height / finalImage.size.width
        let targetHeight = targetWidth * aspectRatio
        
        let size = CGSize(width: targetWidth, height: targetHeight)
        UIGraphicsBeginImageContextWithOptions(size, false, 1.0)
        finalImage.draw(in: CGRect(origin: .zero, size: size))
        let resizedImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        
        guard let processedImage = resizedImage else {
          reject("RESIZE_ERROR", "No se pudo redimensionar la imagen", nil)
          return
        }
        
        print("✅ Imagen redimensionada. Nuevo tamaño: \(processedImage.size)")
        
        // 3. Convertir a escala de grises y luego a bitmap (blanco/negro)
        let width = Int(processedImage.size.width)
        let height = Int(processedImage.size.height)
        let widthBytes = (width + 7) / 8 // Redondear hacia arriba
        
        // Crear contexto de imagen en escala de grises
        let colorSpace = CGColorSpaceCreateDeviceGray()
        guard let context = CGContext(
          data: nil,
          width: width,
          height: height,
          bitsPerComponent: 8,
          bytesPerRow: width,
          space: colorSpace,
          bitmapInfo: CGImageAlphaInfo.none.rawValue
        ) else {
          reject("CONTEXT_ERROR", "No se pudo crear el contexto de imagen", nil)
          return
        }
        
        // Dibujar la imagen en el contexto
        context.draw(processedImage.cgImage!, in: CGRect(x: 0, y: 0, width: width, height: height))
        
        // Obtener los datos de píxeles
        guard let pixelData = context.data else {
          reject("PIXEL_DATA_ERROR", "No se pudieron obtener los datos de píxeles", nil)
          return
        }
        
        let dataPtr = pixelData.bindMemory(to: UInt8.self, capacity: width * height)
        
        // 4. Convertir a bitmap (1 bit por píxel) con umbral
        let bitmapData = UnsafeMutablePointer<UInt8>.allocate(capacity: widthBytes * height)
        bitmapData.initialize(repeating: 0, count: widthBytes * height)
        
        for y in 0..<height {
          for x in 0..<width {
            let pixelIndex = y * width + x
            let grayValue = dataPtr[pixelIndex]
            
            // Aplicar umbral (128) para convertir a blanco/negro
            let bit: UInt8 = grayValue < 128 ? 1 : 0
            
            // Empaquetar bits en bytes
            let byteIndex = x / 8
            let bitIndex = 7 - (x % 8)
            let bitmapIndex = y * widthBytes + byteIndex
            
            if bit == 1 {
              bitmapData[bitmapIndex] |= (1 << bitIndex)
            }
          }
        }
        
        // 5. Generar comandos ESC/POS (retorna Data directamente)
        let escPosCommands = self.generateEscPosCommands(
          bitmapData: bitmapData,
          width: width,
          height: height,
          widthBytes: widthBytes
        )
        
        bitmapData.deallocate()
        
        print("✅ Comandos ESC/POS generados. Longitud: \(escPosCommands.count) bytes")
        
        // 6. Convertir a base64 para enviarlo a JavaScript
        // Los comandos ESC/POS ya están en formato Data, convertir directamente a base64
        let base64String = escPosCommands.base64EncodedString()
        
        print("✅ Base64 generado. Longitud: \(base64String.count) caracteres")
        
        DispatchQueue.main.async {
          resolve(base64String)
        }
        
      } catch {
        reject("CONVERSION_ERROR", "Error al convertir la imagen: \(error.localizedDescription)", error)
      }
    }
  }
  
  /**
   * Genera comandos ESC/POS para imprimir una imagen bitmap
   */
  private func generateEscPosCommands(bitmapData: UnsafeMutablePointer<UInt8>, width: Int, height: Int, widthBytes: Int) -> Data {
    let GS: UInt8 = 0x1D
    let xL = UInt8(widthBytes & 0xFF)
    let xH = UInt8((widthBytes >> 8) & 0xFF)
    let yL = UInt8(height & 0xFF)
    let yH = UInt8((height >> 8) & 0xFF)
    
    // Construir el comando ESC/POS
    var command = Data()
    command.append(GS)
    command.append(0x76) // 'v'
    command.append(0x00) // Modo 0 (normal)
    command.append(xL)
    command.append(xH)
    command.append(yL)
    command.append(yH)
    
    // Agregar los datos de la imagen
    let dataLength = widthBytes * height
    command.append(bitmapData, count: dataLength)
    
    return command
  }
}

