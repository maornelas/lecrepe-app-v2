import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import { OrderLecrepeService } from '../services/orderLecrepeService';
import { StorageService } from '../services/storageService';
import { useBluetooth } from '../contexts/BluetoothContext';
import { Order } from '../types';

// Declaración de tipos para TextEncoder (disponible en React Native)
declare const TextEncoder: {
  new (): {
    encode(input: string): Uint8Array;
  };
};

interface KitchenScreenProps {
  navigation?: any;
}

const KitchenScreen: React.FC<KitchenScreenProps> = ({ navigation }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Usar contexto de Bluetooth
  const { isBluetoothEnabled, bluetoothDevice, sendToBluetooth } = useBluetooth();

  useEffect(() => {
    loadOrders();
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      loadOrders(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async (silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const idStore = await StorageService.getItem('idStore');
      if (!idStore) {
        Alert.alert('Error', 'No se encontró el ID de la tienda');
        return;
      }

      const response = await OrderLecrepeService.getAllOrdersLecrepe(parseInt(idStore));
      if (response.data) {
        setOrders(response.data);
      }
    } catch (error: any) {
      console.error('Error loading orders:', error);
      if (!silent) {
        Alert.alert('Error', 'No se pudieron cargar las órdenes');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const getPendingOrders = () => {
    return orders.filter((order) => order.status === 'Pendiente');
  };

  const getReadyOrders = () => {
    return orders.filter((order) => order.status === 'Lista');
  };

  const getClosedOrders = () => {
    return orders.filter(
      (order) => order.status === 'Cerrada' || order.status === 'Entregada'
    );
  };

  const getCanceledOrders = () => {
    return orders.filter((order) => order.status === 'Cancelada');
  };

  const getCurrentOrders = () => {
    switch (activeTab) {
      case 0:
        return getPendingOrders();
      case 1:
        return getReadyOrders();
      case 2:
        return getClosedOrders();
      case 3:
        return getCanceledOrders();
      default:
        return getPendingOrders();
    }
  };

  const handleMarkAsReady = async (orderId: number) => {
    try {
      await OrderLecrepeService.markOrderAsReady(orderId);
      Alert.alert('Éxito', 'Orden marcada como lista');
      loadOrders();
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo marcar la orden como lista');
    }
  };

  const handleMarkAsDelivered = async (orderId: number) => {
    try {
      await OrderLecrepeService.markOrderAsDelivered(orderId);
      Alert.alert('Éxito', 'Orden marcada como entregada');
      loadOrders();
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo marcar la orden como entregada');
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    Alert.alert(
      'Cancelar Orden',
      '¿Estás seguro de que deseas cancelar esta orden?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí',
          style: 'destructive',
          onPress: async () => {
            try {
              await OrderLecrepeService.cancelOrderLecrepe(orderId);
              Alert.alert('Éxito', 'Orden cancelada');
              loadOrders();
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo cancelar la orden');
            }
          },
        },
      ]
    );
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setOrderDetailOpen(true);
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      return date.toLocaleTimeString('es-MX', { 
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'N/A';
    }
  };

  const getItemsCount = (order: Order): number => {
    const items = order.items || order.products || [];
    return items.reduce((sum, item) => sum + (item.units || 0), 0);
  };

  const getTotalAmount = (order: Order): number => {
    if (order.payment?.amount) {
      return order.payment.amount;
    }
    if (order.total) {
      return order.total;
    }
    // Calculate from items
    const items = order.items || order.products || [];
    return items.reduce((sum, item) => sum + ((item.type_price || 0) * (item.units || 0)), 0);
  };


  const handlePrintOrder = async () => {
    if (!selectedOrder) {
      Alert.alert('Error', 'No hay orden seleccionada para imprimir');
      return;
    }

    setIsPrinting(true);

    try {
      // Obtener configuración de la impresora (solo para WiFi)
      const savedIP = await StorageService.getItem('printerIP');
      const savedPort = await StorageService.getItem('printerPort');

      const printerIP = savedIP || '192.168.1.26';
      const printerPort = savedPort || '9100';

      // Verificar configuración
      if (!isBluetoothEnabled && (!printerIP || !printerPort)) {
        Alert.alert('Error', 'Por favor configura la impresora en Configuración');
        setIsPrinting(false);
        return;
      }

      if (isBluetoothEnabled && !bluetoothDevice) {
        Alert.alert('Error', 'Por favor conecta un dispositivo Bluetooth en Configuración');
        setIsPrinting(false);
        return;
      }

      // Constante para precio de para llevar
      const TOGO_PRICE = 10;
      // Ajustado para impresora de 58mm (32 caracteres por línea) o 80mm
      const anchoCantidad = isBluetoothEnabled ? 4 : 6;
      const anchoDescripcion = isBluetoothEnabled ? 18 : 28;
      const anchoPrecio = isBluetoothEnabled ? 8 : 11;

      // Función para remover acentos y caracteres especiales
      const removeAccents = (str: string): string => {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[ñÑ]/g, (match) => match === 'ñ' ? 'n' : 'N')
          .replace(/[áÁ]/g, 'A')
          .replace(/[éÉ]/g, 'E')
          .replace(/[íÍ]/g, 'I')
          .replace(/[óÓ]/g, 'O')
          .replace(/[úÚ]/g, 'U');
      };

      // Comandos ESC/POS
      const ESC = '\x1B';
      const centerText = ESC + 'a' + '\x01';
      const leftAlign = ESC + 'a' + '\x00';
      const resetFormat = ESC + '@';
      const lineFeed = '\n';
      const smallSize = ESC + '!' + '\x00'; // Tamaño pequeño/normal
      const normalSize = ESC + '!' + '\x00';

      // Logo deshabilitado - no se carga para evitar conflictos
      const logoEscPos = '';

      let salida = "";
      let total = 0;
      let totalParaLlevar = 0;

      // Obtener items de la orden
      const orderItems = selectedOrder.items || selectedOrder.products || [];

      // Agrupar productos por categoría
      const groupedProducts: { [key: string]: any[] } = {};
      orderItems.forEach((item: any) => {
        // Normalizar categoría: crepa/crepas -> crepas, bebida/bebidas -> bebidas
        let category = item.type || 'otros';
        if (category === 'crepa') category = 'crepas';
        if (category === 'bebida') category = 'bebidas';
        
        if (!groupedProducts[category]) {
          groupedProducts[category] = [];
        }
        groupedProducts[category].push(item);
      });

      // Procesar productos agrupados por categoría
      const categoryOrder = ['crepas', 'bebidas', 'otros'];
      categoryOrder.forEach(category => {
        if (!groupedProducts[category] || groupedProducts[category].length === 0) return;

        // Agregar encabezado de categoría (sin acentos)
        const categoryLabel = removeAccents(category.toUpperCase());
        salida += `${categoryLabel}:${lineFeed}`;

        // Procesar productos de esta categoría
        groupedProducts[category].forEach((item: any) => {
          // Alinear cantidad a la derecha
          const cantidad = (item.units || 0).toString().padStart(anchoCantidad);
          let productDesc = removeAccents(item.name || item.product_name || 'Sin nombre');
          
          // Agregar opción si existe (tamaño de bebida) - solo si no es "Regular" o si hay cambios
          if (item.size && item.size !== 'Regular' && item.size !== 'regular') {
            productDesc += ` ${removeAccents(item.size)}`;
          }
          
          // Agregar ingredientes excluidos si existen (desde toppings)
          if (item.toppings && Array.isArray(item.toppings)) {
            const excludedToppings = item.toppings.filter((t: any) => t.selected === false);
            if (excludedToppings.length > 0) {
              productDesc += ` (sin ${excludedToppings.map((t: any) => removeAccents(t.name)).join(', ')})`;
            }
          }
          
          const descripcion = productDesc.substring(0, anchoDescripcion).padEnd(anchoDescripcion);
          // El type_price del backend ya incluye el fee_togo si es para llevar
          const itemPrice = item.type_price || item.price || 0;
          const itemTotalPrice = itemPrice * (item.units || 0);
          const precio = `$${itemTotalPrice.toFixed(2)}`.padStart(anchoPrecio);
          salida += `${cantidad} ${descripcion}${precio}${lineFeed}`; // Espacio entre cantidad y descripción

          // Calcular total del producto (el precio ya incluye fee_togo si aplica)
          total += itemTotalPrice;
        });
      });

      // El totalParaLlevar ya está incluido en el precio de cada item (type_price)
      // No necesitamos calcularlo por separado porque ya está en el precio
      totalParaLlevar = 0;

      // Generar ticket
      const separator = isBluetoothEnabled ? '--------------------------------' : '---------------------------------------------';
      const orderName = removeAccents(selectedOrder.client?.name || selectedOrder.name || 'Cliente General');
      const orderNameLine = isBluetoothEnabled 
        ? `Nombre: ${orderName.length > 30 ? orderName.substring(0, 27) + '...' : orderName}\n`
        : `Nombre Orden: ${orderName}\n`;
      const headerLine = isBluetoothEnabled 
        ? 'CANT DESCRIPCION      TOTAL\n'
        : 'CANT   DESCRIPCION                  TOTAL\n';
      
      const fecha = removeAccents(new Date().toLocaleDateString());
      // Formatear hora solo con horas y minutos (sin segundos ni símbolos extraños)
      const now = new Date();
      const hora = removeAccents(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
      const mesaText = selectedOrder.togo ? 'PARA LLEVAR' : `MESA ${selectedOrder.id_place || ''}`;
      
      // Calcular ancho para alinear totales a la derecha
      const anchoTotal = isBluetoothEnabled ? 32 : 45;
      const subtotalLabel = 'SUBTOTAL:';
      const paraLlevarLabel = 'PARA LLEVAR:';
      const totalLabel = 'TOTAL A PAGAR:';
      
      const doubleSizeBold = ESC + '!' + '\x38'; // Doble tamaño y negritas
      const ticketContent = resetFormat + smallSize + // Tamaño pequeño
        (logoEscPos ? logoEscPos + lineFeed : '') + // Logo en la parte superior
        centerText + doubleSizeBold + removeAccents('LECREPE') + smallSize + lineFeed + // Texto LECREPE grande
        centerText + removeAccents('CD. MANUEL DOBLADO') + lineFeed +
        removeAccents('Tel: 432-100-4990') + lineFeed +
        leftAlign + separator + lineFeed +
        `Fecha: ${fecha}  Hora: ${hora}` + lineFeed +
        `Orden No: ${selectedOrder.id_order || 0}` + lineFeed +
        mesaText + lineFeed +
        orderNameLine + separator + lineFeed +
        headerLine + separator + lineFeed +
        salida + separator + lineFeed +
        `${subtotalLabel}${' '.repeat(anchoTotal - subtotalLabel.length - total.toFixed(2).length - 1)}$${total.toFixed(2)}` + lineFeed +
        (totalParaLlevar > 0 ? `${paraLlevarLabel}${' '.repeat(anchoTotal - paraLlevarLabel.length - totalParaLlevar.toFixed(2).length - 1)}$${totalParaLlevar.toFixed(2)}` + lineFeed : '') +
        separator + lineFeed +
        `${totalLabel}${' '.repeat(anchoTotal - totalLabel.length - (total+totalParaLlevar).toFixed(2).length - 1)}$${(total+totalParaLlevar).toFixed(2)}` + lineFeed +
        separator + lineFeed +
        centerText + removeAccents('GRACIAS POR TU COMPRA') + lineFeed +
        removeAccents('VUELVE PRONTO :)') + lineFeed +
        leftAlign + separator + lineFeed +
        '\n'.repeat(isBluetoothEnabled ? 3 : 5) + // Menos espacios al final
        resetFormat;

      // Usar Bluetooth o TCP según la configuración
      if (isBluetoothEnabled && bluetoothDevice) {
        try {
          await sendToBluetooth(ticketContent);
          setIsPrinting(false);
          Alert.alert('Éxito', `Orden #${selectedOrder.id_order || 0} enviada a impresora Bluetooth`);
        } catch (error: any) {
          setIsPrinting(false);
          Alert.alert('Error', 'Error al enviar a impresora Bluetooth: ' + (error.message || 'Error desconocido'));
        }
      } else {
        const client = TcpSocket.createConnection(
          {
            host: printerIP,
            port: parseInt(printerPort, 10),
          },
          () => {
            try {
              const encoder = new TextEncoder();
              const uint8Array = encoder.encode(ticketContent);
              client.write(uint8Array as any);
              
              setTimeout(() => {
                client.destroy();
                setIsPrinting(false);
                Alert.alert('Éxito', `Orden #${selectedOrder.id_order || 0} enviada a impresora`);
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
      Alert.alert('Error', 'Error al imprimir: ' + (error.message || 'Error desconocido'));
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Pendiente':
        return '#FF9800'; // Orange
      case 'Lista':
        return '#4CAF50'; // Green
      case 'Cerrada':
      case 'Entregada':
        return '#9e9e9e'; // Gray
      case 'Cancelada':
        return '#424242'; // Dark Gray
      default:
        return '#757575'; // Gray
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Cargando órdenes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentOrders = getCurrentOrders();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
            <Text style={styles.backButtonIcon}>←</Text>
        </TouchableOpacity>
          <Text style={styles.headerIcon}>🍴</Text>
        <Text style={styles.title}>COCINA</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{getCanceledOrders().length}</Text>
          </View>
          <Text style={styles.trashIcon}>🗑️</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 0 && styles.tabActive]}
          onPress={() => setActiveTab(0)}
        >
          <Text
            style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}
          >
              Pend. ({getPendingOrders().length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 1 && styles.tabActive]}
          onPress={() => setActiveTab(1)}
        >
          <Text
            style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}
          >
            Listas ({getReadyOrders().length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 2 && styles.tabActive]}
          onPress={() => setActiveTab(2)}
        >
          <Text
            style={[styles.tabText, activeTab === 2 && styles.tabTextActive]}
          >
            Cerradas ({getClosedOrders().length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 3 && styles.tabActive]}
          onPress={() => setActiveTab(3)}
        >
          <Text
            style={[styles.tabText, activeTab === 3 && styles.tabTextActive]}
          >
              Cancel. ({getCanceledOrders().length})
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {currentOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay órdenes en esta categoría</Text>
          </View>
        ) : (
          <View style={styles.ordersContainer}>
            {currentOrders.map((order) => {
              const statusColor = getStatusColor(order.status);
              const itemsCount = getItemsCount(order);
              const totalAmount = getTotalAmount(order);
              
              return (
              <TouchableOpacity
                key={order._id || order.id_order}
                style={[
                  styles.orderCard,
                    { borderColor: statusColor }
                ]}
                onPress={() => handleOrderClick(order)}
              >
                  {/* Header with status and order type */}
                  <View style={[styles.orderCardHeader, { backgroundColor: statusColor }]}>
                    <View style={styles.orderHeaderLeft}>
                      <Text style={styles.orderHeaderIcon}>
                        {order.status === 'Pendiente' ? '⏰' : 
                         order.status === 'Lista' ? '✓' : 
                         order.status === 'Cancelada' ? '✕' : '✓'}
                  </Text>
                      <Text style={styles.orderNumberHeader}>#{order.id_order}</Text>
                </View>
                    <View style={[styles.orderTypeBadge, order.togo && styles.togoBadgeHeader]}>
                      <Text style={styles.orderTypeIcon}>{order.togo ? '📋' : '🪑'}</Text>
                      <Text style={[styles.orderTypeText, order.togo && styles.togoTextHeader]}>
                        {order.togo ? 'PARA LLEVAR' : `MESA ${order.id_place || ''}`}
                      </Text>
                    </View>
                  </View>

                  {/* Order details */}
                  <View style={styles.orderCardContent}>
                    <View style={styles.orderInfoRow}>
                <Text style={styles.orderName}>
                  {order.client?.name || order.name || 'Cliente General'}
                </Text>
                      <Text style={styles.itemsCount}>{itemsCount} items</Text>
                  </View>
                    
                    <Text style={styles.orderTime}>
                      {formatTime(order.creation_date || order.date)}
                    </Text>
                    
                    <Text style={styles.orderTotal}>
                      ${totalAmount.toFixed(2)}
                    </Text>
                </View>

                  {/* Action buttons */}
                <View style={styles.orderActions}>
                  {order.status === 'Pendiente' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonLista]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleMarkAsReady(order.id_order);
                        }}
                      >
                        <Text style={styles.actionButtonText}>LISTA</Text>
                    </TouchableOpacity>
                  )}
                  {order.status === 'Lista' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonCerrar]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleMarkAsDelivered(order.id_order);
                        }}
                      >
                        <Text style={styles.actionButtonText}>CERRAR</Text>
                      </TouchableOpacity>
                    )}
                    {order.status !== 'Cerrada' && 
                     order.status !== 'Entregada' && 
                     order.status !== 'Cancelada' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonCancel]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCancelOrder(order.id_order);
                        }}
                      >
                        <Text style={styles.actionButtonCancelText}>CANCELAR</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Order Detail Modal - Full Screen */}
      <Modal
        visible={orderDetailOpen}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setOrderDetailOpen(false)}
      >
        <SafeAreaView style={styles.modalFullScreen}>
          <View style={styles.modalContentFullScreen}>
            <View style={styles.modalHeader}>
              {/* Primera fila: Información de la orden */}
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalHeaderLeft}>
                  <Text style={styles.modalHeaderIcon}>
                    {selectedOrder?.togo ? '📋' : '🪑'}
              </Text>
                  <View style={[styles.modalHeaderInfo, { marginLeft: 8 }]}>
                    <Text style={styles.modalHeaderLabel}>Lugar</Text>
                    <Text style={styles.modalHeaderValue}>
                      {selectedOrder?.togo ? 'Para llevar' : `Mesa ${selectedOrder?.id_place || ''}`}
                    </Text>
                  </View>
                  <View style={[styles.modalHeaderInfo, { marginLeft: 12 }]}>
                    <Text style={styles.modalHeaderLabel}>Orden</Text>
                    <Text style={[styles.modalHeaderValue, styles.modalOrderNumber]}>
                      #{selectedOrder?.id_order}
                    </Text>
                  </View>
                  <View style={[styles.modalHeaderInfo, { marginLeft: 12 }]}>
                    <Text style={styles.modalHeaderLabel}>Total</Text>
                    <Text style={[styles.modalHeaderValue, styles.modalTotal]}>
                      ${getTotalAmount(selectedOrder || {}).toFixed(2)}
                    </Text>
                  </View>
                </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setOrderDetailOpen(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              </View>
              
              {/* Segunda fila: Botón de imprimir */}
              <View style={[styles.modalHeaderRow, { justifyContent: 'flex-start' }]}>
                <TouchableOpacity
                  style={[
                    styles.printButtonHeader,
                    isPrinting && styles.printButtonHeaderDisabled,
                  ]}
                  onPress={handlePrintOrder}
                  disabled={isPrinting}
                >
                  {isPrinting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.printButtonHeaderText}>IMPRIMIR</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            {selectedOrder && (
              <>
                <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                  <Text style={styles.modalClientName}>
                    Nombre: {selectedOrder.client?.name || selectedOrder.name || 'Cliente General'}
                </Text>
                  
                  {/* Two columns: Bebidas and Crepas */}
                  <View style={styles.productsContainer}>
                  {/* Bebidas Column */}
                  <View style={[styles.productsColumn, { marginRight: 6 }]}>
                    <Text style={styles.productsColumnTitle}>BEBIDAS</Text>
                    {(() => {
                      const allItems = selectedOrder.items || selectedOrder.products || [];
                      const drinks = allItems.filter((item: any) => {
                        const itemType = item.type || item.product_type || '';
                        return itemType !== 'crepa' && itemType !== 'crepas';
                      });
                      
                      if (drinks.length === 0) {
                        return (
                          <Text style={styles.noItemsText}>No hay bebidas</Text>
                        );
                      }
                      
                      return drinks.map((item: any, index: number) => {
                        const itemName = item.name || item.product_name || 'Sin nombre';
                        const itemUnits = item.units || 0;
                        // Obtener ingredientes excluidos desde toppings
                        const excludedToppings = item.toppings && Array.isArray(item.toppings) 
                          ? item.toppings.filter((t: any) => t.selected === false)
                          : [];
                        
                        return (
                          <View key={index} style={styles.productListItem}>
                            <View style={styles.productListItemLeft}>
                              <View style={styles.productIcon}>
                                <Text style={styles.productIconText}>☕</Text>
                              </View>
                              <View style={styles.productInfo}>
                                <Text style={styles.productListItemName}>{itemName}</Text>
                                {excludedToppings.length > 0 && (
                                  <Text style={styles.toppingsText}>
                                    sin {excludedToppings.map((t: any) => t.name).join(', ')}
                                  </Text>
                                )}
                                <Text style={styles.productListItemQuantity}>
                                  cant: <Text style={styles.productListItemQuantityBold}>{itemUnits}</Text>
                    </Text>
                  </View>
                            </View>
                          </View>
                        );
                      });
                    })()}
                  </View>

                  {/* Crepas Column */}
                  <View style={[styles.productsColumn, { marginLeft: 6 }]}>
                    <Text style={styles.productsColumnTitle}>CREPAS</Text>
                    {(() => {
                      const allItems = selectedOrder.items || selectedOrder.products || [];
                      const crepes = allItems.filter((item: any) => {
                        const itemType = item.type || item.product_type || '';
                        return itemType === 'crepa' || itemType === 'crepas';
                      });
                      
                      if (crepes.length === 0) {
                        return (
                          <Text style={styles.noItemsText}>No hay crepas</Text>
                        );
                      }
                      
                      return crepes.map((item: any, index: number) => {
                        const itemName = item.name || item.product_name || 'Sin nombre';
                        const itemUnits = item.units || 0;
                        // Obtener ingredientes excluidos desde toppings
                        const excludedToppings = item.toppings && Array.isArray(item.toppings) 
                          ? item.toppings.filter((t: any) => t.selected === false)
                          : [];
                        
                        return (
                          <View key={index} style={styles.productListItem}>
                            <View style={styles.productListItemLeft}>
                              <View style={styles.productIcon}>
                                <Text style={styles.productIconText}>🍕</Text>
                              </View>
                              <View style={styles.productInfo}>
                                <Text style={styles.productListItemName}>{itemName}</Text>
                                {excludedToppings.length > 0 && (
                                  <Text style={styles.toppingsText}>
                                    sin {excludedToppings.map((t: any) => t.name).join(', ')}
                                  </Text>
                                )}
                                <Text style={styles.productListItemQuantity}>
                                  cant: <Text style={styles.productListItemQuantityBold}>{itemUnits}</Text>
                    </Text>
                  </View>
                            </View>
                          </View>
                        );
                      });
                    })()}
                  </View>
                </View>
              </ScrollView>
              </>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#2c2c2c',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  backButton: {
    marginRight: 8,
  },
  backButtonIcon: {
    fontSize: 20,
    color: '#fff',
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  badgeContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF5722',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    zIndex: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  trashIcon: {
    fontSize: 24,
    marginLeft: 8,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#FF9800',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  ordersContainer: {
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    overflow: 'hidden',
    width: '48%',
    minHeight: 140,
  },
  orderCardHeader: {
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderHeaderIcon: {
    fontSize: 14,
    color: '#fff',
    marginRight: 4,
  },
  orderNumberHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  orderTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  togoBadgeHeader: {
    backgroundColor: '#FCE4EC',
    borderColor: '#E91E63',
  },
  orderTypeIcon: {
    fontSize: 10,
    marginRight: 2,
  },
  orderTypeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  togoTextHeader: {
    color: '#E91E63',
  },
  orderCardContent: {
    padding: 8,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  itemsCount: {
    fontSize: 10,
    color: '#666',
    fontWeight: 'bold',
  },
  orderTime: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  orderActions: {
    padding: 8,
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: 50,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonLista: {
    backgroundColor: '#2196F3',
  },
  actionButtonCerrar: {
    backgroundColor: '#4CAF50',
  },
  actionButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButtonCancelText: {
    color: '#f44336',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalFullScreen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContentFullScreen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalHeaderIcon: {
    fontSize: 24,
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalHeaderLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  modalHeaderValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  modalOrderNumber: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalTotal: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#2196F3',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2D3036',
    borderRadius: 16,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#E8A334',
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalBodyContent: {
    padding: 16,
    paddingBottom: 32,
  },
  modalClientName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  productsContainer: {
    flexDirection: 'row',
  },
  productsColumn: {
    flex: 1,
  },
  productsColumnTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  productListItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
    minHeight: 60,
  },
  productListItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productIconText: {
    fontSize: 16,
  },
  productInfo: {
    flex: 1,
  },
  productListItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productListItemQuantity: {
    fontSize: 12,
    color: '#666',
  },
  productListItemQuantityBold: {
    fontWeight: 'bold',
    color: '#333',
  },
  noItemsText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  productItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productDetails: {
    fontSize: 12,
    color: '#666',
  },
  toppingsText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  extrasText: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  printButtonHeader: {
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  printButtonHeaderDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  printButtonHeaderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default KitchenScreen;



