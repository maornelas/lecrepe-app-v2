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
import { StorageService } from '../services/storageService';
import { Order } from '../types';

interface VentasScreenProps {
  navigation?: any;
}

const VentasScreen: React.FC<VentasScreenProps> = ({ navigation }) => {
  const [allClosedOrders, setAllClosedOrders] = useState<Order[]>([]);
  const [selectedTab, setSelectedTab] = useState(0); // 0: HOY, 1: SEMANA, 2: MES
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      
      // Filtrar órdenes cerradas exactamente como lecrepe-front
      const closed = allOrders.filter(order => 
        order.status === 'Cerrada' || order.status === 'Entregada'
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



