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
} from 'react-native';
import { StoreService } from '../services/storeService';
import { OrderLecrepeService } from '../services/orderLecrepeService';
import { StorageService } from '../services/storageService';
import { Store, Place, Order } from '../types';

interface MesasScreenProps {
  navigation?: any;
}

const MesasScreen: React.FC<MesasScreenProps> = ({ navigation }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTable, setSelectedTable] = useState<Place | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const idStore = await StorageService.getItem('idStore');
      if (!idStore) {
        Alert.alert('Error', 'No se encontró el ID de la tienda');
        return;
      }

      // Load store data
      const storeResponse = await StoreService.getStoreById(idStore);
      const storeData = storeResponse.data;

      // Load orders
      const ordersResponse = await OrderLecrepeService.getAllOrdersLecrepe(parseInt(idStore));
      const ordersData = ordersResponse.data || [];

      // Add orders to tables
      if (storeData.places) {
        storeData.places.forEach((place) => {
          const order = ordersData.find((o) => o.id_place === place.id_place);
          if (order) {
            place.order = order;
            place.available = false;
          } else {
            place.available = true;
            place.order = undefined;
          }
        });
      }

      setStore(storeData);
      setOrders(ordersData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
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
      setOrderDetailOpen(true);
    } else {
      // TODO: Open new order creation
      Alert.alert('Mesa Disponible', 'Crear nueva orden para esta mesa - por implementar');
    }
  };

  const getTableStatusColor = (place: Place) => {
    if (!place.available && place.order) {
      switch (place.order.status) {
        case 'Cerrada':
        case 'Entregada':
          return '#9e9e9e';
        case 'Lista':
          return '#FF9800';
        case 'Pendiente':
          return '#F44336';
        case 'Cancelada':
          return '#9E9E9E';
        default:
          return '#F44336';
      }
    }
    return '#9e9e9e';
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
          onPress={() => Alert.alert('Nueva Orden', 'Por implementar')}
        >
          <Text style={styles.newOrderButtonText}>+ Nueva</Text>
        </TouchableOpacity>
      </View>

      {/* Tables Grid */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.tablesGrid}>
          {store?.places?.map((place) => (
            <TouchableOpacity
              key={place.id_place}
              style={[
                styles.tableCard,
                { backgroundColor: getTableStatusColor(place) },
              ]}
              onPress={() => handleTablePress(place)}
            >
              <View style={styles.tableContent}>
                <Text style={styles.tableName}>{place.name}</Text>
                <Text style={styles.tableStatus}>
                  {getTableStatusText(place)}
                </Text>
                {place.order && (
                  <>
                    <Text style={styles.tableOrderNumber}>
                      Orden #{place.order.id_order}
                    </Text>
                    <Text style={styles.tableClientName}>
                      {place.order.client?.name || place.order.name}
                    </Text>
                    <Text style={styles.tableAmount}>
                      ${(place.order.payment?.amount || 0).toFixed(2)}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Order Detail Modal */}
      <Modal
        visible={orderDetailOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setOrderDetailOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Mesa {selectedTable?.name} - Orden #{selectedTable?.order?.id_order}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setOrderDetailOpen(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedTable?.order && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.detailLabel}>Cliente:</Text>
                <Text style={styles.detailValue}>
                  {selectedTable.order.client?.name || selectedTable.order.name || 'N/A'}
                </Text>
                <Text style={styles.detailLabel}>Estado:</Text>
                <Text style={styles.detailValue}>{selectedTable.order.status}</Text>
                <Text style={styles.detailLabel}>Productos:</Text>
                {selectedTable.order.items?.map((item, index) => (
                  <View key={index} style={styles.productItem}>
                    <Text style={styles.productName}>
                      {item.product_name} - {item.type_name}
                    </Text>
                    <Text style={styles.productDetails}>
                      Cantidad: {item.units} | Precio: ${item.type_price.toFixed(2)}
                    </Text>
                  </View>
                ))}
                {selectedTable.order.products?.map((product, index) => (
                  <View key={index} style={styles.productItem}>
                    <Text style={styles.productName}>
                      {product.product_name} - {product.type_name}
                    </Text>
                    <Text style={styles.productDetails}>
                      Cantidad: {product.units} | Precio: ${product.type_price.toFixed(2)}
                    </Text>
                  </View>
                ))}
                {selectedTable.order.payment && (
                  <>
                    <Text style={styles.detailLabel}>Total:</Text>
                    <Text style={styles.detailValue}>
                      ${selectedTable.order.payment.amount.toFixed(2)}
                    </Text>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
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
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  tableCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableContent: {
    alignItems: 'center',
  },
  tableName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  tableStatus: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  tableOrderNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
  },
  tableClientName: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  tableAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
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



