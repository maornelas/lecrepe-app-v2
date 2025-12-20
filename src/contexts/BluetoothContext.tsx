import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import { StorageService } from '../services/storageService';
import { LecrepeBluetoothService } from '../services/lecrepeBluetoothService';
import type { BluetoothDevice } from '../services/lecrepeBluetoothService';

// Use native module instead of react-native-bluetooth-classic
const { LecrepeBluetooth } = NativeModules;

// Importación del módulo de Bluetooth usando require para compatibilidad con release
let RNBluetoothClassic: any = null;

// Función helper para obtener el módulo de Bluetooth de forma segura
const getBluetoothModule = () => {
  if (RNBluetoothClassic === null) {
    try {
      const bluetoothModule = require('react-native-bluetooth-classic');
      RNBluetoothClassic = bluetoothModule.default || bluetoothModule;
      
      // Verificar que el módulo se cargó correctamente
      if (!RNBluetoothClassic) {
        throw new Error('El módulo de Bluetooth no se pudo cargar correctamente');
      }
    } catch (error: any) {
      console.error('Failed to load Bluetooth module:', error);
      // Retornar un objeto mock para evitar crashes
      RNBluetoothClassic = {
        isBluetoothEnabled: async () => {
          throw new Error('Bluetooth no está disponible en este dispositivo');
        },
        getBondedDevices: async () => {
          throw new Error('Bluetooth no está disponible en este dispositivo');
        },
      };
    }
  }
  return RNBluetoothClassic;
};

interface BluetoothContextType {
  isBluetoothEnabled: boolean;
  setUseBluetooth: (value: boolean) => void;
  bluetoothDevice: any | null;
  setBluetoothDevice: (device: any | null) => void;
  bluetoothDevices: any[];
  setBluetoothDevices: (devices: any[]) => void;
  isScanning: boolean;
  setIsScanning: (value: boolean) => void;
  isConnecting: string | null;
  setIsConnecting: (value: string | null) => void;
  bluetoothAvailable: boolean;
  checkBluetooth: () => Promise<void>;
  connectBluetoothDevice: (device: any) => Promise<void>;
  disconnectBluetoothDevice: () => Promise<void>;
  scanBluetoothDevices: () => Promise<void>;
  sendToBluetooth: (content: string) => Promise<void>;
}

const BluetoothContext = createContext<BluetoothContextType | undefined>(undefined);

