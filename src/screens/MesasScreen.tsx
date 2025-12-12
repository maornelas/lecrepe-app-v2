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
  Modal,
  Dimensions,
} from 'react-native';
import { StoreService } from '../services/storeService';
import { OrderLecrepeService } from '../services/orderLecrepeService';
import { StorageService } from '../services/storageService';
import { Store, Place, Order } from '../types';
import { OrderCreation } from '../components';
import { useToast } from '../hooks/useToast';

interface MesasScreenProps {
  navigation?: any;
}

const MesasScreen: React.FC<MesasScreenProps> = ({ navigation }) => {
  // Usar hook de toast para notificaciones elegantes
  const { showSuccess, showError, showInfo, showWarning, ToastComponent } = useToast();
  
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTable, setSelectedTable] = useState<Place | null>(null);
  const [isOrderCreationOpen, setIsOrderCreationOpen] = useState(false);
  const [isViewingOrder, setIsViewingOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Estado para rastrear las mesas del croquis y sus órdenes
  const [croquisTablesState, setCroquisTablesState] = useState<Record<string, { order: Order | null; available: boolean }>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const idStore = await StorageService.getItem('idStore');
      if (!idStore) {
        showError('No se encontró el ID de la tienda');
        return;
      }

      // Load store data
      const storeResponse = await StoreService.getStoreById(idStore);
      const storeData = storeResponse.data;

      // Load orders
      const ordersResponse = await OrderLecrepeService.getAllOrdersLecrepe(parseInt(idStore));
      const ordersData = ordersResponse.data || [];

      // Filtrar órdenes activas (no cerradas, entregadas o canceladas)
      const activeOrders = ordersData.filter((o) => 
        o.status !== 'Cerrada' && 
        o.status !== 'Entregada' && 
        o.status !== 'Cancelada'
      );
      
      // Add orders to tables
      const newCroquisState: Record<string, { order: Order | null; available: boolean }> = {};
      
      if (storeData.places) {
        storeData.places.forEach((place) => {
          // Buscar orden activa por id_place (solo órdenes no cerradas)
          let order = activeOrders.find((o) => o.id_place === place.id_place);
          
          // Si no se encuentra por id_place, buscar por nombre de mesa en el cliente o nombre de la orden
          if (!order && place.name) {
            order = activeOrders.find((o) => {
              // Buscar por nombre de cliente que coincida con el nombre de la mesa
              const clientName = o.client?.name || o.name || '';
              const normalizedClientName = clientName.toUpperCase().replace(/[^A-Z0-9]/g, '');
              const normalizedPlaceName = place.name.toUpperCase().replace(/[^A-Z0-9]/g, '');
              
              // También buscar si el id_place es 0 y el nombre de la orden contiene el nombre de la mesa
              return (o.id_place === 0 || o.id_place === parseInt(String(place.name)) || isNaN(parseInt(String(place.name)))) &&
                     (normalizedClientName === normalizedPlaceName || 
                      normalizedClientName.includes(normalizedPlaceName) ||
                      normalizedPlaceName.includes(normalizedClientName));
            });
          }
          
          if (order) {
            place.order = order;
            // La mesa está ocupada si tiene una orden activa
            place.available = false;
          } else {
            place.available = true;
            place.order = undefined;
          }
          
          // Guardar estado en croquisTablesState
          if (place.name) {
            newCroquisState[place.name.toUpperCase()] = {
              order: place.order || null,
              available: place.available,
            };
          }
        });
      }
      
      // También buscar órdenes activas que puedan estar asociadas a mesas del croquis por nombre
      const croquisTableNames = ['T1', 'T2', 'T3', 'T4', 'ARBOL', 'BICI', 'MONA', 'CENTRO', 'TELEFONO', 'ESCALERA', 'TES'];
      croquisTableNames.forEach((tableName) => {
        if (!newCroquisState[tableName]) {
          // Buscar orden activa por nombre de mesa en el cliente o nombre de la orden
          const order = activeOrders.find((o) => {
            const clientName = o.client?.name || o.name || '';
            const normalizedClientName = clientName.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const normalizedTableName = tableName.toUpperCase().replace(/[^A-Z0-9]/g, '');
            
            return normalizedClientName === normalizedTableName || 
                   normalizedClientName.includes(normalizedTableName) ||
                   normalizedTableName.includes(normalizedClientName);
          });
          
          if (order) {
            // Orden activa encontrada - mesa ocupada
            newCroquisState[tableName] = {
              order: order,
              available: false,
            };
          } else {
            // No hay orden activa - mesa disponible
            newCroquisState[tableName] = {
              order: null,
              available: true,
            };
          }
        }
      });

      setStore(storeData);
      setOrders(ordersData);
      setCroquisTablesState(newCroquisState);
    } catch (error: any) {
      console.error('Error loading data:', error);
      showError('No se pudieron cargar los datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleTablePress = (place: Place) => {
    setSelectedTable(place);
    if (place.order) {
      // Mesa ocupada: mostrar orden existente
      setIsViewingOrder(true);
      setIsOrderCreationOpen(true);
    } else {
      // Mesa disponible: crear nueva orden
      setIsViewingOrder(false);
      setIsOrderCreationOpen(true);
    }
  };

  const handleCloseOrderCreation = () => {
    setIsOrderCreationOpen(false);
    setIsViewingOrder(false);
    setSelectedTable(null);
    loadData(); // Recargar datos para actualizar el estado de las mesas
  };

  const handleOrderCreated = async (orderData: Partial<Order>) => {
    try {
      // La orden ya fue creada por OrderCreation, recargamos los datos
      // loadData() actualizará automáticamente croquisTablesState
      await loadData();
      handleCloseOrderCreation();
      showSuccess(`Orden creada para Mesa ${selectedTable?.name || ''}`);
    } catch (error: any) {
      console.error('Error handling order creation:', error);
      showError('No se pudo crear la orden');
    }
  };

  const handleOrderUpdated = async (orderData: Partial<Order>) => {
    try {
      // El backend espera id_order como número en la URL
      // orderData debería incluir id_order desde OrderCreation
      let orderId: string | number | undefined;
      
      // Prioridad: id_order de orderData > id_order de selectedTable.order > _id de selectedTable.order
      if (orderData.id_order) {
        orderId = orderData.id_order;
      } else if (selectedTable?.order?.id_order) {
        orderId = selectedTable.order.id_order;
      } else if (selectedTable?.order?._id) {
        // Si solo tenemos _id, intentar usarlo (puede que el backend lo acepte)
        orderId = selectedTable.order._id;
      } else {
        showError('No se pudo identificar la orden');
        return;
      }
      
      // Asegurarse de que orderData no incluya id_order en el body (solo en la URL)
      const { id_order, ...orderDataWithoutId } = orderData;
      
      await OrderLecrepeService.updateOrderLecrepe(orderId, orderDataWithoutId);
      // loadData() actualizará automáticamente croquisTablesState
      await loadData();
      handleCloseOrderCreation();
      showSuccess(`Orden actualizada para Mesa ${selectedTable?.name || ''}`);
    } catch (error: any) {
      console.error('Error handling order update:', error);
      showError('No se pudo actualizar la orden');
    }
  };

  const getTableStatusColor = (place: Place) => {
    // Si la mesa está disponible (sin orden o con orden cerrada/entregada/cancelada)
    if (place.available) {
      return '#4CAF50'; // Verde para mesas disponibles
    }
    
    // Si la mesa tiene una orden activa
    if (place.order) {
      switch (place.order.status) {
        case 'Cerrada':
        case 'Entregada':
          return '#4CAF50'; // Verde - mesa disponible nuevamente
        case 'Lista':
          return '#FF9800'; // Naranja
        case 'Pendiente':
          return '#F44336'; // Rojo
        case 'Cancelada':
          return '#4CAF50'; // Verde - mesa disponible nuevamente
        default:
          return '#F44336'; // Rojo por defecto
      }
    }
    
    return '#4CAF50'; // Verde por defecto (mesa disponible)
  };

  const getTableStatusText = (place: Place) => {
    if (!place.available && place.order) {
      switch (place.order.status) {
        case 'Cerrada':
        case 'Entregada':
          return 'Cerrada';
        case 'Lista':
          return 'Lista';
        case 'Pendiente':
          return 'Pendiente';
        case 'Cancelada':
          return 'Cancelada';
        default:
          return 'Ocupada';
      }
    }
    return 'Disponible';
  };

  // Función para encontrar una mesa por nombre (flexible con variaciones)
  const findPlaceByName = (name: string): Place | undefined => {
    if (!store?.places) return undefined;
    
    const normalizedName = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    return store.places.find((place) => {
      if (!place.name) return false;
      const normalizedPlaceName = place.name.toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      // Coincidencias exactas o normalizadas
      if (place.name.toUpperCase() === name.toUpperCase()) return true;
      if (normalizedPlaceName === normalizedName) return true;
      
      // Coincidencias parciales para casos como "CENTROI" -> "CENTRO", "TÉS" -> "TES"
      if (normalizedPlaceName.includes(normalizedName) || normalizedName.includes(normalizedPlaceName)) {
        return true;
      }
      
      return false;
    });
  };

  // Función para renderizar una mesa del croquis
  const renderTable = (tableName: string, style: any) => {
    const place = findPlaceByName(tableName);
    const croquisState = croquisTablesState[tableName.toUpperCase()];
    
    // Usar el estado del croquis si existe, de lo contrario usar el place
    const tableOrder = croquisState?.order || place?.order;
    const isAvailable = croquisState !== undefined ? croquisState.available : (place?.available ?? true);
    
    // Determinar color y texto del estado
    let statusColor = '#4CAF50'; // Verde por defecto (disponible)
    let statusText = 'Disponible';
    
    if (tableOrder && !isAvailable) {
      // Mesa ocupada con orden activa
      switch (tableOrder.status) {
        case 'Lista':
          statusColor = '#FF9800'; // Naranja
          statusText = 'Lista';
          break;
        case 'Pendiente':
          statusColor = '#F44336'; // Rojo
          statusText = 'Pendiente';
          break;
        default:
          statusColor = '#F44336'; // Rojo
          statusText = 'Ocupada';
      }
    } else if (tableOrder && isAvailable) {
      // Mesa con orden cerrada/entregada/cancelada
      statusColor = '#4CAF50'; // Verde - disponible
      statusText = 'Disponible';
    }
    
    // Función para manejar el clic en la mesa
    const handleTableClick = () => {
      if (place) {
        // Si la mesa existe en la base de datos, usar el place real
        handleTablePress(place);
      } else {
        // Si la mesa no existe, crear un Place temporal con el estado del croquis
        const tempPlace: Place = {
          id_place: 0, // Se asignará cuando se cree la orden
          name: tableName,
          available: isAvailable,
          order: tableOrder || undefined,
        };
        handleTablePress(tempPlace);
      }
    };
    
    return (
      <TouchableOpacity
        key={tableName}
        style={[styles.croquisTable, style, { backgroundColor: statusColor }]}
        onPress={handleTableClick}
      >
        <Text style={styles.croquisTableName}>{tableName}</Text>
        {tableOrder && !isAvailable && (
          <>
            <Text style={styles.croquisTableStatus}>{statusText}</Text>
            <Text style={styles.croquisTableOrder}>
              #{tableOrder.id_order}
            </Text>
            <Text style={styles.croquisTableAmount} numberOfLines={1}>
              ${(tableOrder.payment?.amount || tableOrder.total || 0).toFixed(0)}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Cargando mesas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const leftColumnWidth = screenWidth * 0.25; // 25% para columna izquierda
  const rightAreaWidth = screenWidth * 0.75; // 75% para área derecha
  const tableSpacing = 32; // Aumentado para más separación vertical
  // Calcular altura disponible (pantalla completa menos header y SafeArea)
  const headerHeight = 60; // Altura aproximada del header
  const safeAreaTop = 44; // SafeArea top en iOS
  const padding = 24; // Padding del contenedor aumentado
  const availableHeight = screenHeight - headerHeight - safeAreaTop - padding;
  // Distribuir verticalmente: 4 filas de mesas
  const rowHeight = (availableHeight - (tableSpacing * 3)) / 4;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <Text style={styles.backButtonText}>← Regresar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>MESAS</Text>
        <TouchableOpacity
          style={styles.newOrderButton}
          onPress={() => showInfo('Nueva Orden - Por implementar')}
        >
          <Text style={styles.newOrderButtonText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* Croquis Layout */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.croquisContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Columna Izquierda - T4, T3, T2, T1 (orden inverso) */}
        <View style={[styles.leftColumn, { width: leftColumnWidth, height: availableHeight }]}>
          {renderTable('T4', { 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: leftColumnWidth - 24, 
            height: rowHeight 
          })}
          {renderTable('T3', { 
            position: 'absolute', 
            top: rowHeight + tableSpacing, 
            left: 0, 
            width: leftColumnWidth - 24, 
            height: rowHeight 
          })}
          {renderTable('T2', { 
            position: 'absolute', 
            top: (rowHeight + tableSpacing) * 2, 
            left: 0, 
            width: leftColumnWidth - 24, 
            height: rowHeight 
          })}
          {renderTable('T1', { 
            position: 'absolute', 
            top: (rowHeight + tableSpacing) * 3, 
            left: 0, 
            width: leftColumnWidth - 24, 
            height: rowHeight 
          })}
        </View>

        {/* Área Derecha Principal */}
        <View style={[styles.mainRightArea, { width: rightAreaWidth, height: availableHeight, marginLeft: 24 }]}>
          {/* Fila 1 */}
          {renderTable('ARBOL', { 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: (rightAreaWidth - 80) * 0.48, 
            height: rowHeight 
          })}
          {renderTable('BICI', { 
            position: 'absolute', 
            top: 0, 
            left: (rightAreaWidth - 80) * 0.48 + 16, 
            width: (rightAreaWidth - 80) * 0.48, 
            height: rowHeight 
          })}

          {/* Fila 2 */}
          {renderTable('MONA', { 
            position: 'absolute', 
            top: rowHeight + tableSpacing, 
            left: 0, 
            width: (rightAreaWidth - 80) * 0.48, 
            height: rowHeight 
          })}
          {renderTable('CENTRO', { 
            position: 'absolute', 
            top: rowHeight + tableSpacing, 
            left: (rightAreaWidth - 80) * 0.48 + 16, 
            width: (rightAreaWidth - 80) * 0.48, 
            height: rowHeight 
          })}

          {/* Fila 3 */}
          {renderTable('TELEFONO', { 
            position: 'absolute', 
            top: (rowHeight + tableSpacing) * 2, 
            left: 0, 
            width: (rightAreaWidth - 80) * 0.48, 
            height: rowHeight 
          })}
          {renderTable('ESCALERA', { 
            position: 'absolute', 
            top: (rowHeight + tableSpacing) * 2, 
            left: (rightAreaWidth - 80) * 0.48 + 16, 
            width: (rightAreaWidth - 80) * 0.48, 
            height: rowHeight 
          })}

          {/* Fila 4 */}
          {renderTable('TES', { 
            position: 'absolute', 
            top: (rowHeight + tableSpacing) * 3, 
            left: (rightAreaWidth - 80) * 0.26, 
            width: (rightAreaWidth - 80) * 0.48, 
            height: rowHeight 
          })}
        </View>
      </ScrollView>

      {/* OrderCreation Modal */}
      {selectedTable && (
        <OrderCreation
          isOpen={isOrderCreationOpen}
          onClose={handleCloseOrderCreation}
          tableInfo={{
            mesa: selectedTable.name || 'NUEVA ORDEN', // Usar siempre el nombre de la mesa para el nombre de la orden
            nombre: selectedTable.order?.client?.name || selectedTable.order?.name || selectedTable.name || 'Cliente General',
            orden: selectedTable.order?.id_order || 0,
            id_place: selectedTable.id_place || 0, // ID numérico de la mesa para guardar en id_place
          }}
          isTakeout={false}
          editingOrder={isViewingOrder ? selectedTable.order : null}
          isEditMode={isViewingOrder}
          onSave={isViewingOrder ? handleOrderUpdated : handleOrderCreated}
          readOnly={selectedTable.order?.status === 'Cerrada' || selectedTable.order?.status === 'Cancelada' || selectedTable.order?.status === 'Entregada'}
        />
      )}
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
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2196F3',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  newOrderButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newOrderButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  croquisContainer: {
    flexDirection: 'row',
    padding: 24,
    flexGrow: 1,
    minHeight: '100%',
  },
  leftColumn: {
    position: 'relative',
  },
  mainRightArea: {
    position: 'relative',
    flex: 1,
  },
  croquisTable: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    padding: 12,
    margin: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  croquisTableName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  croquisTableStatus: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 2,
  },
  croquisTableOrder: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 2,
  },
  croquisTableAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 2,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  modalBody: {
    padding: 16,
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
});

export default MesasScreen;



