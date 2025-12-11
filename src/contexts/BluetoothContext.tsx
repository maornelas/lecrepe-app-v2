import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import { StorageService } from '../services/storageService';
import { LecrepeBluetoothService, BluetoothDevice } from '../services/lecrepeBluetoothService';

// Use native module instead of react-native-bluetooth-classic
const { LecrepeBluetooth } = NativeModules;

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
        const savedDeviceAddress = await StorageService.getItem('bluetoothDeviceAddress');

        if (savedUseBluetooth === 'true') {
          setUseBluetooth(true);
          // Intentar reconectar al dispositivo guardado
          if (savedDeviceAddress) {
            try {
              if (LecrepeBluetooth) {
                const devices = await LecrepeBluetoothService.getPairedDevices();
                const savedDevice = devices.find(d => d.address === savedDeviceAddress);
                if (savedDevice) {
                  // Verificar si ya está conectado
                  try {
                    const isConnected = await LecrepeBluetoothService.isConnected();
                    if (isConnected) {
                      setBluetoothDevice(savedDevice);
                      console.log('✅ Already connected to saved device:', savedDevice.name || savedDeviceAddress);
                    }
                  } catch (error) {
                    // No está conectado, no hacer nada
                    console.log('Device not connected:', error);
                  }
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
      } catch (error) {
        console.error('Error loading saved settings:', error);
      }
    };

    loadSavedSettings();
    checkBluetooth();
  }, []);

  const checkBluetooth = async () => {
    try {
      if (!LecrepeBluetooth) {
        setBluetoothAvailable(false);
        return;
      }

      const isEnabled = await LecrepeBluetoothService.isBluetoothAvailable();
      setBluetoothAvailable(isEnabled);
    } catch (error) {
      console.warn('Bluetooth check failed:', error);
      setBluetoothAvailable(false);
    }
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
      if (!LecrepeBluetooth) {
        throw new Error('El módulo Bluetooth no está disponible');
      }

      const hasPermission = await requestBluetoothPermissions();
      if (!hasPermission) {
        throw new Error('Se necesitan permisos de Bluetooth para escanear dispositivos');
      }

      const isEnabled = await LecrepeBluetoothService.isBluetoothAvailable();
      if (!isEnabled) {
        throw new Error('Por favor activa Bluetooth en tu dispositivo');
      }

      const devices = await LecrepeBluetoothService.getPairedDevices();
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

  const connectBluetoothDevice = async (device: BluetoothDevice) => {
    // Desconectar cualquier dispositivo conectado previamente
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
