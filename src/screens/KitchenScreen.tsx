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
import { OrderService } from '../services/orderService';
import { StorageService } from '../services/storageService';
import { useBluetooth } from '../contexts/BluetoothContext';
import { Order } from '../types';
import { useToast } from '../hooks/useToast';

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
  const [isClosingDay, setIsClosingDay] = useState(false);
  const [isPrintingDay, setIsPrintingDay] = useState(false);
  
  // Usar contexto de Bluetooth
  const { isBluetoothEnabled, bluetoothDevice, sendToBluetooth } = useBluetooth();
  
  // Usar hook de toast para notificaciones
  const { showSuccess, showError, ToastComponent } = useToast();

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
        if (!silent) {
          showError('No se encontró el ID de la tienda');
        }
        return;
      }

      const response = await OrderLecrepeService.getAllOrdersLecrepe(parseInt(idStore));
      if (response.data) {
        // Excluir órdenes "Finalizadas" (igual que kokoro-front)
        const filteredOrders = response.data.filter((order: Order) => order.status !== 'Finalizada');
        setOrders(filteredOrders);
      }
    } catch (error: any) {
      console.error('Error loading orders:', error);
      if (!silent) {
        showError('No se pudieron cargar las órdenes');
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
    return orders.filter((order) => order.status === 'Pendiente' && order.status !== 'Finalizada');
  };

  const getReadyOrders = () => {
    return orders.filter((order) => order.status === 'Lista' && order.status !== 'Finalizada');
  };

  const getClosedOrders = () => {
    return orders.filter(
      (order) => (order.status === 'Cerrada' || order.status === 'Entregada') && order.status !== 'Finalizada'
    );
  };

  const getCanceledOrders = () => {
    return orders.filter((order) => order.status === 'Cancelada' && order.status !== 'Finalizada');
  };

  const handleCloseDay = async () => {
    Alert.alert(
      'Cierre del Día',
      '¿Seguro cerrar el día?\n\nTodas las órdenes cerradas ya no se mostrarán.',
      [
        {
          text: 'NO',
          style: 'cancel',
        },
        {
          text: 'SÍ',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClosingDay(true);
              const idStore = await StorageService.getItem('idStore');
              if (!idStore) {
                showError('No se encontró el ID de la tienda');
                setIsClosingDay(false);
                return;
              }

              // Obtener todas las órdenes
              const response = await OrderLecrepeService.getAllOrdersLecrepe(parseInt(idStore));
              let allOrders: Order[] = [];
              
              if (response && response.data) {
                if (Array.isArray(response.data)) {
                  allOrders = response.data;
                } else if (response.data.orders && Array.isArray(response.data.orders)) {
                  allOrders = response.data.orders;
                }
              }

              // Filtrar órdenes que NO están finalizadas (para validar que todas estén cerradas)
              const nonFinalizedOrders = allOrders.filter(order => order.status !== 'Finalizada');

              // Verificar que todas las órdenes (excepto las finalizadas) estén cerradas
              const nonClosedOrders = nonFinalizedOrders.filter(order => 
                order.status !== 'Cerrada' && order.status !== 'Entregada'
              );

              if (nonClosedOrders.length > 0) {
                const statusCounts: Record<string, number> = {};
                nonClosedOrders.forEach(order => {
                  statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
                });
                
                const statusList = Object.entries(statusCounts)
                  .map(([status, count]) => `${status}: ${count}`)
                  .join('\n');
                
                Alert.alert(
                  'No se puede cerrar el día',
                  `Todas las órdenes deben estar cerradas antes de hacer el cierre del día.\n\nÓrdenes pendientes:\n${statusList}\n\nPor favor, cierra todas las órdenes antes de continuar.`,
                  [{ text: 'OK' }]
                );
                setIsClosingDay(false);
                return;
              }

              // Filtrar órdenes cerradas (igual que kokoro-front)
              const ordersToFinalize = allOrders.filter(order => {
                const isClosedOrDelivered = order.status === 'Cerrada' || order.status === 'Entregada';
                const notFinalized = order.status !== 'Finalizada';
                return isClosedOrDelivered && notFinalized;
              });

              if (ordersToFinalize.length === 0) {
                showError('No hay órdenes cerradas para finalizar');
                setIsClosingDay(false);
                return;
              }

              // Actualizar cada orden a estado "Finalizada" (igual que kokoro-front)
              let successCount = 0;
              let errorCount = 0;

              for (const order of ordersToFinalize) {
                try {
                  const orderId = order.id_order || order.id || order._id;
                  if (orderId) {
                    await OrderLecrepeService.updateOrderLecrepe(orderId, { status: 'Finalizada' });
                    successCount++;
                  }
                } catch (error) {
                  console.error(`Error finalizando orden ${order.id_order}:`, error);
                  errorCount++;
                }
              }

              // Recargar las órdenes
              await loadOrders();

              if (errorCount === 0) {
                showSuccess(`El día fue cerrado correctamente. Se finalizaron ${successCount} órdenes.`);
              } else {
                showError(`Se finalizaron ${successCount} órdenes, pero ${errorCount} tuvieron errores.`);
              }
            } catch (error: any) {
              console.error('Error en cierre del día:', error);
              showError('No se pudo completar el cierre del día: ' + (error.message || 'Error desconocido'));
            } finally {
              setIsClosingDay(false);
            }
          },
        },
      ]
    );
  };

  const handlePrintDay = async () => {
    setIsPrintingDay(true);
    try {
      // Verificar configuración Bluetooth
      if (!bluetoothDevice) {
        showError('Por favor conecta un dispositivo Bluetooth en Configuración');
        setIsPrintingDay(false);
        return;
      }

      // Obtener todas las órdenes del día
      const idStore = await StorageService.getItem('idStore');
      if (!idStore) {
        showError('No se encontró el ID de la tienda');
        setIsPrintingDay(false);
        return;
      }

      const response = await OrderLecrepeService.getAllOrdersLecrepe(parseInt(idStore));
      let allOrders: Order[] = [];
      
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          allOrders = response.data;
        } else if (response.data.orders && Array.isArray(response.data.orders)) {
          allOrders = response.data.orders;
        } else if (typeof response.data === 'object') {
          const arrayKey = Object.keys(response.data).find(key => Array.isArray(response.data[key]));
          if (arrayKey) {
            allOrders = response.data[arrayKey];
          }
        }
      }

      // Filtrar órdenes (todas las que se muestran en la app: cerradas, pendientes, listas, entregadas, pero no finalizadas)
      // No filtrar por fecha para incluir todas las órdenes visibles, similar a cómo se muestran en la pantalla
      const dayOrders = allOrders.filter(order => {
        // Verificar que la orden tenga productos/items
        const hasProducts = (order.products && order.products.length > 0) || (order.items && order.items.length > 0);
        if (!hasProducts) return false;
        
        // Verificar estado (igual que getClosedOrders, getPendingOrders, etc.)
        const validStatus = (order.status === 'Cerrada' || 
                            order.status === 'Entregada' || 
                            order.status === 'Pendiente' || 
                            order.status === 'Lista') &&
                           order.status !== 'Finalizada';
        
        return validStatus;
      });

      console.log('Total órdenes obtenidas:', allOrders.length);
      console.log('Órdenes filtradas del día:', dayOrders.length);
      console.log('Órdenes filtradas:', dayOrders.map(o => ({ id: o.id_order, status: o.status, products: (o.products || o.items || []).length })));

      // Constante para precio de para llevar
      const TOGO_PRICE = 10;

      // Estructura dinámica de agregación (similar a kokoro backend)
      const data: { [key: string]: { count: number; total: number; label: string } } = {};
      let total = 0;
      let totalExtras = 0;
      let totalParaLlevar = 0;

      // Procesar órdenes (similar al backend: usar order.products directamente)
      dayOrders.forEach(order => {
        // Usar products primero (como el backend), luego items como fallback
        const products = order.products || order.items || [];
        
        if (!products || products.length === 0) {
          console.warn('Orden sin productos:', order.id_order);
          return;
        }

        products.forEach((item: any) => {
          // Usar los mismos campos que el backend
          // units puede venir como units o quantity
          const units = item.units || item.quantity || 1;
          const product_name = item.product_name || item.name || 'Sin nombre';
          const type_name = item.type_name || item.option || 'Regular';
          const type_price = item.type_price || item.price || 0;
          const extras = item.extras || [];

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

          // Calcular ganancia de extras (igual que el backend)
          extras.forEach((extra: any) => {
            totalExtras += extra.price || 0;
          });
        });

        // Calcular ganancia para llevar (igual que el backend)
        if (order.togo) {
          const bebidasCount = products.filter(
            (item: any) => (item.product_name || item.name) === 'Bebidas'
          ).length || 0;
          
          totalParaLlevar += (products.length - bebidasCount) * TOGO_PRICE;
        }
      });

      console.log('Resumen calculado:', {
        itemsCount: Object.keys(data).length,
        total,
        totalExtras,
        totalParaLlevar
      });

      // Ordenar items por label
      const items = Object.values(data).sort((a, b) => a.label.localeCompare(b.label));

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

      // Comandos ESC/POS
      const ESC = '\x1B';
      const centerText = ESC + 'a' + '\x01';
      const leftAlign = ESC + 'a' + '\x00';
      const resetFormat = ESC + '@';
      const lineFeed = '\n';
      const smallSize = ESC + '!' + '\x00';
      const doubleSizeBold = ESC + '!' + '\x38';
      const separator = isBluetoothEnabled ? '--------------------------------' : '---------------------------------------------';
      const anchoDescripcion = isBluetoothEnabled ? 20 : 35;
      const anchoPrecio = isBluetoothEnabled ? 8 : 10;

      // Fecha y hora
      const now = new Date();
      const fecha = removeAccents(now.toLocaleDateString('es-MX'));
      const hora = removeAccents(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
      const fechaCompleta = removeAccents(now.toLocaleString('es-MX'));

      // Generar resumen de ventas
      let salida = 'Resumen de ventas:\n\n';
      items.forEach(({ count, label, total }) => {
        const labelSinAcentos = removeAccents(label);
        const descripcion = `${count} - ${labelSinAcentos}`;
        const descripcionTruncada = descripcion.length > anchoDescripcion 
          ? descripcion.substring(0, anchoDescripcion - 3) + '...'
          : descripcion;
        salida += descripcionTruncada.padEnd(anchoDescripcion) + 
                  `$${total.toFixed(2)}`.padStart(anchoPrecio) + 
                  lineFeed;
      });

      const totalCierre = total + totalExtras + totalParaLlevar;
      const totalFormateado = `$${totalCierre.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;

      // Generar contenido del ticket (similar a kokoro backend)
      const ticketContent = resetFormat + smallSize +
        centerText + doubleSizeBold + removeAccents('CORTE DEL DIA') + smallSize + lineFeed +
        centerText + removeAccents('LECREPE') + lineFeed +
        centerText + removeAccents('CD. MANUEL DOBLADO') + lineFeed +
        removeAccents('Tel: 432-100-4990') + lineFeed +
        leftAlign + separator + lineFeed +
        `**CORTE DEL DIA` + lineFeed +
        `FECHA: ${fechaCompleta}` + lineFeed +
        separator + lineFeed +
        separator + lineFeed +
        (isBluetoothEnabled ? 'CANT DESCRIPCION    TOTAL\n' : 'CANT   DESCRIPCION                  TOTAL\n') +
        separator + lineFeed +
        salida +
        separator + lineFeed +
        (isBluetoothEnabled 
          ? `SUBTOTAL:${' '.repeat(anchoDescripcion + anchoPrecio - 8 - total.toFixed(2).length)}$${total.toFixed(2)}` + lineFeed
          : `SUBTOTAL:${' '.repeat(anchoDescripcion + anchoPrecio - 8 - total.toFixed(2).length)}$${total.toFixed(2)}` + lineFeed) +
        separator + lineFeed +
        (isBluetoothEnabled
          ? `EXTRAS:${' '.repeat(anchoDescripcion + anchoPrecio - 6 - totalExtras.toFixed(2).length)}$${totalExtras.toFixed(2)}` + lineFeed
          : `EXTRAS:${' '.repeat(anchoDescripcion + anchoPrecio - 6 - totalExtras.toFixed(2).length)}$${totalExtras.toFixed(2)}` + lineFeed) +
        separator + lineFeed +
        (isBluetoothEnabled
          ? `PARA LLEVAR:${' '.repeat(anchoDescripcion + anchoPrecio - 11 - totalParaLlevar.toFixed(2).length)}$${totalParaLlevar.toFixed(2)}` + lineFeed
          : `PARA LLEVAR:${' '.repeat(anchoDescripcion + anchoPrecio - 11 - totalParaLlevar.toFixed(2).length)}$${totalParaLlevar.toFixed(2)}` + lineFeed) +
        separator + lineFeed +
        (isBluetoothEnabled
          ? `TOTAL:${' '.repeat(anchoDescripcion + anchoPrecio - 5 - totalFormateado.length)}${totalFormateado}` + lineFeed
          : `TOTAL:${' '.repeat(anchoDescripcion + anchoPrecio - 5 - totalFormateado.length)}${totalFormateado}` + lineFeed) +
        separator + lineFeed +
        centerText + removeAccents('MAS DETALLES DE LAS ORDENES EN') + lineFeed +
        centerText + removeAccents('kokoro.ketxal.com') + lineFeed +
        leftAlign + separator + lineFeed +
        '\n'.repeat(isBluetoothEnabled ? 3 : 5) +
        resetFormat;

      // Usar solo Bluetooth
      try {
        await sendToBluetooth(ticketContent);
        setIsPrintingDay(false);
        showSuccess('Corte del día impreso correctamente');
      } catch (error: any) {
        setIsPrintingDay(false);
        showError('Error al enviar a impresora Bluetooth: ' + (error.message || 'Error desconocido'));
      }
    } catch (error: any) {
      console.error('Error al imprimir:', error);
      setIsPrintingDay(false);
      showError('Error en impresión: ' + (error.message || 'Error desconocido'));
    }
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
      showSuccess('Orden marcada como lista');
      loadOrders();
    } catch (error: any) {
      showError('No se pudo marcar la orden como lista');
    }
  };

  const handleMarkAsDelivered = async (orderId: number) => {
    try {
      await OrderLecrepeService.markOrderAsDelivered(orderId);
      showSuccess('Orden marcada como entregada');
      loadOrders();
    } catch (error: any) {
      showError('No se pudo marcar la orden como entregada');
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
              showSuccess('Orden cancelada');
              loadOrders();
            } catch (error: any) {
              showError('No se pudo cancelar la orden');
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
      showError('No hay orden seleccionada para imprimir');
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
        showError('Por favor configura la impresora en Configuración');
        setIsPrinting(false);
        return;
      }

      if (isBluetoothEnabled && !bluetoothDevice) {
        showError('Por favor conecta un dispositivo Bluetooth en Configuración');
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
          showSuccess(`Orden #${selectedOrder.id_order || 0} enviada a impresora Bluetooth`);
        } catch (error: any) {
          setIsPrinting(false);
          showError('Error al enviar a impresora Bluetooth: ' + (error.message || 'Error desconocido'));
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
                showSuccess(`Orden #${selectedOrder.id_order || 0} enviada a impresora`);
              }, 500);
            } catch (error: any) {
              client.destroy();
              setIsPrinting(false);
              showError('Error al enviar datos: ' + error.message);
            }
          }
        );

        client.on('error', (error: any) => {
          client.destroy();
          setIsPrinting(false);
          showError(`No se pudo conectar a la impresora. Verifica IP: ${printerIP}, Puerto: ${printerPort} y que la tablet esté en la misma red WiFi`);
        });

        client.on('close', () => {
          setIsPrinting(false);
        });

        setTimeout(() => {
          if (client && !client.destroyed) {
            client.destroy();
            setIsPrinting(false);
            showError('La impresora no respondió. Verifica la conexión.');
          }
        }, 10000);
      }
    } catch (error: any) {
      setIsPrinting(false);
      showError('Error al imprimir: ' + (error.message || 'Error desconocido'));
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

      {/* Cierre del Día Button - Floating Button */}
      <TouchableOpacity
        style={[styles.closeDayFloatingButton, (loading || isClosingDay) && styles.closeDayButtonDisabled]}
        onPress={handleCloseDay}
        disabled={loading || isClosingDay}
        activeOpacity={0.8}
      >
        {isClosingDay ? (
          <>
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.closeDayButtonText}>CERRANDO...</Text>
          </>
        ) : (
          <>
            <Text style={styles.closeDayIcon}>🔒</Text>
            <Text style={styles.closeDayButtonText}>CIERRE DEL DÍA</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Imprimir Cierre Button - Floating Button Right */}
      <TouchableOpacity
        style={[styles.printDayFloatingButton, (loading || isPrintingDay) && styles.printDayButtonDisabled]}
        onPress={handlePrintDay}
        disabled={loading || isPrintingDay}
        activeOpacity={0.8}
      >
        {isPrintingDay ? (
          <>
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.printDayButtonText}>IMPRIMIENDO...</Text>
          </>
        ) : (
          <>
            <Text style={styles.printDayIcon}>🖨️</Text>
            <Text style={styles.printDayButtonText}>IMPRIMIR CIERRE</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Order Detail Modal - Full Screen */}
      <Modal
        visible={orderDetailOpen}
        transparent={false}
        animationType="slide"
        presentationStyle="fullScreen"
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
                        // Obtener opciones adicionales desde comments
                        const comments = item.comments || '';
                        const commentsLower = comments.toLowerCase();
                        const hasAdditionalOptions = commentsLower.includes('deslactosado') || 
                                                     commentsLower.includes('sin azúcar') || 
                                                     commentsLower.includes('sin azucar') || 
                                                     commentsLower.includes('sin crema batida');
                        
                        return (
                          <View key={index} style={styles.productListItem}>
                            <View style={styles.productListItemLeft}>
                              <View style={styles.productIcon}>
                                <Text style={styles.productIconText}>☕</Text>
                              </View>
                              <View style={styles.productInfo}>
                                <View style={styles.productNameRow}>
                                  <Text style={styles.productQuantityBadge}>{itemUnits}</Text>
                                  <Text style={styles.productListItemName}>{itemName}</Text>
                                </View>
                                {excludedToppings.length > 0 && (
                                  <Text style={styles.toppingsText}>
                                    sin: {excludedToppings.map((t: any) => t.name).join(', ')}
                                  </Text>
                                )}
                                {hasAdditionalOptions && (
                                  <Text style={styles.additionalIngredientsText}>
                                    {comments}
                                  </Text>
                                )}
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
                        // Obtener ingredientes esenciales excluidos (selected === false)
                        const excludedToppings = item.toppings && Array.isArray(item.toppings) 
                          ? item.toppings.filter((t: any) => t.selected === false)
                          : [];
                        // Obtener ingredientes adicionales (marcados con additional: true o selected: true sin marca)
                        // Solo mostrar ingredientes adicionales, NO los ingredientes esenciales seleccionados
                        const additionalToppings = item.toppings && Array.isArray(item.toppings)
                          ? item.toppings.filter((t: any) => {
                              // Si tiene marca additional: true, es adicional
                              if (t.additional === true) return true;
                              // Si tiene selected: true pero no tiene marca additional, también es adicional
                              // (porque los ingredientes esenciales seleccionados ya no se guardan como toppings)
                              if (t.selected === true && t.selected !== false) return true;
                              return false;
                            })
                          : [];
                        const additionalIngredients = additionalToppings.map((t: any) => t.name);
                        
                        // Verificar si el item es "para llevar" individualmente (en órdenes de mesa)
                        const isItemTakeout = item.item_togo === true || 
                                             (item.comments && item.comments.toLowerCase().includes('para llevar') && !selectedOrder?.togo);
                        const takeoutFee = item.takeout_fee || (isItemTakeout ? 10 : 0);
                        
                        return (
                          <View key={index} style={styles.productListItem}>
                            <View style={styles.productListItemLeft}>
                              <View style={styles.productIcon}>
                                <Text style={styles.productIconText}>🍕</Text>
                              </View>
                              <View style={styles.productInfo}>
                                <View style={styles.productNameRow}>
                                  <Text style={styles.productQuantityBadge}>{itemUnits}</Text>
                                  <Text style={styles.productListItemName}>{itemName}</Text>
                                </View>
                                {excludedToppings.length > 0 && (
                                  <Text style={styles.toppingsText}>
                                    sin: {excludedToppings.map((t: any) => t.name).join(', ')}
                                  </Text>
                                )}
                                {additionalIngredients.length > 0 && (
                                  <Text style={styles.additionalIngredientsText}>
                                    con: {additionalIngredients.join(', ')}
                                  </Text>
                                )}
                                {isItemTakeout && (
                                  <Text style={styles.itemTakeoutText}>
                                    📦 Para llevar (+${takeoutFee.toFixed(2)})
                                  </Text>
                                )}
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
      <ToastComponent />
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
  closeDayFloatingButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d32f2f',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    minWidth: 140,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 1000,
  },
  printDayFloatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    minWidth: 140,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    zIndex: 1000,
  },
  printDayButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  printDayIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  printDayButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeDayButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  closeDayIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  closeDayButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
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
  productNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productListItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  productQuantityBadge: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 8,
    minWidth: 20,
    textAlign: 'left',
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
    marginBottom: 2,
  },
  itemTakeoutText: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: 'bold',
    marginTop: 4,
    fontStyle: 'italic',
  },
  additionalIngredientsText: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '500',
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