export const BluetoothProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [useBluetooth, setUseBluetooth] = useState(false); // Iniciar como false
  const [bluetoothDevice, setBluetoothDevice] = useState<any | null>(null);
  const [bluetoothDevices, setBluetoothDevices] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [bluetoothAvailable, setBluetoothAvailable] = useState(false); // Iniciar como false hasta verificar
  const [isInitialized, setIsInitialized] = useState(false);

  // Definir checkBluetooth antes del useEffect que lo usa
  const checkBluetooth = async () => {
    try {
      const RNBluetoothClassic = getBluetoothModule();
      // Verificar si el módulo está disponible (no es el mock)
      if (!RNBluetoothClassic || typeof RNBluetoothClassic.isBluetoothEnabled !== 'function') {
        console.warn('Bluetooth module not available');
        setBluetoothAvailable(false);
        return;
      }
      
      // Intentar verificar Bluetooth sin requerir permisos primero
      // Si falla por permisos, asumimos que Bluetooth está disponible pero necesita permisos
      try {
        const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
        setBluetoothAvailable(isEnabled !== undefined && isEnabled !== null && isEnabled === true);
      } catch (permissionError: any) {
        // Si el error es por permisos, asumimos que Bluetooth está disponible
        // pero necesita permisos para funcionar
        if (permissionError?.message?.includes('permission') || 
            permissionError?.message?.includes('Permission') ||
            permissionError?.code === 'E_PERMISSION_DENIED') {
          console.log('Bluetooth available but permissions needed');
          setBluetoothAvailable(true); // Disponible pero necesita permisos
        } else {
          // Otro tipo de error, Bluetooth no disponible
          console.warn('Bluetooth check failed:', permissionError?.message || permissionError);
          setBluetoothAvailable(false);
        }
      }
    } catch (error: any) {
      const detailed = getErrorDetails(error, 'checkBluetooth');
      console.error('Bluetooth check failed:', detailed, { stack: error?.stack });
      setBluetoothAvailable(false);
    }
  };

  // Cargar configuración guardada al iniciar y verificar disponibilidad de Bluetooth
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedUseBluetooth = await StorageService.getItem('useBluetooth');
        if (savedUseBluetooth === 'false') {
          setUseBluetooth(false);
        }
        setIsInitialized(true);
        
        // Verificar disponibilidad de Bluetooth después de cargar configuración
        // Esto se hace de forma asíncrona y no bloquea la inicialización
        setTimeout(() => {
          checkBluetooth().catch(err => {
            console.warn('Error checking Bluetooth availability:', err);
          });
        }, 500);
      } catch (error) {
        console.error('Error loading saved settings:', error);
        setIsInitialized(true);
      }
    };
    
    loadSettings();
  }, []);

  // Esta función ya no se usa, pero la mantenemos por si acaso
  const initializeBluetooth = async () => {
    // No hacer nada - Bluetooth se inicializará solo cuando el usuario lo necesite
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
    setIsScanning(true);
    setBluetoothDevices([]);

    try {
      // Primero verificar permisos
      const hasPermission = await requestBluetoothPermissions();
      if (!hasPermission) {
        throw new Error('Se necesitan permisos de Bluetooth para escanear dispositivos. Por favor, otorga los permisos en la configuración de la aplicación.');
      }

      const RNBluetoothClassic = getBluetoothModule();
      
      // Verificar que el módulo esté disponible
      if (!RNBluetoothClassic || typeof RNBluetoothClassic.isBluetoothEnabled !== 'function') {
        throw new Error('El funcionamiento del Bluetooth no está disponible en este dispositivo o no se puede iniciar correctamente. Verifica que tu dispositivo tenga Bluetooth habilitado.');
      }

      // Verificar si Bluetooth está habilitado
      const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!isEnabled) {
        throw new Error('Por favor activa Bluetooth en tu dispositivo');
      }

      // Escanear dispositivos
      const devices = await RNBluetoothClassic.getBondedDevices();
      setBluetoothDevices(devices);

      if (devices.length === 0) {
        // Provide an informative error message including the devices we got (if any)
        throw new Error('No se encontraron dispositivos Bluetooth emparejados. Por favor empareja tu impresora primero en la configuración de Bluetooth del dispositivo.');
      }
    } catch (error: any) {
      const detailed = getErrorDetails(error, 'scanBluetoothDevices');
      console.error('Bluetooth scan error:', detailed, { original: error });
      setBluetoothDevices([]);
      const errorMessage = detailed.message || 'Error desconocido al escanear dispositivos Bluetooth';
      // Re-throw an error with more context so UIs/consumers can show it
      const errToThrow: any = new Error(errorMessage);
      errToThrow.status = detailed.status;
      errToThrow.responseBody = detailed.responseBody;
      throw errToThrow;
    } finally {
      setIsScanning(false);
    }
  };

  const connectBluetoothDevice = async (device: any) => {
    // Desconectar cualquier dispositivo conectado previamente (como kokoro-app)
    if (bluetoothDevice && bluetoothDevice.address !== device.address) {
      try {
        await LecrepeBluetoothService.disconnect();
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

      const RNBluetoothClassic = getBluetoothModule();
      
      // Verificar que Bluetooth esté habilitado
      const isEnabled = await LecrepeBluetoothService.isBluetoothAvailable();
      if (!isEnabled) {
        throw new Error('Por favor activa Bluetooth en tu dispositivo');
      }

      // Conectar usando el servicio nativo
      const connected = await LecrepeBluetoothService.connectToDevice(device);

      if (connected) {
        // Guardar el dispositivo
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
      const detailed = getErrorDetails(error, 'connectBluetoothDevice');
      console.error('Bluetooth connect error:', detailed, { device, original: error });
      setIsConnecting(null);
      const errorMessage = detailed.message || 'Error desconocido al conectar al dispositivo Bluetooth';
      const errToThrow: any = new Error(errorMessage);
      errToThrow.status = detailed.status;
      errToThrow.responseBody = detailed.responseBody;
      throw errToThrow;
    } finally {
      setIsConnecting(null);
    }
  };

  const disconnectBluetoothDevice = async () => {
    try {
      await LecrepeBluetoothService.disconnect();
      await StorageService.setItem('bluetoothDeviceAddress', '');
      setBluetoothDevice(null);
      setUseBluetooth(false);
    } catch (error: any) {
      const detailed = getErrorDetails(error, 'disconnectBluetoothDevice');
      console.error('Error disconnecting:', detailed, { original: error });
      setBluetoothDevice(null);
      setUseBluetooth(false);
      const errToThrow: any = new Error(detailed.message || 'Error al desconectar');
      errToThrow.status = detailed.status;
      throw errToThrow;
    }
  };

  const sendToBluetooth = async (content: string) => {
    if (!bluetoothDevice) {
      throw new Error('No hay dispositivo Bluetooth conectado');
    }

    try {
      // Intentar enviar directamente - el método sendData ya maneja la verificación de conexión
      // y los errores de manera más robusta
      await LecrepeBluetoothService.sendData(content);
    } catch (error: any) {
      const detailed = getErrorDetails(error, 'sendToBluetooth');
      console.error('Error sending to Bluetooth:', detailed, { content, device: bluetoothDevice, original: error });
      const errToThrow: any = new Error(detailed.message || 'Error al enviar datos por Bluetooth');
      errToThrow.status = detailed.status;
      errToThrow.responseBody = detailed.responseBody;
      throw errToThrow;
    }
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
        checkBluetooth,
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

// New: helper types & forward helper for detailed errors
type AnyError = any;
interface DetailedError extends Error {
  status?: number | string;
  code?: string;
  responseBody?: any;
  originalError?: AnyError;
}

const getErrorDetails = (err: AnyError, context?: string): DetailedError => {
  const detailed: DetailedError = new Error(err?.message || String(err || 'Unknown error'));
  detailed.originalError = err;

  // Try to extract common fields from fetch/axios/native errors
  if (err?.status || err?.statusCode) {
    detailed.status = err.status || err.statusCode;
  } else if (err?.response?.status) {
    detailed.status = err.response.status;
  }

  if (err?.code) {
    detailed.code = err.code;
  }

  if (err?.response?.data) {
    detailed.responseBody = err.response.data;
  } else if (err?.body) {
    detailed.responseBody = err.body;
  } else if (err?.message) {
    // sometimes server returns JSON string in message
    try {
      const parsed = JSON.parse(err.message);
      detailed.responseBody = parsed;
    } catch {
      // ignore
    }
  }

  // Add context prefix to message to make it clearer in logs
  if (context) {
    detailed.message = `${context}: ${detailed.message}`;
  }

  return detailed;
};

// Exported util so other UI components (eg KitchenScreen) can format the error nicely
export const formatErrorForUI = (err: AnyError, context?: string): string => {
  const d = getErrorDetails(err, context);
  let msg = d.message || 'Error desconocido';
  if (d.status) msg += ` (status: ${d.status})`;
  if (d.code) msg += ` (code: ${d.code})`;
  if (d.responseBody) {
    try {
      const pretty = typeof d.responseBody === 'string' ? d.responseBody : JSON.stringify(d.responseBody);
      msg += ` response: ${pretty}`;
    } catch {
      // ignore
    }
  }
  return msg;
};
