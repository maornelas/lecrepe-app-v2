// import RNBluetoothClassic, {
//   BluetoothDevice,
//   BluetoothEventSubscription,
// } from 'react-native-bluetooth-classic';
// Bluetooth deshabilitado temporalmente para evitar errores de módulos nativos
type BluetoothDevice = any;
type BluetoothEventSubscription = any;
import { StorageService } from './storageService';
import { Platform, PermissionsAndroid } from 'react-native';

/**
 * Bluetooth Service - Handles Bluetooth printer connections and printing
 * Maintains persistent connection like kokoro-app
 */
export class BluetoothService {
  private static connectedDevice: BluetoothDevice | null = null;
  private static eventSubscriptions: BluetoothEventSubscription[] = [];
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 3;
  private static isReconnecting = false;

  /**
   * Check if Bluetooth is available
   */
  static async isBluetoothAvailable(): Promise<boolean> {
    // Bluetooth deshabilitado temporalmente
    return false;
    /* COMENTADO TEMPORALMENTE
    try {
      return await RNBluetoothClassic.isBluetoothEnabled();
    } catch (error) {
      console.error('Error checking Bluetooth availability:', error);
      return false;
    }
    */
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
    // Bluetooth deshabilitado temporalmente
    return [];
    /* COMENTADO TEMPORALMENTE
    try {
      const devices = await RNBluetoothClassic.getBondedDevices();
      console.log('📱 Paired devices:', devices);
      return devices;
    } catch (error) {
      console.error('Error getting paired devices:', error);
      throw error;
    }
    */
  }

  /**
   * Discover Bluetooth devices
   */
  static async discoverDevices(): Promise<BluetoothDevice[]> {
    // Bluetooth deshabilitado temporalmente
    return [];
    /* COMENTADO TEMPORALMENTE
    try {
      // Start discovery and wait for devices
      await RNBluetoothClassic.startDiscovery();
      
      // Wait a bit for devices to be discovered
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Get discovered devices
      const devices = await RNBluetoothClassic.getDiscoveredDevices();
      console.log('🔍 Discovered devices:', devices);
      
      // Cancel discovery
      await RNBluetoothClassic.cancelDiscovery();
      
      return devices;
    } catch (error) {
      console.error('Error discovering devices:', error);
      // Try to cancel discovery even if there was an error
      try {
        await RNBluetoothClassic.cancelDiscovery();
      } catch (e) {
        // Ignore cancel errors
      }
      throw error;
    }
    */
  }

  /**
   * Connect to a Bluetooth device
   * Similar to kokoro-app: maintains device object in memory
   */
  static async connectToDevice(device: BluetoothDevice): Promise<boolean> {
    // Bluetooth deshabilitado temporalmente
    throw new Error('Bluetooth está deshabilitado temporalmente');
    /* COMENTADO TEMPORALMENTE
    try {
      console.log('🔌 Connecting to device:', device.address);
      
      // Disconnect from previous device if connected and different
      if (this.connectedDevice && this.connectedDevice.address !== device.address) {
        try {
          await this.connectedDevice.disconnect();
        } catch (error) {
          console.warn('Error disconnecting previous device:', error);
        }
      }

      // Connect to the new device
      const connected = await device.connect();
      if (connected) {
        this.connectedDevice = device;
        this.reconnectAttempts = 0;
        this.isReconnecting = false;
        
        // Save device address to storage
        await StorageService.setItem('bluetoothDeviceAddress', device.address);
        await StorageService.setItem('useBluetooth', 'true');
        
        // Setup disconnect listener for automatic reconnection
        this.setupDisconnectListener();
        
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
    */
  }

  /**
   * Reconnect to saved device (called on app start)
   */
  static async reconnectToSavedDevice(): Promise<boolean> {
    // Bluetooth deshabilitado temporalmente
    return false;
    /* COMENTADO TEMPORALMENTE
    try {
      const savedDeviceAddress = await StorageService.getItem('bluetoothDeviceAddress');
      const savedUseBluetooth = await StorageService.getItem('useBluetooth');
      
      if (savedUseBluetooth !== 'true' || !savedDeviceAddress) {
        return false;
      }

      const devices = await RNBluetoothClassic.getBondedDevices();
      const savedDevice = devices.find(d => d.address === savedDeviceAddress);
      
      if (savedDevice) {
        // Check if already connected
        try {
          const isConnected = await savedDevice.isConnected();
          if (isConnected) {
            this.connectedDevice = savedDevice;
            this.setupDisconnectListener();
            console.log('✅ Already connected to saved device:', savedDevice.name || savedDeviceAddress);
            return true;
          }
        } catch (error) {
          // Device not connected, proceed to connect
        }
        
        // Attempt to reconnect
        return await this.connectToDevice(savedDevice);
      }
      
      return false;
    } catch (error) {
      console.error('Error reconnecting to saved device:', error);
      return false;
    }
    */
  }

