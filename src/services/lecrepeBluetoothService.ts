/**
 * Lecrepe Bluetooth Service - Native module wrapper
 * Uses custom native module to avoid compatibility issues
 */

import { NativeModules, Platform } from 'react-native';
import { PermissionsAndroid } from 'react-native';

const { LecrepeBluetooth } = NativeModules;

export interface BluetoothDevice {
  id: string;
  address: string;
  name: string;
  connected: boolean;
}

export class LecrepeBluetoothService {
  private static connectedDevice: BluetoothDevice | null = null;

  /**
   * Check if Bluetooth is available
   */
  static async isBluetoothAvailable(): Promise<boolean> {
    try {
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
      if (this.connectedDevice && LecrepeBluetooth) {
        await LecrepeBluetooth.disconnectFromDevice(this.connectedDevice.address);
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
    if (!this.connectedDevice || !LecrepeBluetooth) {
      return false;
    }
    try {
      return await LecrepeBluetooth.isDeviceConnected(this.connectedDevice.address);
    } catch (error) {
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

      if (!LecrepeBluetooth) {
        throw new Error('Bluetooth module not available');
      }

      // Check connection status
      const isConnected = await this.isConnected();
      if (!isConnected) {
        throw new Error('El dispositivo no está conectado');
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

      // Write data to device
      await LecrepeBluetooth.writeToDevice(this.connectedDevice.address, dataToSend);
      console.log('✅ Data sent successfully');
      return true;
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

