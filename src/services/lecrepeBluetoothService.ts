/**
 * Lecrepe Bluetooth Service - Native module wrapper
 * Uses custom native module to avoid compatibility issues
 * Falls back to react-native-bluetooth-classic on Android
 */

import { NativeModules, Platform } from 'react-native';
import { PermissionsAndroid } from 'react-native';

const { LecrepeBluetooth } = NativeModules;

// Lazy import para react-native-bluetooth-classic (usado en Android como fallback)
let RNBluetoothClassic: any = null;

const getRNBluetoothClassic = () => {
  if (RNBluetoothClassic === null && Platform.OS === 'android') {
    try {
      const bluetoothModule = require('react-native-bluetooth-classic');
      RNBluetoothClassic = bluetoothModule.default || bluetoothModule;
    } catch (error) {
      console.warn('react-native-bluetooth-classic not available:', error);
    }
  }
  return RNBluetoothClassic;
};

export interface BluetoothDevice {
  id: string;
  address: string;
  name: string;
  connected: boolean;
}

export class LecrepeBluetoothService {
  private static connectedDevice: BluetoothDevice | null = null;
  // Referencia al dispositivo de react-native-bluetooth-classic (solo Android)
  private static rnBluetoothDevice: any = null;

  /**
   * Check if Bluetooth is available
   */
  static async isBluetoothAvailable(): Promise<boolean> {
    try {
      // En Android, usar react-native-bluetooth-classic si el módulo nativo no está disponible
      if (Platform.OS === 'android' && !LecrepeBluetooth) {
        const RNBluetooth = getRNBluetoothClassic();
        if (RNBluetooth && typeof RNBluetooth.isBluetoothEnabled === 'function') {
          return await RNBluetooth.isBluetoothEnabled();
        }
        return false;
      }
      
      if (!LecrepeBluetooth) {
        return false;
      }
      return await LecrepeBluetooth.isBluetoothEnabled();
    } catch (error) {
      console.error('Error checking Bluetooth availability:', error);
      return false;
    }
  }