  /**
   * Setup listener for disconnect events to enable automatic reconnection
   */
  private static setupDisconnectListener(): void {
    // Remove existing listeners
    this.eventSubscriptions.forEach((subscription) => {
      subscription.remove();
    });
    this.eventSubscriptions = [];

    if (!this.connectedDevice) {
      return;
    }

    // Listen for disconnect events
    const subscription = this.connectedDevice.onDisconnected(() => {
      console.warn('⚠️ Bluetooth device disconnected');
      this.connectedDevice = null;
      
      // Attempt automatic reconnection
      if (!this.isReconnecting && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnection();
      }
    });

    this.eventSubscriptions.push(subscription);
  }

  /**
   * Attempt to reconnect to the saved device
   */
  private static async attemptReconnection(): Promise<void> {
    // Bluetooth deshabilitado temporalmente
    this.isReconnecting = false;
    return;
    /* COMENTADO TEMPORALMENTE
    if (this.isReconnecting) {
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    try {
      const savedDeviceAddress = await StorageService.getItem('bluetoothDeviceAddress');
      if (!savedDeviceAddress) {
        this.isReconnecting = false;
        return;
      }

      const devices = await RNBluetoothClassic.getBondedDevices();
      const savedDevice = devices.find(d => d.address === savedDeviceAddress);
      
      if (savedDevice) {
        console.log(`🔄 Attempting reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        await this.connectToDevice(savedDevice);
        console.log('✅ Reconnected successfully');
      }
    } catch (error) {
      console.error('❌ Reconnection attempt failed:', error);
      
      // Retry after delay if attempts remain
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.isReconnecting = false;
          this.attemptReconnection();
        }, 2000);
      } else {
        this.isReconnecting = false;
        console.error('❌ Max reconnection attempts reached');
      }
    }
    */
  }

  /**
   * Disconnect from current device
   */
  static async disconnect(): Promise<void> {
    try {
      // Remove all event subscriptions first
      this.eventSubscriptions.forEach((subscription) => {
        subscription.remove();
      });
      this.eventSubscriptions = [];
      
      if (this.connectedDevice) {
        await this.connectedDevice.disconnect();
        console.log('🔌 Disconnected from device');
      }
      
      // Clear saved device address
      await StorageService.setItem('bluetoothDeviceAddress', '');
      
      this.connectedDevice = null;
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
    } catch (error) {
      console.error('Error disconnecting:', error);
      this.connectedDevice = null;
      this.reconnectAttempts = 0;
      this.isReconnecting = false;
    }
  }

  /**
   * Check if a device is connected (async version for accurate status)
   */
  static async isConnected(): Promise<boolean> {
    if (!this.connectedDevice) {
      return false;
    }
    try {
      return await this.connectedDevice.isConnected();
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a device is connected (synchronous version)
   */
  static isConnectedSync(): boolean {
    return this.connectedDevice !== null;
  }

  /**
   * Get connected device info
   */
  static getConnectedDevice(): BluetoothDevice | null {
    return this.connectedDevice;
  }

  /**
   * Send data to connected printer
   * Similar to kokoro-app: checks connection and attempts reconnect if needed
   */
  static async sendData(data: string | Uint8Array): Promise<boolean> {
    // Bluetooth deshabilitado temporalmente
    throw new Error('Bluetooth está deshabilitado temporalmente');
    /* COMENTADO TEMPORALMENTE
    try {
      if (!this.connectedDevice) {
        // Try to reconnect to saved device
        const reconnected = await this.reconnectToSavedDevice();
        if (!reconnected) {
          throw new Error('No hay dispositivo conectado');
        }
      }

      // Check connection status
      const isConnected = await this.connectedDevice!.isConnected();
      if (!isConnected) {
        // Attempt to reconnect
        console.log('⚠️ Device not connected, attempting reconnect...');
        const reconnected = await this.reconnectToSavedDevice();
        if (!reconnected || !this.connectedDevice) {
          throw new Error('El dispositivo no está conectado');
        }
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
      await this.connectedDevice.write(dataToSend);
      console.log('✅ Data sent successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Error sending data:', error);
      throw new Error(`Error al enviar datos: ${error.message || 'Error desconocido'}`);
    }
    */
  }

  /**
   * Print test receipt
   */
  static async printTestReceipt(): Promise<boolean> {
    try {
      if (!this.isConnected()) {
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

