import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import { StorageService } from '../services/storageService';
import { LecrepeBluetoothService } from '../services/lecrepeBluetoothService';
import type { BluetoothDevice } from '../services/lecrepeBluetoothService';

// Use native module instead of react-native-bluetooth-classic
const { LecrepeBluetooth } = NativeModules;

// Importación dinámica del módulo de Bluetooth para evitar inicialización inmediata
let RNBluetoothClassic: any = null;
let RNBluetoothDeviceClass: any = null;

// Función helper para obtener el módulo de Bluetooth de forma segura
const getBluetoothModule = async () => {
  if (RNBluetoothClassic === null) {
    try {
      const bluetoothModule = await import('react-native-bluetooth-classic');
      RNBluetoothClassic = bluetoothModule.default;
      // BluetoothDevice es solo un tipo, no un valor exportado
      // Los dispositivos se obtienen a través de los métodos del módulo
      RNBluetoothDeviceClass = null;
      
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
      RNBluetoothDeviceClass = null;
    }
  }
  return { RNBluetoothClassic, BluetoothDevice: RNBluetoothDeviceClass };
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
      const { RNBluetoothClassic } = await getBluetoothModule();
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
      console.error('Bluetooth check failed:', error?.message || error);
      // En simulador o si Bluetooth no está disponible, deshabilitar
      setBluetoothAvailable(false);
      // No lanzar error, solo deshabilitar la funcionalidad
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

      const { RNBluetoothClassic } = await getBluetoothModule();
      
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

      const { RNBluetoothClassic } = await getBluetoothModule();
      
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
      console.error('Bluetooth connect error:', error);
      // Asegurarse de limpiar el estado de conexión
      setIsConnecting(null);
      // Lanzar error con mensaje descriptivo
      const errorMessage = error?.message || 'Error desconocido al conectar al dispositivo Bluetooth';
      throw new Error(errorMessage);
    } finally {
      setIsConnecting(null);
    }
  };

  const disconnectBluetoothDevice = async () => {
    try {
      await LecrepeBluetoothService.disconnect();
      
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
  };

  const sendToBluetooth = async (content: string) => {
    if (!bluetoothDevice) {
      throw new Error('No hay dispositivo Bluetooth conectado');
    }

    try {
      // Verificar conexión
      const isConnected = await LecrepeBluetoothService.isConnected();
      if (!isConnected) {
        throw new Error('Dispositivo Bluetooth desconectado');
      }

      // Enviar datos usando el servicio nativo
      await LecrepeBluetoothService.sendData(content);
    } catch (error: any) {
      console.error('Error sending to Bluetooth:', error);
      throw error;
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