  /**
   * Request Bluetooth permissions (Android)
   */
  static async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);
      
      return (
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (err) {
      console.warn('Error requesting Bluetooth permissions:', err);
      return false;
    }
  }

  /**
   * Get paired Bluetooth devices
   */
  static async getPairedDevices(): Promise<BluetoothDevice[]> {
    try {
      // En Android, usar react-native-bluetooth-classic si el módulo nativo no está disponible
      if (Platform.OS === 'android' && !LecrepeBluetooth) {
        const RNBluetooth = getRNBluetoothClassic();
        if (RNBluetooth && typeof RNBluetooth.getBondedDevices === 'function') {
          const devices = await RNBluetooth.getBondedDevices();
          console.log('📱 Paired devices:', devices);
          // Convertir el formato de react-native-bluetooth-classic al formato esperado
          return (devices || []).map((device: any) => ({
            id: device.id || device.address,
            address: device.address,
            name: device.name || 'Unknown Device',
            connected: device.connected || false,
          }));
        }
        throw new Error('Bluetooth module not available');
      }
      
      if (!LecrepeBluetooth) {
        throw new Error('Bluetooth module not available');
      }
      const devices = await LecrepeBluetooth.getBondedDevices();
      console.log('📱 Paired devices:', devices);
      return devices || [];
    } catch (error) {
      console.error('Error getting paired devices:', error);
      throw error;
    }
  }

  /**
   * Connect to a Bluetooth device
   */
  static async connectToDevice(device: BluetoothDevice): Promise<boolean> {
    try {
      // En Android, usar react-native-bluetooth-classic si el módulo nativo no está disponible
      if (Platform.OS === 'android' && !LecrepeBluetooth) {
        const RNBluetooth = getRNBluetoothClassic();
        if (RNBluetooth && typeof RNBluetooth.getBondedDevices === 'function') {
          console.log('🔌 Connecting to device:', device.address);
          // Buscar el dispositivo en los dispositivos emparejados
          const pairedDevices = await RNBluetooth.getBondedDevices();
          const targetDevice = pairedDevices.find((d: any) => d.address === device.address);
          if (!targetDevice) {
            throw new Error('Dispositivo no encontrado en los dispositivos emparejados');
          }
          // Conectar al dispositivo - el método connect() puede retornar el dispositivo o un booleano
          try {
            const connectionResult = await targetDevice.connect();
            
            // El método connect() puede retornar:
            // 1. El dispositivo mismo (si tiene método write)
            // 2. Un booleano true/false
            // 3. El dispositivo original actualizado
            
            // Si el resultado tiene el método write, usarlo
            if (connectionResult && typeof connectionResult.write === 'function') {
              this.rnBluetoothDevice = connectionResult;
            } 
            // Si retorna true o el dispositivo original tiene write, usar targetDevice
            else if (connectionResult === true || connectionResult) {
              // Verificar que targetDevice tenga el método write
              if (typeof targetDevice.write === 'function') {
                this.rnBluetoothDevice = targetDevice;
              } else {
                // Si targetDevice no tiene write, puede que necesitemos obtenerlo de otra manera
                // Intentar obtener los dispositivos emparejados nuevamente después de conectar
                const updatedDevices = await RNBluetooth.getBondedDevices();
                const updatedDevice = updatedDevices.find((d: any) => d.address === device.address);
                if (updatedDevice && typeof updatedDevice.write === 'function') {
                  this.rnBluetoothDevice = updatedDevice;
                } else {
                  throw new Error('El dispositivo conectado no tiene el método write disponible');
                }
              }
            } else {
              throw new Error('No se pudo establecer la conexión');
            }
            
            // Verificar que el dispositivo tenga el método write antes de continuar
            if (!this.rnBluetoothDevice || typeof this.rnBluetoothDevice.write !== 'function') {
              throw new Error('El dispositivo conectado no tiene el método write disponible');
            }
            
            this.connectedDevice = {
              ...device,
              connected: true,
            };
            console.log('✅ Connected to device:', device.name || device.address);
            console.log('📱 Device has write method:', typeof this.rnBluetoothDevice.write === 'function');
            return true;
          } catch (connectError: any) {
            console.error('❌ Error during connection:', connectError);
            this.rnBluetoothDevice = null;
            throw new Error(`Error al conectar: ${connectError.message || 'Error desconocido'}`);
          }
        }
        throw new Error('Bluetooth module not available');
      }
      
      if (!LecrepeBluetooth) {
        throw new Error('Bluetooth module not available');
      }

      console.log('🔌 Connecting to device:', device.address);
      
      const connected = await LecrepeBluetooth.connectToDevice(device.address);
      
      if (connected) {
        this.connectedDevice = device;
        console.log('✅ Connected to device:', device.name || device.address);
        return true;
      } else {
        throw new Error('No se pudo establecer la conexión');
      }
    } catch (error: any) {
      console.error('❌ Error connecting to device:', error);
      this.connectedDevice = null;
      throw new Error(`Error al conectar: ${error.message || 'Error desconocido'}`);
    }
  }

  /**
   * Disconnect from current device
   */
  static async disconnect(): Promise<void> {
    try {
      if (this.connectedDevice) {
        // En Android, usar react-native-bluetooth-classic si el módulo nativo no está disponible
        if (Platform.OS === 'android' && !LecrepeBluetooth) {
          if (this.rnBluetoothDevice && typeof this.rnBluetoothDevice.disconnect === 'function') {
            await this.rnBluetoothDevice.disconnect();
          }
          this.rnBluetoothDevice = null;
        } else if (LecrepeBluetooth) {
          await LecrepeBluetooth.disconnectFromDevice(this.connectedDevice.address);
        }
      }
      this.connectedDevice = null;
      console.log('🔌 Disconnected from device');
    } catch (error) {
      console.error('Error disconnecting:', error);
      this.connectedDevice = null;
    }
  }

  /**
   * Check if a device is connected
   */
  static async isConnected(): Promise<boolean> {
    if (!this.connectedDevice) {
      return false;
    }
    try {
      // En Android, usar react-native-bluetooth-classic si el módulo nativo no está disponible
      if (Platform.OS === 'android' && !LecrepeBluetooth) {
        // Si tenemos la referencia al dispositivo, asumimos que está conectado
        // El método isConnected() puede no estar disponible o no funcionar correctamente
        if (this.rnBluetoothDevice) {
          // Intentar verificar si tiene el método isConnected
          if (typeof this.rnBluetoothDevice.isConnected === 'function') {
            try {
              return await this.rnBluetoothDevice.isConnected();
            } catch (error) {
              // Si falla la verificación, pero tenemos el dispositivo, asumimos conectado
              console.warn('Error checking connection status, assuming connected:', error);
              return true;
            }
          }
          // Si no tiene el método isConnected pero tenemos la referencia, asumimos conectado
          return true;
        }
        return false;
      }
      
      if (!LecrepeBluetooth) {
        return false;
      }
      return await LecrepeBluetooth.isDeviceConnected(this.connectedDevice.address);
    } catch (error) {
      // Si hay error pero tenemos el dispositivo conectado, asumimos que está conectado
      if (this.connectedDevice) {
        console.warn('Error checking connection, assuming connected:', error);
        return true;
      }
      return false;
    }
  }

  /**
   * Get connected device info
   */
  static getConnectedDevice(): BluetoothDevice | null {
    return this.connectedDevice;
  }

  /**
   * Send data to connected printer
   */
  static async sendData(data: string | Uint8Array): Promise<boolean> {
    try {
      if (!this.connectedDevice) {
        throw new Error('No hay dispositivo conectado');
      }

      console.log('📤 Sending data to printer...');
      
      // Convert to string if needed
      let dataToSend: string;
      if (typeof data === 'string') {
        dataToSend = data;
      } else {
        // Convert Uint8Array to string
        dataToSend = String.fromCharCode(...Array.from(data));
      }

      // En Android, usar react-native-bluetooth-classic si el módulo nativo no está disponible
      if (Platform.OS === 'android' && !LecrepeBluetooth) {
        if (!this.rnBluetoothDevice) {
          throw new Error('Bluetooth device not connected');
        }
        
        if (typeof this.rnBluetoothDevice.write === 'function') {
          try {
            await this.rnBluetoothDevice.write(dataToSend);
            console.log('✅ Data sent successfully');
            return true;
          } catch (writeError: any) {
            console.error('❌ Error writing to device:', writeError);
            // Si el error indica que el dispositivo no está conectado, intentar reconectar
            if (writeError?.message?.includes('not connected') || 
                writeError?.message?.includes('disconnected') ||
                writeError?.code === 'NOT_CONNECTED') {
              throw new Error('El dispositivo Bluetooth se desconectó. Por favor, reconecta el dispositivo.');
            }
            throw new Error(`Error al enviar datos: ${writeError.message || 'Error desconocido'}`);
          }
        } else {
          throw new Error('Bluetooth device not connected - write method not available');
        }
      } else if (LecrepeBluetooth) {
        // Write data to device
        await LecrepeBluetooth.writeToDevice(this.connectedDevice.address, dataToSend);
        console.log('✅ Data sent successfully');
        return true;
      } else {
        throw new Error('Bluetooth module not available');
      }
    } catch (error: any) {
      console.error('❌ Error sending data:', error);
      throw new Error(`Error al enviar datos: ${error.message || 'Error desconocido'}`);
    }
  }

  /**
   * Print test receipt
   */
  static async printTestReceipt(): Promise<boolean> {
    try {
      if (!(await this.isConnected())) {
        throw new Error('No hay impresora conectada');
      }

      console.log('🖨️ Printing test receipt...');

      // ESC/POS commands for test receipt
      const ESC = '\x1B';
      const GS = '\x1D';
      
      let commands = '';
      
      // Initialize printer
      commands += ESC + '@'; // Initialize
      
      // Center align
      commands += ESC + 'a' + '\x01'; // Center
      
      // Title
      commands += ESC + '!' + '\x08'; // Double height and width
      commands += 'LECREPE APP\n';
      commands += ESC + '!' + '\x00'; // Normal size
      commands += '----------------\n';
      commands += '\n';
      
      // Test text
      commands += ESC + 'a' + '\x00'; // Left align
      commands += 'Impresion de Prueba\n';
      commands += '\n';
      commands += 'Fecha: ' + new Date().toLocaleString('es-MX') + '\n';
      commands += '\n';
      commands += '----------------\n';
      commands += '\n';
      
      // Center align
      commands += ESC + 'a' + '\x01'; // Center
      commands += '✅ Conexion exitosa\n';
      commands += '\n';
      
      // Cut paper
      commands += GS + 'V' + '\x41' + '\x03'; // Partial cut
      
      // Feed paper
      commands += '\n\n\n';
      
      await this.sendData(commands);
      console.log('✅ Test receipt printed successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Error printing test receipt:', error);
      throw error;
    }
  }
}

