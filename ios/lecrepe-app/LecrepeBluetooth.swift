//
//  LecrepeBluetooth.swift
//  lecrepe-app
//
//  Simple Bluetooth module for thermal printer communication
//

import Foundation
import ExternalAccessory
import CoreBluetooth

@objc(LecrepeBluetooth)
class LecrepeBluetooth: NSObject {
  
  private var connectedAccessory: EAAccessory?
  private var session: EASession?
  
  @objc
  func isBluetoothEnabled(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // For iOS, we check External Accessory availability
    let manager = EAAccessoryManager.shared()
    let isEnabled = manager.connectedAccessories.count >= 0 // Always true for EA framework
    resolve(isEnabled)
  }
  
  @objc
  func getBondedDevices(_ resolve: @escaping ([[String: Any]]) -> Void, rejecter reject: @escaping (String, String, NSError?) -> Void) {
    let manager = EAAccessoryManager.shared()
    let accessories = manager.connectedAccessories
    
    let devices = accessories.map { accessory -> [String: Any] in
      return [
        "id": accessory.serialNumber,
        "address": accessory.serialNumber,
        "name": accessory.name,
        "connected": true
      ]
    }
    
    resolve(devices)
  }
  
  @objc
  func connectToDevice(_ deviceId: String, resolver resolve: @escaping (Bool) -> Void, rejecter reject: @escaping (String, String, NSError?) -> Void) {
    let manager = EAAccessoryManager.shared()
    let accessories = manager.connectedAccessories
    
    guard let accessory = accessories.first(where: { $0.serialNumber == deviceId }) else {
      reject("DEVICE_NOT_FOUND", "Device not found", nil)
      return
    }
    
    // Create session for communication
    let protocolString = accessory.protocolStrings.first ?? ""
    guard let newSession = EASession(accessory: accessory, forProtocol: protocolString) else {
      reject("CONNECTION_FAILED", "Failed to create session", nil)
      return
    }
    
    self.connectedAccessory = accessory
    self.session = newSession
    
    resolve(true)
  }
  
  @objc
  func disconnectFromDevice(_ deviceId: String, resolver resolve: @escaping (Bool) -> Void, rejecter reject: @escaping (String, String, NSError?) -> Void) {
    session?.outputStream?.close()
    session?.inputStream?.close()
    session = nil
    connectedAccessory = nil
    resolve(true)
  }
  
  @objc
  func isDeviceConnected(_ deviceId: String, resolver resolve: @escaping (Bool) -> Void, rejecter reject: @escaping (String, String, NSError?) -> Void) {
    let isConnected = connectedAccessory?.serialNumber == deviceId && session != nil
    resolve(isConnected)
  }
  
  @objc
  func writeToDevice(_ deviceId: String, message: String, resolver resolve: @escaping (Bool) -> Void, rejecter reject: @escaping (String, String, NSError?) -> Void) {
    guard let session = session,
          let outputStream = session.outputStream,
          connectedAccessory?.serialNumber == deviceId else {
      reject("NOT_CONNECTED", "Device not connected", nil)
      return
    }
    
    guard outputStream.streamStatus == .open else {
      outputStream.open()
    }
    
    guard let data = message.data(using: .utf8) else {
      reject("INVALID_DATA", "Failed to encode message", nil)
      return
    }
    
    let bytesWritten = data.withUnsafeBytes { bytes in
      outputStream.write(bytes.bindMemory(to: UInt8.self).baseAddress!, maxLength: data.count)
    }
    
    if bytesWritten > 0 {
      resolve(true)
    } else {
      reject("WRITE_FAILED", "Failed to write data", nil)
    }
  }
}

