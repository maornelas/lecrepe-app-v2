import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import NetInfo from '@react-native-community/netinfo';
import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import RNFS from 'react-native-fs';
// Import Bluetooth
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import type { BluetoothDevice } from 'react-native-bluetooth-classic';

// Declaración de tipos para TextEncoder (disponible en React Native)
declare const TextEncoder: {
  new (): {
    encode(input: string): Uint8Array;
  };
};

interface Order {
  _id: string;
  id_store: number;
  id_order: number;
  name: string;
  togo: boolean;
  date: string;
  status: string;
  products: Array<{
    product_id: number;
    product_name: string;
    type_id: number;
    type_name: string;
    type_price: number;
    toppings: any[];
    extras: any[];
    units: number;
  }>;
  payment: {
    _id: string;
    amount: number;
  };
}

const App = () => {
  const [printerIP, setPrinterIP] = useState('192.168.1.26');
  const [printerPort, setPrinterPort] = useState('9100');
  const [isPrinting, setIsPrinting] = useState<string | null>(null);
  const [localIP, setLocalIP] = useState('Obteniendo...');
  const [orders, setOrders] = useState<Order[]>([]);
  const [closedOrders, setClosedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'orders' | 'settings'>('orders');
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');
  
  // Bluetooth state
  const [useBluetooth, setUseBluetooth] = useState(false);
  const [bluetoothDevice, setBluetoothDevice] = useState<BluetoothDevice | null>(null);
  const [bluetoothDevices, setBluetoothDevices] = useState<BluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [bluetoothAvailable, setBluetoothAvailable] = useState(true); // Asumir disponible por defecto

  const API_URL = 'https://api-tepozan.ketxal.com:81/v1.0/order/get/store/5';
  const API_CLOSED_URL = 'https://api-tepozan.ketxal.com:81/v1.0/order/getClosed/store/5';

  useEffect(() => {
    const getLocalIP = async () => {
      try {
        const state = await NetInfo.fetch();
        if (state.details && 'ipAddress' in state.details && typeof state.details.ipAddress === 'string') {
          setLocalIP(state.details.ipAddress || 'No disponible');
        } else {
          setLocalIP('No disponible');
        }
      } catch (error) {
        setLocalIP('Error al obtener IP');
      }
    };

    // Verificar si Bluetooth está disponible
    const checkBluetooth = async () => {
      try {
        const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
        setBluetoothAvailable(isEnabled !== undefined && isEnabled !== null);
        console.log('Bluetooth available:', isEnabled);
      } catch (error) {
        console.warn('Bluetooth check failed:', error);
        setBluetoothAvailable(false);
      }
    };

    getLocalIP();
    checkBluetooth();
    
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.details && 'ipAddress' in state.details && typeof state.details.ipAddress === 'string') {
        setLocalIP(state.details.ipAddress || 'No disponible');
      }
    });

    // Cargar órdenes iniciales
    fetchOrders();
    fetchClosedOrders();

    // Polling cada 5 segundos para actualizar ambas APIs (silent para no mostrar loading)
    const intervalId = setInterval(() => {
      fetchOrders(true);
      fetchClosedOrders(true);
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const fetchOrders = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      console.log('Fetching active orders from:', API_URL);
      
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Active orders received:', data);
      console.log('Number of active orders:', Array.isArray(data) ? data.length : 0);
      
      setOrders(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching active orders:', error);
      if (!silent) {
        Alert.alert(
          'Error al cargar órdenes activas', 
          `No se pudieron cargar las órdenes.\n\nError: ${error.message}\n\nVerifica la conexión a internet y que el servidor esté disponible.`
        );
      }
      setOrders([]);
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const fetchClosedOrders = async (silent: boolean = false) => {
    try {
      console.log('Fetching closed orders from:', API_CLOSED_URL);
      
      const response = await fetch(API_CLOSED_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Closed orders response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Closed orders received:', data);
      console.log('Number of closed orders:', Array.isArray(data) ? data.length : 0);
      
      setClosedOrders(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching closed orders:', error);
      if (!silent) {
        Alert.alert(
          'Error al cargar órdenes cerradas', 
          `No se pudieron cargar las órdenes cerradas.\n\nError: ${error.message}`
        );
      }
      setClosedOrders([]);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
    fetchClosedOrders();
  };

  // Bluetooth functions
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
      console.warn(err);
      return false;
    }
  };

  const scanBluetoothDevices = async () => {
    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      Alert.alert('Permisos', 'Se necesitan permisos de Bluetooth para escanear dispositivos');
      return;
    }

    setIsScanning(true);
    setBluetoothDevices([]);

    try {
      const isEnabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!isEnabled) {
        Alert.alert('Bluetooth', 'Por favor activa Bluetooth en tu dispositivo');
        setIsScanning(false);
        return;
      }

      const devices = await RNBluetoothClassic.getBondedDevices();
      setBluetoothDevices(devices);
      
      if (devices.length === 0) {
        Alert.alert('Dispositivos', 'No se encontraron dispositivos Bluetooth emparejados. Por favor empareja tu impresora primero en la configuración de Bluetooth del dispositivo.');
      }
    } catch (error: any) {
      console.error('Bluetooth scan error:', error);
      Alert.alert('Error', 'Error al escanear dispositivos: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsScanning(false);
    }
  };

  const connectBluetoothDevice = async (device: BluetoothDevice) => {
    setIsConnecting(true);
    try {
      const connected = await device.connect();
      if (connected) {
        // Guardar el objeto device (que tiene el método write), no el resultado boolean
        setBluetoothDevice(device);
        setUseBluetooth(true);
        Alert.alert('Éxito', `Conectado a ${device.name || device.address}`);
      } else {
        throw new Error('No se pudo establecer la conexión');
      }
    } catch (error: any) {
      console.error('Bluetooth connect error:', error);
      Alert.alert('Error', 'Error al conectar: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectBluetoothDevice = async () => {
    try {
      if (bluetoothDevice) {
        await bluetoothDevice.disconnect();
        setBluetoothDevice(null);
        setUseBluetooth(false);
        Alert.alert('Desconectado', 'Dispositivo Bluetooth desconectado');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Error al desconectar: ' + error.message);
    }
  };

  const sendToBluetooth = async (content: string) => {
    if (!bluetoothDevice) {
      throw new Error('No hay dispositivo Bluetooth conectado');
    }

    try {
      // Verificar conexión usando el método isConnected() del BluetoothDevice
      const isConnected = await bluetoothDevice.isConnected();
      if (!isConnected) {
        throw new Error('Dispositivo Bluetooth desconectado');
      }

      // El método write() del BluetoothDevice acepta string o Buffer
      // y devuelve Promise<boolean>
      await bluetoothDevice.write(content);
    } catch (error: any) {
      console.error('Error sending to Bluetooth:', error);
      throw error;
    }
  };

  const handlePrint = (order: Order) => {
    if (!useBluetooth && (!printerIP || !printerPort)) {
      Alert.alert('Error', 'Por favor configura la impresora (IP/Puerto o Bluetooth)');
      return;
    }
    
    if (useBluetooth && !bluetoothDevice) {
      Alert.alert('Error', 'Por favor conecta un dispositivo Bluetooth');
      return;
    }

    setIsPrinting(order._id);

    // Constante para precio de para llevar
    const TOGO_PRICE = 10; // Ajusta este valor según tu configuración
    // Ajustado para impresora de 58mm (32 caracteres por línea)
    const anchoCantidad = useBluetooth ? 4 : 6; // Ancho para cantidad (58mm: 4, 80mm: 6)
    const anchoDescripcion = useBluetooth ? 18 : 28; // Ancho para descripción (58mm: 18, 80mm: 28)
    const anchoPrecio = useBluetooth ? 8 : 11; // Ancho para precio (58mm: 8, 80mm: 11)

    // Comandos ESC/POS
    const ESC = '\x1B';
    const centerText = ESC + 'a' + '\x01'; // Centrar
    const leftAlign = ESC + 'a' + '\x00'; // Izquierda
    const resetFormat = ESC + '@'; // Reset
    const lineFeed = '\n';
    const doubleSizeBold = ESC + '!' + '\x38'; // Doble tamaño y negritas
    const normalSize = ESC + '!' + '\x00'; // Tamaño normal

    // Generar encabezado
    const header = resetFormat + centerText + 
                   doubleSizeBold + 'KOKORO' + normalSize;

    let salida = "";
    let total = 0;
    let totalParaLlevar = 0;

    // Procesar productos (igual que la implementación anterior)
    order?.products.forEach(element => {
      const { units, product_name, type_price, type_name } = element;
      // Normalizar para quitar acentos
      const cleanTypeName = type_name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // Construir la línea completa sin saltos de línea intermedios
      const cantidad = units.toString().padEnd(anchoCantidad);
      const productDesc = `${product_name.replace("Bebidas", "")} ${cleanTypeName}`;
      const descripcion = productDesc.substring(0, anchoDescripcion).padEnd(anchoDescripcion);
      const precio = `$${type_price.toFixed(2)}`.padStart(anchoPrecio);
      salida += `${cantidad}${descripcion}${precio}${lineFeed}`;

      // Calcular total del producto
      total += type_price * units;

      // Procesar extras si existen
      if (element?.extras !== undefined && Array.isArray(element.extras)) {
        element?.extras.forEach((extra: any) => {
          const cantidadExtra = "-".padEnd(anchoCantidad);
          const extraDesc = `  +${extra.name}`;
          const descripcionExtra = extraDesc.substring(0, anchoDescripcion).padEnd(anchoDescripcion);
          const precioExtra = `$${extra.price.toFixed(2)}`.padStart(anchoPrecio);
          salida += `${cantidadExtra}${descripcionExtra}${precioExtra}${lineFeed}`;
          total += extra.price;
        });
      }
    });

    // Total para llevar (igual que la implementación anterior)
    if (order.togo) {
      const bebidasCount = order?.products?.filter(
        product => product.product_name === 'Bebidas'
      ).length || 0;
      totalParaLlevar = (order?.products?.length - bebidasCount) * TOGO_PRICE;
    }

    // Generar ticket - Ajustado para 58mm o 80mm según el tipo de conexión
    const separator = useBluetooth ? '--------------------------------' : '---------------------------------------------';
    const orderNameLine = useBluetooth 
      ? `Nombre: ${order.name.length > 30 ? order.name.substring(0, 27) + '...' : order.name}\n`
      : `Nombre Orden: ${order.name}\n`;
    const headerLine = useBluetooth 
      ? 'CANT DESCRIPCION      TOTAL\n'
      : 'CANT   DESCRIPCION                  TOTAL\n';
    
    const ticketContent = resetFormat + 
      header + lineFeed + // KOKORO en grande y negritas
      centerText + `
-- KOKORO  --
CD. MANUEL DOBLADO
Tel: 432-100-4990
` + leftAlign + `
${separator}
Fecha: ${new Date().toLocaleDateString()}  
Hora: ${new Date().toLocaleTimeString()}
Orden No: ${order.id_order}
${orderNameLine}${separator}
${headerLine}${separator}
${salida}
${separator}
SUBTOTAL:            ${useBluetooth ? '' : '\t\t'}$${total.toFixed(2)}
${totalParaLlevar > 0 ? `PARA LLEVAR:         ${useBluetooth ? '' : '\t\t'}$${totalParaLlevar.toFixed(2)}\n` : ''}${separator}
TOTAL A PAGAR:        ${useBluetooth ? '' : '\t\t'}$${(total+totalParaLlevar).toFixed(2)}
${separator}
` + centerText + `
        GRACIAS POR TU COMPRA
        VUELVE PRONTO :)
` + leftAlign + `
${separator}

${'\n'.repeat(useBluetooth ? 5 : 10)}
` + resetFormat;

    // Usar Bluetooth o TCP según la configuración
    if (useBluetooth && bluetoothDevice) {
      sendToBluetooth(ticketContent)
        .then(() => {
          setIsPrinting(null);
          Alert.alert('Éxito', `Orden #${order.id_order} enviada a impresora Bluetooth`);
        })
        .catch((error: any) => {
          setIsPrinting(null);
          Alert.alert('Error', 'Error al enviar a impresora Bluetooth: ' + error.message);
        });
    } else {
      const client = TcpSocket.createConnection(
        {
          host: printerIP,
          port: parseInt(printerPort, 10),
        },
        () => {
          try {
            // Usar TextEncoder en lugar de Buffer (que no existe en React Native)
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(ticketContent);
            // Usar Uint8Array directamente
            client.write(uint8Array as any);
            
            setTimeout(() => {
              client.destroy();
              setIsPrinting(null);
              Alert.alert('Éxito', `Orden #${order.id_order} enviada a impresora`);
            }, 500);
          } catch (error: any) {
            client.destroy();
            setIsPrinting(null);
            Alert.alert('Error', 'Error al enviar datos: ' + error.message);
          }
        }
      );

      client.on('error', (error: any) => {
        client.destroy();
        setIsPrinting(null);
        Alert.alert(
          'Error de conexión',
          'No se pudo conectar a la impresora.\n\nVerifica:\n- IP correcta: ' + printerIP + '\n- Puerto: ' + printerPort + '\n- Que la tablet esté en la misma red WiFi'
        );
      });

      client.on('close', () => {
        setIsPrinting(null);
      });

      setTimeout(() => {
        if (client && !client.destroyed) {
          client.destroy();
          setIsPrinting(null);
          Alert.alert('Timeout', 'La impresora no respondió. Verifica la conexión.');
        }
      }, 10000);
    }
  };

  const handleDayClose = () => {
    if (!useBluetooth && (!printerIP || !printerPort)) {
      Alert.alert('Error', 'Por favor configura la impresora (IP/Puerto o Bluetooth)');
      return;
    }
    
    if (useBluetooth && !bluetoothDevice) {
      Alert.alert('Error', 'Por favor conecta un dispositivo Bluetooth');
      return;
    }

    setIsPrinting('dayClose');

    // Constante para precio de para llevar
    const TOGO_PRICE = 10; // Ajusta este valor según tu configuración

    // Comandos ESC/POS
    const ESC = '\x1B';
    const centerText = ESC + 'a' + '\x01'; // Centrar
    const leftAlign = ESC + 'a' + '\x00'; // Izquierda
    const resetFormat = ESC + '@'; // Reset
    const lineFeed = '\n';
    const doubleSizeBold = ESC + '!' + '\x38'; // Doble tamaño y negritas
    const normalSize = ESC + '!' + '\x00'; // Tamaño normal

    // Generar encabezado
    const header = resetFormat + centerText + 
                   doubleSizeBold + 'KOKORO' + normalSize;

    // Usar TODAS las órdenes cerradas (sin filtrar por fecha, igual que la implementación anterior)
    const orders = closedOrders;

    console.log('📊 Cierre del día - Total órdenes cerradas:', orders.length);

    // Estructura dinámica de agregación (igual que la implementación anterior)
    const data: { [key: string]: { count: number; total: number; label: string } } = {};
    let total = 0;
    let totalExtras = 0;
    let totalParaLlevar = 0;

    // Procesar cada orden (igual que la implementación anterior)
    orders.forEach(order => {
      order?.products.forEach(({ units, product_name, type_name, type_price, extras }) => {
        const key = `${product_name}::${type_name}`;
        if (!data[key]) {
          data[key] = {
            count: 0,
            total: 0,
            label: `${product_name}: ${type_name}`,
          };
        }
        data[key].count += units;
        data[key].total += type_price * units;
        total += type_price * units;
        
        // Calculando ganancia de extras (igual que la implementación anterior)
        extras?.forEach((extra: any) => {
          totalExtras += extra.price || 0;
        });
      });

      // Calculando ganancia para llevar (igual que la implementación anterior)
      if (order.togo) {
        const bebidasCount = order?.products?.filter(
          product => product.product_name === 'Bebidas'
        ).length || 0;
        totalParaLlevar += (order?.products?.length - bebidasCount) * TOGO_PRICE;
      }
    });

    // Ordenar items por nombre (igual que la implementación anterior)
    const items = Object.values(data).sort((a, b) => a.label.localeCompare(b.label));
    
    // Generar resumen de ventas - Ajustado para 58mm o 80mm
    const anchoDescripcion = useBluetooth ? 18 : 35;
    const anchoPrecio = useBluetooth ? 8 : 10;
    let salida = 'Resumen de ventas:\n\n';
    items.forEach(({ count, label, total }) => {
      const labelShort = label.substring(0, anchoDescripcion);
      salida += `${count}   ${labelShort}`.padEnd(anchoDescripcion + 4) + `$${total.toFixed(2)}`.padStart(anchoPrecio) + '\n';
    });

    // Calcular total final (igual que la implementación anterior)
    const totalCierre = total + totalExtras + totalParaLlevar;
    const totalFormateado = `$${totalCierre.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;

    console.log('📊 Resumen del día:');
    console.log('   Total órdenes:', orders.length);
    console.log('   Subtotal productos:', total.toFixed(2));
    console.log('   Extras:', totalExtras.toFixed(2));
    console.log('   Para llevar:', totalParaLlevar.toFixed(2));
    console.log('   TOTAL CIERRE:', totalCierre.toFixed(2));

    // Generar ticket - Ajustado para 58mm o 80mm
    const separator = useBluetooth ? '--------------------------------' : '---------------------------------------------';
    const headerLine = useBluetooth 
      ? 'CANT DESCRIPCION      TOTAL\n'
      : 'CANT   DESCRIPCION                  TOTAL\n';
    
    const dayCloseContent = resetFormat + 
      header + lineFeed + // KOKORO en grande y negritas
      centerText + `
-- KOKORO  --
CD. MANUEL DOBLADO
Tel: 432-100-4990
` + leftAlign + `
${separator}
**CORTE DEL DIA 
FECHA: ${new Date().toString()}
${separator}
${headerLine}${separator}
${salida}
${separator}
SUBTOTAL:            ${useBluetooth ? '' : '\t\t\t'}$${total.toFixed(2)}
${separator}
EXTRAS:              ${useBluetooth ? '' : '\t\t\t'}$${totalExtras.toFixed(2)}
${separator}
PARA LLEVAR:         ${useBluetooth ? '' : '\t\t\t'}$${totalParaLlevar.toFixed(2)}
${separator}
TOTAL:               ${useBluetooth ? '' : '\t\t\t'}${totalFormateado}
${separator}

${'\n'.repeat(useBluetooth ? 5 : 10)}
` + resetFormat;

    // Usar Bluetooth o TCP según la configuración
    if (useBluetooth && bluetoothDevice) {
      sendToBluetooth(dayCloseContent)
        .then(() => {
          setIsPrinting(null);
          Alert.alert('Éxito', 'Cierre del día enviado a impresora Bluetooth');
        })
        .catch((error: any) => {
          setIsPrinting(null);
          Alert.alert('Error', 'Error al enviar a impresora Bluetooth: ' + error.message);
        });
    } else {
      const client = TcpSocket.createConnection(
        {
          host: printerIP,
          port: parseInt(printerPort, 10),
        },
        () => {
          try {
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(dayCloseContent);
            client.write(uint8Array as any);
            
            setTimeout(() => {
              client.destroy();
              setIsPrinting(null);
              Alert.alert('Éxito', 'Cierre del día enviado a impresora');
            }, 500);
          } catch (error: any) {
            client.destroy();
            setIsPrinting(null);
            Alert.alert('Error', 'Error al enviar datos: ' + error.message);
          }
        }
      );

      client.on('error', (error: any) => {
        client.destroy();
        setIsPrinting(null);
        Alert.alert(
          'Error de conexión',
          'No se pudo conectar a la impresora.\n\nVerifica:\n- IP correcta: ' + printerIP + '\n- Puerto: ' + printerPort + '\n- Que la tablet esté en la misma red WiFi'
        );
      });

      client.on('close', () => {
        setIsPrinting(null);
      });

      setTimeout(() => {
        if (client && !client.destroyed) {
          client.destroy();
          setIsPrinting(null);
          Alert.alert('Timeout', 'La impresora no respondió. Verifica la conexión.');
        }
      }, 10000);
    }
  };

  const renderOrdersScreen = () => {
    // Usar las órdenes correctas según el tab activo
    const filteredOrders = activeTab === 'active' ? orders : closedOrders;

    return (
      <>
        <View style={styles.dayCloseButtonContainer}>
          <TouchableOpacity
            style={[
              styles.dayCloseButton,
              isPrinting === 'dayClose' && styles.dayCloseButtonDisabled,
            ]}
            onPress={handleDayClose}
            disabled={isPrinting === 'dayClose'}>
            {isPrinting === 'dayClose' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.dayCloseButtonText}>📊 Cierre del Día</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'active' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('active')}>
            <Text style={[
              styles.tabText,
              activeTab === 'active' && styles.tabTextActive,
            ]}>
              Activas ({orders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'closed' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('closed')}>
            <Text style={[
              styles.tabText,
              activeTab === 'closed' && styles.tabTextActive,
            ]}>
              Cerradas ({closedOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.ordersContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Cargando órdenes...</Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                {activeTab === 'active' 
                  ? 'No hay órdenes activas disponibles' 
                  : 'No hay órdenes cerradas disponibles'}
              </Text>
              <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                <Text style={styles.refreshButtonText}>Actualizar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.ordersGrid}>
              {filteredOrders.map((order) => (
              <View key={order._id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderNumber}>#{order.id_order}</Text>
                  {order.togo && (
                    <View style={styles.togoBadge}>
                      <Text style={styles.togoBadgeText}>Para Llevar</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.orderName} numberOfLines={1}>
                  {order.name}
                </Text>
                <Text style={styles.orderDate} numberOfLines={1}>
                  {order.date.split(' ')[0]}
                </Text>
                <Text style={styles.orderStatus} numberOfLines={1}>
                  {order.status}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.printOrderButton,
                    isPrinting === order._id && styles.printOrderButtonDisabled,
                  ]}
                  onPress={() => handlePrint(order)}
                  disabled={isPrinting === order._id}>
                  {isPrinting === order._id ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.printOrderButtonText}>Imprimir</Text>
                  )}
                </TouchableOpacity>
              </View>
              ))}
            </View>
          )}
        </ScrollView>
      </>
    );
  };

  // Función para generar encabezado con KOKORO en grande y negritas
  const generateHeader = (): string => {
    const ESC = '\x1B';
    const centerText = ESC + 'a' + '\x01'; // Centrar
    
    // Comandos ESC/POS para texto grande y negritas
    // ESC ! n - Seleccionar modo de caracteres
    // n = 0x08 (doble altura) + 0x10 (doble ancho) + 0x08 (negritas) = 0x38
    const doubleSizeBold = ESC + '!' + '\x38'; // Doble tamaño y negritas
    
    // Reset formato
    const resetFormat = ESC + '@';
    const normalSize = ESC + '!' + '\x00'; // Tamaño normal
    
    return resetFormat + centerText + 
           doubleSizeBold + 'KOKORO' + normalSize;
  };

  const handleTestPrint = async () => {
    if (!useBluetooth && (!printerIP || !printerPort)) {
      Alert.alert('Error', 'Por favor configura la impresora (IP/Puerto o Bluetooth)');
      return;
    }
    
    if (useBluetooth && !bluetoothDevice) {
      Alert.alert('Error', 'Por favor conecta un dispositivo Bluetooth');
      return;
    }

    setIsPrinting('test');

    const currentDate = new Date().toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Comandos ESC/POS para centrar texto y formato
    const ESC = '\x1B';
    const centerText = ESC + 'a' + '\x01'; // Centrar
    const leftAlign = ESC + 'a' + '\x00'; // Izquierda
    const resetFormat = ESC + '@'; // Reset
    const lineFeed = '\n';

    try {
      // Generar encabezado con KOKORO en grande y negritas
      const header = generateHeader();

      // Crear el contenido completo del ticket
      const testContent = resetFormat + 
        header + lineFeed + // KOKORO en grande y negritas
        centerText + `
CD. MANUEL DOBLADO
Tel: 432-100-4990
` + leftAlign + `
---------------------------------------------
ESTA ES UNA IMPRESION DE PRUEBA 
IP: ${printerIP}
NOMBRE:  XPRINTER 8MM
PUERTO: ${printerPort}
FECHA: ${currentDate}
---------------------------------------------
` + centerText + `
		GRACIAS POR TU COMPRA
		VUELVE PRONTO :)
` + leftAlign + `
---------------------------------------------

${'\n'.repeat(10)}
` + resetFormat;

      // Usar Bluetooth o TCP según la configuración
      if (useBluetooth && bluetoothDevice) {
        sendToBluetooth(testContent)
          .then(() => {
            setIsPrinting(null);
            Alert.alert('Éxito', 'Impresión de prueba enviada correctamente a Bluetooth');
          })
          .catch((error: any) => {
            setIsPrinting(null);
            Alert.alert('Error', 'Error al enviar a impresora Bluetooth: ' + error.message);
          });
      } else {
        const client = TcpSocket.createConnection(
          {
            host: printerIP,
            port: parseInt(printerPort, 10),
          },
          () => {
            try {
              const encoder = new TextEncoder();
              const uint8Array = encoder.encode(testContent);
              client.write(uint8Array as any);
            
            setTimeout(() => {
              client.destroy();
              setIsPrinting(null);
              Alert.alert('Éxito', 'Impresión de prueba enviada correctamente');
            }, 500);
          } catch (error: any) {
            client.destroy();
            setIsPrinting(null);
            Alert.alert('Error', 'Error al enviar datos: ' + error.message);
          }
        }
      );

      client.on('error', (error: any) => {
        client.destroy();
        setIsPrinting(null);
        Alert.alert(
          'Error de conexión',
          'No se pudo conectar a la impresora.\n\nVerifica:\n- IP correcta: ' + printerIP + '\n- Puerto: ' + printerPort + '\n- Que la tablet esté en la misma red WiFi'
        );
      });

        client.on('close', () => {
          setIsPrinting(null);
        });

        setTimeout(() => {
          if (client && !client.destroyed) {
            client.destroy();
            setIsPrinting(null);
            Alert.alert('Timeout', 'La impresora no respondió. Verifica la conexión.');
          }
        }, 10000);
      }
    } catch (error: any) {
      setIsPrinting(null);
      Alert.alert('Error', 'Error al generar la impresión: ' + error.message);
    }
  };

  const renderSettingsScreen = () => (
    <ScrollView style={styles.settingsContainer}>
      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Tipo de Conexión</Text>
        <View style={styles.configRow}>
          <TouchableOpacity
            style={[
              styles.connectionTypeButton,
              !useBluetooth && styles.connectionTypeButtonActive,
            ]}
            onPress={() => setUseBluetooth(false)}>
            <Text style={[
              styles.connectionTypeButtonText,
              !useBluetooth && styles.connectionTypeButtonTextActive,
            ]}>
              WiFi (TCP)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.connectionTypeButton,
              useBluetooth && styles.connectionTypeButtonActive,
            ]}
            onPress={() => setUseBluetooth(true)}>
            <Text style={[
              styles.connectionTypeButtonText,
              useBluetooth && styles.connectionTypeButtonTextActive,
            ]}>
              Bluetooth
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {!useBluetooth ? (
        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Configuración de Impresora WiFi</Text>
          <Text style={styles.infoLabel}>Formato: 80mm (automático con WiFi)</Text>
          <View style={styles.configRow}>
            <View style={[styles.configInput, {marginRight: 10}]}>
            <Text style={styles.label}>IP de la Impresora</Text>
            <TextInput
              style={styles.input}
              value={printerIP}
              onChangeText={setPrinterIP}
              placeholder="192.168.1.26"
              keyboardType="numeric"
              autoCapitalize="none"
            />
          </View>
            <View style={styles.configInput}>
            <Text style={styles.label}>Puerto</Text>
            <TextInput
              style={styles.input}
              value={printerPort}
              onChangeText={setPrinterPort}
              placeholder="9100"
              keyboardType="numeric"
            />
          </View>
          </View>
        </View>
      ) : (
        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Configuración de Impresora Bluetooth</Text>
          {!bluetoothAvailable ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Bluetooth no disponible</Text>
              <Text style={styles.infoValue}>La funcionalidad Bluetooth no está disponible en este dispositivo o no se pudo inicializar correctamente.</Text>
            </View>
          ) : bluetoothDevice ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Dispositivo Conectado</Text>
              <Text style={styles.infoValue}>{bluetoothDevice.name || bluetoothDevice.address}</Text>
              <TouchableOpacity
                style={styles.disconnectButton}
                onPress={disconnectBluetoothDevice}>
                <Text style={styles.disconnectButtonText}>Desconectar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.infoLabel}>Formato: 58mm (automático con Bluetooth)</Text>
              <TouchableOpacity
                style={[
                  styles.scanButton,
                  isScanning && styles.scanButtonDisabled,
                ]}
                onPress={scanBluetoothDevices}
                disabled={isScanning}>
                {isScanning ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.scanButtonText}>Escanear Dispositivos</Text>
                )}
              </TouchableOpacity>
              
              {bluetoothDevices.length > 0 && (
                <View style={styles.devicesList}>
                  {bluetoothDevices.map((device) => (
                    <TouchableOpacity
                      key={device.address}
                      style={styles.deviceItem}
                      onPress={() => connectBluetoothDevice(device)}
                      disabled={isConnecting}>
                      <Text style={styles.deviceName}>{device.name || 'Dispositivo sin nombre'}</Text>
                      <Text style={styles.deviceAddress}>{device.address}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      )}

      <View style={styles.settingsSection}>
        <TouchableOpacity
          style={[
            styles.testPrintButton,
            isPrinting === 'test' && styles.testPrintButtonDisabled,
          ]}
          onPress={handleTestPrint}
          disabled={isPrinting === 'test'}>
          {isPrinting === 'test' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.testPrintButtonText}>Impresión de Prueba</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Información del Dispositivo</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>IP Local del Dispositivo</Text>
          <Text style={styles.infoValue}>{localIP}</Text>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={styles.settingsSectionTitle}>Acerca de</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Versión</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Kokoro 2025 todos los derechos</Text>
        <Text style={styles.footerText}>Elaborado por Ketxal Solution</Text>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Kokoro Printer</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setCurrentScreen(currentScreen === 'orders' ? 'settings' : 'orders')}>
          <Text style={styles.settingsButtonText}>
            {currentScreen === 'orders' ? '⚙️' : '📋'}
        </Text>
        </TouchableOpacity>
      </View>

      {currentScreen === 'orders' ? renderOrdersScreen() : renderSettingsScreen()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 15,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  configRow: {
    flexDirection: 'row',
  },
  configInput: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
  },
  ordersContainer: {
    flex: 1,
  },
  ordersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  orderName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  orderStatus: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  togoBadge: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  togoBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
  },
  printOrderButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  printOrderButtonDisabled: {
    backgroundColor: '#ccc',
  },
  printOrderButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  settingsContainer: {
    flex: 1,
    padding: 15,
  },
  settingsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  testPrintButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  testPrintButtonDisabled: {
    backgroundColor: '#ccc',
  },
  testPrintButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 4,
  },
  dayCloseButtonContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dayCloseButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCloseButtonDisabled: {
    backgroundColor: '#ccc',
  },
  dayCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  connectionTypeButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  connectionTypeButtonActive: {
    backgroundColor: '#2196F3',
  },
  connectionTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  connectionTypeButtonTextActive: {
    color: '#fff',
  },
  scanButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  scanButtonDisabled: {
    backgroundColor: '#ccc',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  devicesList: {
    marginTop: 15,
  },
  deviceItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  deviceAddress: {
    fontSize: 12,
    color: '#666',
  },
  disconnectButton: {
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default App;
