import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import NetInfo from '@react-native-community/netinfo';
import { StorageService } from '../services/storageService';
import { useBluetooth } from '../contexts/BluetoothContext';

// Declaración de tipos para TextEncoder (disponible en React Native)
declare const TextEncoder: {
  new (): {
    encode(input: string): Uint8Array;
  };
};

interface ConfigScreenProps {
  navigation?: any;
}

const ConfigScreen: React.FC<ConfigScreenProps> = ({ navigation }) => {
  const [printerIP, setPrinterIP] = useState('192.168.1.26');
  const [printerPort, setPrinterPort] = useState('9100');
  const [isPrinting, setIsPrinting] = useState(false);
  const [localIP, setLocalIP] = useState('Obteniendo...');
  
  // Usar contexto de Bluetooth (persistente entre pantallas)
  const {
    isBluetoothEnabled,
    setUseBluetooth,
    bluetoothDevice,
    bluetoothDevices,
    isScanning,
    isConnecting,
    bluetoothAvailable,
    checkBluetooth,
    connectBluetoothDevice: connectDevice,
    disconnectBluetoothDevice: disconnectDevice,
    scanBluetoothDevices: scanDevices,
    sendToBluetooth: sendBluetooth,
  } = useBluetooth();

  useEffect(() => {
    loadSavedSettings();
    getLocalIP();
    // Verificar disponibilidad de Bluetooth al cargar la pantalla
    if (checkBluetooth) {
      checkBluetooth().catch(err => {
        console.warn('Error checking Bluetooth:', err);
      });
    }
  }, []);

  const loadSavedSettings = async () => {
    try {
      const savedIP = await StorageService.getItem('printerIP');
      const savedPort = await StorageService.getItem('printerPort');

      if (savedIP) setPrinterIP(savedIP);
      if (savedPort) setPrinterPort(savedPort);
      // El contexto de Bluetooth ya maneja la carga de configuración Bluetooth
    } catch (error) {
      console.error('Error loading saved settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await StorageService.setItem('printerIP', printerIP);
      await StorageService.setItem('printerPort', printerPort);
      await StorageService.setItem('useBluetooth', isBluetoothEnabled.toString());
      // BluetoothService already saves the device address when connecting
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

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

  // Wrapper para scanDevices con manejo de errores robusto
  const handleScanDevices = async () => {
    try {
      await scanDevices();
    } catch (error: any) {
      console.error('Error scanning devices:', error);
      Alert.alert(
        'Error al escanear',
        error?.message || 'No se pudieron escanear los dispositivos Bluetooth. Verifica que Bluetooth esté activado y que tengas los permisos necesarios.'
      );
    }
  };

  // Wrapper para connectDevice con manejo de errores robusto
  const handleConnectDevice = async (device: BluetoothDevice) => {
    try {
      await connectDevice(device);
      // Si la conexión es exitosa, mostrar mensaje de éxito
      Alert.alert('Éxito', `Conectado a ${device.name || device.address}`);
    } catch (error: any) {
      console.error('Error connecting device:', error);
      // Mostrar error en Alert en lugar de crashear
      const errorMessage = error?.message || 'Error desconocido al conectar';
      Alert.alert(
        'Error de conexión',
        `No se pudo conectar al dispositivo ${device.name || device.address}.\n\n${errorMessage}\n\nVerifica que:\n- El dispositivo esté encendido\n- Esté emparejado en la configuración de Bluetooth\n- No esté conectado a otro dispositivo`
      );
    }
  };

  // Wrapper para disconnectDevice con manejo de errores robusto
  const handleDisconnectDevice = async () => {
    try {
      await disconnectDevice();
      Alert.alert('Éxito', 'Dispositivo desconectado');
    } catch (error: any) {
      console.error('Error disconnecting device:', error);
      Alert.alert(
        'Error al desconectar',
        error?.message || 'No se pudo desconectar el dispositivo correctamente.'
      );
    }
  };



  // Función para remover acentos
  const removeAccents = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[ñÑ]/g, (match) => match === 'ñ' ? 'n' : 'N')
      .replace(/[áÁ]/g, 'A')
      .replace(/[éÉ]/g, 'E')
      .replace(/[íÍ]/g, 'I')
      .replace(/[óÓ]/g, 'O')
      .replace(/[úÚ]/g, 'U');
  };

  const handleTestPrint = async () => {
    if (!isBluetoothEnabled && (!printerIP || !printerPort)) {
      Alert.alert('Error', 'Por favor configura la impresora (IP/Puerto o Bluetooth)');
      return;
    }
    
    if (isBluetoothEnabled && !bluetoothDevice) {
      Alert.alert('Error', 'Por favor conecta un dispositivo Bluetooth');
      return;
    }

    setIsPrinting(true);

    const currentDate = new Date().toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Comandos ESC/POS
    const ESC = '\x1B';
    const centerText = ESC + 'a' + '\x01'; // Centrar
    const leftAlign = ESC + 'a' + '\x00'; // Izquierda
    const resetFormat = ESC + '@'; // Reset
    const lineFeed = '\n';
    const smallSize = ESC + '!' + '\x00'; // Tamaño pequeño/normal

    try {
      // Logo deshabilitado - no se carga para evitar conflictos
      const logoEscPos = '';

      // Crear el contenido completo del ticket
      const testContent = resetFormat + smallSize +
        (logoEscPos ? logoEscPos + lineFeed + lineFeed : '') + // Logo en la parte superior
        centerText + removeAccents('CD. MANUEL DOBLADO') + lineFeed +
        removeAccents('Tel: 432-100-4990') + lineFeed +
        leftAlign + '---------------------------------------------' + lineFeed +
        removeAccents('ESTA ES UNA IMPRESION DE PRUEBA') + lineFeed +
        `IP: ${printerIP}` + lineFeed +
        removeAccents('NOMBRE: XPRINTER 8MM') + lineFeed +
        `PUERTO: ${printerPort}` + lineFeed +
        `FECHA: ${removeAccents(currentDate)}` + lineFeed +
        '---------------------------------------------' + lineFeed +
        centerText + removeAccents('GRACIAS POR TU COMPRA') + lineFeed +
        removeAccents('VUELVE PRONTO :)') + lineFeed +
        leftAlign + '---------------------------------------------' + lineFeed +
        '\n'.repeat(5) + // Menos espacios
        resetFormat;

      // Usar Bluetooth o TCP según la configuración
      if (isBluetoothEnabled && bluetoothDevice) {
        sendBluetooth(testContent)
          .then(() => {
            setIsPrinting(false);
            Alert.alert('Éxito', 'Impresión de prueba enviada correctamente a Bluetooth');
          })
          .catch((error: any) => {
            setIsPrinting(false);
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
                setIsPrinting(false);
                Alert.alert('Éxito', 'Impresión de prueba enviada correctamente');
              }, 500);
            } catch (error: any) {
              client.destroy();
              setIsPrinting(false);
              Alert.alert('Error', 'Error al enviar datos: ' + error.message);
            }
          }
        );

        client.on('error', (error: any) => {
          client.destroy();
          setIsPrinting(false);
          Alert.alert(
            'Error de conexión',
            'No se pudo conectar a la impresora.\n\nVerifica:\n- IP correcta: ' + printerIP + '\n- Puerto: ' + printerPort + '\n- Que la tablet esté en la misma red WiFi'
          );
        });

        client.on('close', () => {
          setIsPrinting(false);
        });

        setTimeout(() => {
          if (client && !client.destroyed) {
            client.destroy();
            setIsPrinting(false);
            Alert.alert('Timeout', 'La impresora no respondió. Verifica la conexión.');
          }
        }, 10000);
      }
    } catch (error: any) {
      setIsPrinting(false);
      Alert.alert('Error', 'Error al generar la impresión: ' + error.message);
    }
  };

  const handleConnectionTypeChange = (useBT: boolean) => {
    setUseBluetooth(useBT);
    saveSettings();
  };

  const handleIPChange = (ip: string) => {
    setPrinterIP(ip);
    saveSettings();
  };

  const handlePortChange = (port: string) => {
    setPrinterPort(port);
    saveSettings();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
      </View>

      <ScrollView style={styles.settingsContainer}>
        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Tipo de Conexión</Text>
          <View style={styles.configRow}>
            <TouchableOpacity
              style={[
                styles.connectionTypeButton,
                !isBluetoothEnabled && styles.connectionTypeButtonActive,
                styles.connectionTypeButtonDisabled,
              ]}
              onPress={() => {}} // Deshabilitado - no hacer nada
              disabled={true}>
              <Text style={[
                styles.connectionTypeButtonText,
                !isBluetoothEnabled && styles.connectionTypeButtonTextActive,
                styles.connectionTypeButtonTextDisabled,
              ]}>
                WiFi (TCP)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.connectionTypeButton,
                isBluetoothEnabled && styles.connectionTypeButtonActive,
              ]}
              onPress={() => handleConnectionTypeChange(true)}>
              <Text style={[
                styles.connectionTypeButtonText,
                isBluetoothEnabled && styles.connectionTypeButtonTextActive,
              ]}>
                Bluetooth
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {!isBluetoothEnabled ? (
          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>Configuración de Impresora WiFi</Text>
            <Text style={styles.infoLabel}>Formato: 80mm (automático con WiFi)</Text>
            <View style={styles.configRow}>
              <View style={[styles.configInput, {marginRight: 10}]}>
                <Text style={styles.label}>IP de la Impresora</Text>
                <TextInput
                  style={styles.input}
                  value={printerIP}
                  onChangeText={handleIPChange}
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
                  onChangeText={handlePortChange}
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
                  onPress={handleDisconnectDevice}>
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
                  onPress={handleScanDevices}
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
                        onPress={() => handleConnectDevice(device)}
                        disabled={isConnecting !== null}>
                        <Text style={styles.deviceName}>{device.name || 'Dispositivo sin nombre'}</Text>
                        <Text style={styles.deviceAddress}>{device.address}</Text>
                        {isConnecting === device.address && (
                          <ActivityIndicator size="small" color="#2196F3" style={{ marginTop: 5 }} />
                        )}
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
              isPrinting && styles.testPrintButtonDisabled,
            ]}
            onPress={handleTestPrint}
            disabled={isPrinting}>
            {isPrinting ? (
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
          <Text style={styles.footerText}>Lecrepe 2025 todos los derechos</Text>
          <Text style={styles.footerText}>Elaborado por Ketxal Solution</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#E8A334',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
  connectionTypeButtonDisabled: {
    backgroundColor: '#e0e0e0',
    opacity: 0.5,
  },
  connectionTypeButtonTextDisabled: {
    color: '#999',
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

export default ConfigScreen;
