import React, { useState, useEffect, useMemo } from 'react';
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
  Dimensions,
} from 'react-native';
import { OrderLecrepeService } from '../services/orderLecrepeService';
import { OrderService } from '../services/orderService';
import { StorageService } from '../services/storageService';
import { useBluetooth } from '../contexts/BluetoothContext';
import { Order } from '../types';
import { useToast } from '../hooks/useToast';

interface VentasScreenProps {
  navigation?: any;
}

const VentasScreen: React.FC<VentasScreenProps> = ({ navigation }) => {
  const [allClosedOrders, setAllClosedOrders] = useState<Order[]>([]);
  const [selectedTab, setSelectedTab] = useState(0); // 0: HOY, 1: SEMANA, 2: MES
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPrintingDay, setIsPrintingDay] = useState(false);
  const { showSuccess, showError, ToastComponent } = useToast();
  
  // Usar contexto de Bluetooth
  const { isBluetoothEnabled, bluetoothDevice, sendToBluetooth } = useBluetooth();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const idStore = await StorageService.getItem('idStore');
      if (!idStore) {
        Alert.alert('Error', 'No se encontró el ID de la tienda');
        setAllClosedOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Llamar al servicio igual que lecrepe-front
      const response = await OrderLecrepeService.getAllOrdersLecrepe(parseInt(idStore));
      
      // En lecrepe-front, response.data es directamente el array de órdenes
      // Verificar si response.data existe y es un array
      let allOrders: Order[] = [];
      
      if (response && response.data) {
        // Si response.data es un array, usarlo directamente
        if (Array.isArray(response.data)) {
          allOrders = response.data;
        } 
        // Si response.data tiene una propiedad que es un array (por ejemplo, response.data.orders)
        else if (response.data.orders && Array.isArray(response.data.orders)) {
          allOrders = response.data.orders;
        }
        // Si response.data es un objeto con datos, intentar extraer el array
        else if (typeof response.data === 'object') {
          // Buscar cualquier propiedad que sea un array
          const arrayKey = Object.keys(response.data).find(key => Array.isArray(response.data[key]));
          if (arrayKey) {
            allOrders = response.data[arrayKey];
          }
        }
      }
      
      console.log('📊 Total órdenes recibidas:', allOrders.length);
      console.log('📊 Estados de órdenes:', allOrders.map(o => o.status));
      
      // Filtrar órdenes cerradas (excluyendo las Finalizadas)
      const closed = allOrders.filter(order => 
        (order.status === 'Cerrada' || order.status === 'Entregada') && 
        order.status !== 'Finalizada'
      );
      
      console.log('📊 Órdenes cerradas encontradas:', closed.length);
      
      // Ordenar por fecha más reciente primero (igual que lecrepe-front)
      const sorted = closed.sort((a, b) => {
        const dateA = new Date(a.created_at || a.date || 0);
        const dateB = new Date(b.created_at || b.date || 0);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log('📊 Órdenes cerradas ordenadas:', sorted.length);
      if (sorted.length > 0) {
        console.log('📊 Primera orden cerrada:', {
          id: sorted[0].id_order || sorted[0].id || sorted[0]._id,
          status: sorted[0].status,
          date: sorted[0].created_at || sorted[0].date,
          total: sorted[0].total || sorted[0].payment?.amount
        });
      }
      
      setAllClosedOrders(sorted);
    } catch (error: any) {
      console.error('Error loading sales:', error);
      console.error('Error details:', error.message, error.stack);
      Alert.alert('Error', 'No se pudieron cargar las ventas: ' + (error.message || 'Error desconocido'));
      setAllClosedOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePrintDay = async () => {
    setIsPrintingDay(true);
    try {
      // Verificar configuración Bluetooth
      if (!bluetoothDevice) {
        Alert.alert('Error', 'Por favor conecta un dispositivo Bluetooth en Configuración');
        setIsPrintingDay(false);
        return;
      }

      // Obtener todas las órdenes del día
      const idStore = await StorageService.getItem('idStore');
      if (!idStore) {
        Alert.alert('Error', 'No se encontró el ID de la tienda');
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
        Alert.alert('Éxito', 'Corte del día impreso correctamente');
      } catch (error: any) {
        setIsPrintingDay(false);
        Alert.alert('Error', 'Error al enviar a impresora Bluetooth: ' + (error.message || 'Error desconocido'));
      }
    } catch (error: any) {
      console.error('Error al imprimir:', error);
      setIsPrintingDay(false);
      Alert.alert('Error', 'Error en impresión: ' + (error.message || 'Error desconocido'));
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
      return `${displayHours}:${displayMinutes} ${ampm}`;
    } catch {
      return dateString;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Filtrar órdenes según el tab seleccionado
  // En lecrepe-front, los tabs NO filtran por fecha - muestran TODAS las órdenes cerradas
  // Los tabs parecen ser solo visuales o para futura funcionalidad
  // Por ahora, mostrar todas las órdenes cerradas sin filtrar por fecha
  const filteredOrders = useMemo(() => {
    // Mostrar todas las órdenes cerradas sin filtrar por fecha (igual que lecrepe-front)
    return allClosedOrders;
  }, [allClosedOrders]);

  // Calcular totales
  const totals = useMemo(() => {
    const total = filteredOrders.reduce((sum, order) => {
      return sum + (order.total || order.payment?.amount || 0);
    }, 0);
    return {
      total,
      count: filteredOrders.length,
    };
  }, [filteredOrders]);

  // Mapear órdenes a datos de tabla
  const productosData = useMemo(() => {
    return filteredOrders.map(order => {
      const itemsCount = order.items?.length || 0;
      const total = order.total || order.payment?.amount || 0;
      const category = order.togo ? 'Para llevar' : 'Local';
      const time = formatTime(order.created_at || order.date);
      
      return {
        orden: order.id_order || order.id || order._id || 0,
        sales: itemsCount,
        conversion: time,
        revenue: `$${total.toFixed(2)}`,
        total: category
      };
    });
  }, [filteredOrders]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Cargando ventas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleDownloadPDF = () => {
    if (productosData.length === 0) {
      Alert.alert('Aviso', 'No hay datos para descargar');
      return;
    }
    // TODO: Implementar descarga de PDF
    Alert.alert('Info', 'Funcionalidad de descarga PDF - por implementar');
  };

  const handleCloseSales = async () => {
    Alert.alert(
      'Cierre de Ventas',
      '¿Estás seguro de que deseas finalizar todas las órdenes del día? Esta acción no se puede deshacer.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Finalizar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const idStore = await StorageService.getItem('idStore');
              if (!idStore) {
                Alert.alert('Error', 'No se encontró el ID de la tienda');
                setLoading(false);
                return;
              }

              // Obtener todas las órdenes del día
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
                setLoading(false);
                return;
              }

              // Filtrar órdenes cerradas del día (igual que kokoro-front: solo las que están Cerradas o Entregadas)
              // No importa la fecha, solo el estado - todas las órdenes cerradas se finalizan
              const ordersToFinalize = allOrders.filter(order => {
                const isClosedOrDelivered = order.status === 'Cerrada' || order.status === 'Entregada';
                const notFinalized = order.status !== 'Finalizada';
                
                return isClosedOrDelivered && notFinalized;
              });

              if (ordersToFinalize.length === 0) {
                Alert.alert('Info', 'No hay órdenes cerradas para finalizar');
                setLoading(false);
                return;
              }

              // Actualizar cada orden a estado "Finalizada"
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
                Alert.alert(
                  'Éxito',
                  `El día fue cerrado correctamente. Se finalizaron ${successCount} órdenes. Las órdenes finalizadas ya no se mostrarán en la aplicación.`
                );
              } else {
                Alert.alert(
                  'Advertencia',
                  `Se finalizaron ${successCount} órdenes, pero ${errorCount} tuvieron errores.`
                );
              }
            } catch (error: any) {
              console.error('Error en cierre de ventas:', error);
              Alert.alert('Error', 'No se pudo completar el cierre de ventas: ' + (error.message || 'Error desconocido'));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

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
          <Text style={styles.backButtonText}>REGRESAR</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 0 && styles.tabActive]}
            onPress={() => setSelectedTab(0)}
          >
            <Text style={[styles.tabText, selectedTab === 0 && styles.tabTextActive]}>
              HOY
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 1 && styles.tabActive]}
            onPress={() => setSelectedTab(1)}
          >
            <Text style={[styles.tabText, selectedTab === 1 && styles.tabTextActive]}>
              SEMANA
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 2 && styles.tabActive]}
            onPress={() => setSelectedTab(2)}
          >
            <Text style={[styles.tabText, selectedTab === 2 && styles.tabTextActive]}>
              MES
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Metrics Section */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>TOTAL VENDIDO</Text>
          <Text style={styles.metricValue}>
            ${totals.total.toFixed(2)}
          </Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>ORDENES</Text>
          <Text style={styles.metricValue}>{totals.count}</Text>
        </View>
        <TouchableOpacity
          style={[styles.downloadButton, productosData.length === 0 && styles.downloadButtonDisabled]}
          onPress={handleDownloadPDF}
          disabled={productosData.length === 0}
        >
          <Text style={styles.downloadIcon}>⬇</Text>
          <Text style={[styles.downloadButtonText, productosData.length === 0 && styles.downloadButtonTextDisabled]}>
            DESCARGA INFO
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cierre de Ventas Button */}
      <View style={styles.closeSalesContainer}>
        <View style={styles.closeSalesButtonsRow}>
          <TouchableOpacity
            style={[styles.printDayButton, (loading || isPrintingDay) && styles.printDayButtonDisabled]}
            onPress={handlePrintDay}
            disabled={loading || isPrintingDay}
          >
            {isPrintingDay ? (
              <>
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.printDayButtonText}>IMPRIMIENDO...</Text>
              </>
            ) : (
              <>
                <Text style={styles.printDayIcon}>🖨️</Text>
                <Text style={styles.printDayButtonText}>IMPRIMIR CIERRE</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.closeSalesButton, loading && styles.closeSalesButtonDisabled]}
            onPress={handleCloseSales}
            disabled={loading}
          >
            <Text style={styles.closeSalesIcon}>🔒</Text>
            <Text style={styles.closeSalesButtonText}>
              CIERRE DEL DÍA
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.closeSalesHint}>
          Finaliza todas las órdenes cerradas del día. Las órdenes finalizadas ya no se mostrarán en la aplicación.
        </Text>
      </View>
      
      <ToastComponent />

      {/* Products Table */}
      <Text style={styles.productsTitle}>Productos</Text>
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.tableHeaderCellOrden]}>ORDEN</Text>
            <Text style={[styles.tableHeaderCell, styles.tableHeaderCellProductos]}>PRODUCTOS</Text>
            <Text style={[styles.tableHeaderCell, styles.tableHeaderCellHora]}>HORA</Text>
            <Text style={[styles.tableHeaderCell, styles.tableHeaderCellIngresos]}>INGRESOS</Text>
            <Text style={[styles.tableHeaderCell, styles.tableHeaderCellCategoria]}>CATEGORÍA</Text>
          </View>

          {/* Table Body */}
          {productosData.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No hay órdenes cerradas</Text>
            </View>
          ) : (
            productosData.map((producto, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                <Text style={[styles.tableCell, styles.tableCellOrden]}>
                  {producto.orden}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellProductos]}>
                  {producto.sales}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellHora]}>
                  {producto.conversion}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellIngresos, styles.tableCellBold]}>
                  {producto.revenue}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellCategoria]}>
                  {producto.total}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

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
    backgroundColor: '#fff',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonIcon: {
    fontSize: 18,
    color: '#fff',
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#FF9800',
  },
  tabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
  },
  tabTextActive: {
    color: '#FF9800',
  },
  metricsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  metricBox: {
    flex: 1,
    minWidth: 100,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  downloadButtonDisabled: {
    backgroundColor: '#ccc',
  },
  downloadIcon: {
    fontSize: 16,
    color: '#fff',
    marginRight: 6,
  },
  downloadButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  downloadButtonTextDisabled: {
    color: '#999',
  },
  closeSalesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeSalesButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  printDayButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  printDayButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  printDayIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  printDayButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeSalesButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d32f2f',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  closeSalesButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  closeSalesIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  closeSalesButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeSalesHint: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  productsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  content: {
    flex: 1,
  },
  tableContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  tableHeaderCellOrden: {
    width: width * 0.15,
  },
  tableHeaderCellProductos: {
    width: width * 0.15,
  },
  tableHeaderCellHora: {
    width: width * 0.2,
  },
  tableHeaderCellIngresos: {
    width: width * 0.25,
  },
  tableHeaderCellCategoria: {
    width: width * 0.25,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableRowEven: {
    backgroundColor: '#f5f5f5',
  },
  tableCell: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  tableCellBold: {
    fontWeight: 'bold',
    color: '#333',
  },
  tableCellOrden: {
    width: width * 0.15,
  },
  tableCellProductos: {
    width: width * 0.15,
  },
  tableCellHora: {
    width: width * 0.2,
  },
  tableCellIngresos: {
    width: width * 0.25,
  },
  tableCellCategoria: {
    width: width * 0.25,
  },
  emptyRow: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#999',
  },
});

export default VentasScreen;



