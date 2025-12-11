import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';
import { StorageService } from '../services/storageService';
import { Platform, PermissionsAndroid } from 'react-native';

// Tipo temporal para BluetoothDevice mientras se deshabilita el módulo
type BluetoothDevice = any;

interface BluetoothContextType {
  isBluetoothEnabled: boolean;
  setUseBluetooth: (value: boolean) => void;
  bluetoothDevice: BluetoothDevice | null;
  setBluetoothDevice: (device: BluetoothDevice | null) => void;
  bluetoothDevices: BluetoothDevice[];
  setBluetoothDevices: (devices: BluetoothDevice[]) => void;
  isScanning: boolean;
  setIsScanning: (value: boolean) => void;
  isConnecting: string | null;
  setIsConnecting: (value: string | null) => void;
  bluetoothAvailable: boolean;
  connectBluetoothDevice: (device: BluetoothDevice) => Promise<void>;
  disconnectBluetoothDevice: () => Promise<void>;
  scanBluetoothDevices: () => Promise<void>;
  sendToBluetooth: (content: string) => Promise<void>;
}

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

export const BluetoothProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [useBluetooth, setUseBluetooth] = useState(true);
  const [bluetoothDevice, setBluetoothDevice] = useState<BluetoothDevice | null>(null);
  const [bluetoothDevices, setBluetoothDevices] = useState<BluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [bluetoothAvailable, setBluetoothAvailable] = useState(true);

  // Cargar configuración guardada al iniciar
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        const savedUseBluetooth = await StorageService.getItem('useBluetooth');
        // Bluetooth deshabilitado temporalmente para evitar errores de módulos nativos
        setUseBluetooth(false);
        /* COMENTADO TEMPORALMENTE - Bluetooth deshabilitado
        if (savedUseBluetooth === 'true') {
          setUseBluetooth(true);
          // Intentar reconectar al dispositivo guardado
          if (savedDeviceAddress) {
            try {
              const devices = await RNBluetoothClassic.getBondedDevices();
              const savedDevice = devices.find(d => d.address === savedDeviceAddress);
              if (savedDevice) {
                // Verificar si ya está conectado
                try {
                  const isConnected = await savedDevice.isConnected();
                  if (isConnected) {
                    setBluetoothDevice(savedDevice);
                    console.log('✅ Already connected to saved device:', savedDevice.name || savedDeviceAddress);
                  }
                } catch (error) {
                  // No está conectado, no hacer nada
                }
              }
            } catch (error) {
              console.error('Error loading saved Bluetooth device:', error);
            }
          }
        } else if (savedUseBluetooth === 'false') {
          setUseBluetooth(false);
        } else {
          setUseBluetooth(true); // Default
        }
        */
      } catch (error) {
        console.error('Error loading saved settings:', error);
      }
    };

    loadSavedSettings();
    // checkBluetooth(); // Comentado temporalmente
  }, []);

  const checkBluetooth = async () => {
    // Bluetooth deshabilitado temporalmente
    setBluetoothAvailable(false);
    /* COMENTADO TEMPORALMENTE
    try {
      const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
      setBluetoothAvailable(isEnabled !== undefined && isEnabled !== null);
    } catch (error) {
      console.warn('Bluetooth check failed:', error);
      setBluetoothAvailable(false);
    }
    */
  };

  const requestBluetoothPermissions = async (): Promise<boolean> => {
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
  };

  const scanBluetoothDevices = async () => {
    // Bluetooth deshabilitado temporalmente
    throw new Error('Bluetooth está deshabilitado temporalmente');
    /* COMENTADO TEMPORALMENTE
    setIsScanning(true);
    setBluetoothDevices([]);

    try {
      const hasPermission = await requestBluetoothPermissions();
      if (!hasPermission) {
        throw new Error('Se necesitan permisos de Bluetooth para escanear dispositivos');
      }

      const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!isEnabled) {
        throw new Error('Por favor activa Bluetooth en tu dispositivo');
      }

      const devices = await RNBluetoothClassic.getBondedDevices();
      setBluetoothDevices(devices);
      
      if (devices.length === 0) {
        throw new Error('No se encontraron dispositivos Bluetooth emparejados. Por favor empareja tu impresora primero en la configuración de Bluetooth del dispositivo.');
      }
    } catch (error: any) {
      console.error('Bluetooth scan error:', error);
      // Asegurarse de limpiar el estado
      setBluetoothDevices([]);
      // Lanzar error con mensaje descriptivo
      const errorMessage = error?.message || 'Error desconocido al escanear dispositivos Bluetooth';
      throw new Error(errorMessage);
    } finally {
      setIsScanning(false);
    }
    */
  };

  const connectBluetoothDevice = async (device: BluetoothDevice) => {
    // Bluetooth deshabilitado temporalmente
    throw new Error('Bluetooth está deshabilitado temporalmente');
    /* COMENTADO TEMPORALMENTE
    // Desconectar cualquier dispositivo conectado previamente (como kokoro-app)
    if (bluetoothDevice && bluetoothDevice.address !== device.address) {
      try {
        await bluetoothDevice.disconnect();
      } catch (error) {
        console.warn('Error disconnecting previous device:', error);
        // No lanzar error aquí, continuar con la conexión
      }
    }

    setIsConnecting(device.address);
    try {
      // Verificar permisos antes de conectar
      if (Platform.OS === 'android') {
        const hasPermission = await requestBluetoothPermissions();
        if (!hasPermission) {
          throw new Error('Se necesitan permisos de Bluetooth para conectar dispositivos');
        }
      }

      // Verificar que Bluetooth esté habilitado
      const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!isEnabled) {
        throw new Error('Por favor activa Bluetooth en tu dispositivo');
      }

      // Conectar directamente como kokoro-app
      let connected = false;
      try {
        connected = await device.connect();
      } catch (connectError: any) {
        // Capturar errores específicos de conexión
        const errorMessage = connectError?.message || 'Error desconocido';
        if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
          throw new Error('Tiempo de espera agotado. El dispositivo no respondió.');
        } else if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
          throw new Error('Permisos de Bluetooth insuficientes. Verifica los permisos en la configuración del dispositivo.');
        } else if (errorMessage.includes('already') || errorMessage.includes('Already')) {
          // Si ya está conectado, verificar y usar el dispositivo
          try {
            const isConnected = await device.isConnected();
            if (isConnected) {
              setBluetoothDevice(device);
              setUseBluetooth(true);
              await StorageService.setItem('bluetoothDeviceAddress', device.address);
              await StorageService.setItem('useBluetooth', 'true');
              console.log('✅ Device already connected:', device.name || device.address);
              return; // Salir exitosamente
            }
          } catch (checkError) {
            // Continuar con el error original
          }
          throw new Error('El dispositivo ya está conectado a otro dispositivo o aplicación.');
        } else {
          throw new Error(`Error de conexión: ${errorMessage}`);
        }
      }

      if (connected) {
        // Verificar que la conexión sea válida
        try {
          const isConnected = await device.isConnected();
          if (!isConnected) {
            throw new Error('La conexión se estableció pero el dispositivo no está disponible');
          }
        } catch (verifyError: any) {
          throw new Error('No se pudo verificar la conexión con el dispositivo');
        }

        // Guardar el objeto device (que tiene el método write), no el resultado boolean
        setBluetoothDevice(device);
        setUseBluetooth(true);
        
        // Guardar en storage
        try {
          await StorageService.setItem('bluetoothDeviceAddress', device.address);
          await StorageService.setItem('useBluetooth', 'true');
        } catch (storageError) {
          console.warn('Error saving Bluetooth settings:', storageError);
          // No lanzar error, la conexión fue exitosa
        }
        
        console.log('✅ Connected to device:', device.name || device.address);
      } else {
        throw new Error('No se pudo establecer la conexión. El dispositivo puede estar apagado o fuera de alcance.');
      }
    } catch (error: any) {
      console.error('Bluetooth connect error:', error);
      // Asegurarse de limpiar el estado de conexión
      setIsConnecting(null);
      // Lanzar error con mensaje descriptivo
      const errorMessage = error?.message || 'Error desconocido al conectar al dispositivo Bluetooth';
      throw new Error(errorMessage);
    } finally {
      setIsConnecting(null);
    }
    */
  };

  const disconnectBluetoothDevice = async () => {
    // Bluetooth deshabilitado temporalmente
    setBluetoothDevice(null);
    setUseBluetooth(false);
    /* COMENTADO TEMPORALMENTE
    try {
      if (bluetoothDevice) {
        await bluetoothDevice.disconnect();
      }
      
      // Limpiar storage
      await StorageService.setItem('bluetoothDeviceAddress', '');
      
      setBluetoothDevice(null);
      setUseBluetooth(false);
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      setBluetoothDevice(null);
      setUseBluetooth(false);
      throw error;
    }
    */
  };

  const sendToBluetooth = async (content: string) => {
    // Bluetooth deshabilitado temporalmente
    throw new Error('Bluetooth está deshabilitado temporalmente');
    /* COMENTADO TEMPORALMENTE
    if (!bluetoothDevice) {
      throw new Error('No hay dispositivo Bluetooth conectado');
    }

    try {
      // Verificar conexión usando el método isConnected() del BluetoothDevice (como kokoro-app)
      const isConnected = await bluetoothDevice.isConnected();
      if (!isConnected) {
        throw new Error('Dispositivo Bluetooth desconectado');
      }

      // El método write() del BluetoothDevice acepta string o Buffer
      await bluetoothDevice.write(content);
    } catch (error: any) {
      console.error('Error sending to Bluetooth:', error);
      throw error;
    }
    */
  };

  return (
    <BluetoothContext.Provider
      value={{
        isBluetoothEnabled: useBluetooth,
        setUseBluetooth,
        bluetoothDevice,
        setBluetoothDevice,
        bluetoothDevices,
        setBluetoothDevices,
        isScanning,
        setIsScanning,
        isConnecting,
        setIsConnecting,
        bluetoothAvailable,
        connectBluetoothDevice,
        disconnectBluetoothDevice,
        scanBluetoothDevices,
        sendToBluetooth,
      }}
    >
      {children}
    </BluetoothContext.Provider>
  );
};

export const useBluetooth = (): BluetoothContextType => {
  const context = useContext(BluetoothContext);
  if (!context) {
    throw new Error('useBluetooth must be used within a BluetoothProvider');
  }
  return context;
};

