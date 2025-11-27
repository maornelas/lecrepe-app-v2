import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import OrderTableV2 from '../components/OrderTableV2';
import OrderToGo from '../components/OrderToGo';
import { StoreService } from '../services/storeService';
import { OrderService } from '../services/orderService';
import { StorageService } from '../services/storageService';
import { Store, Order, Place } from '../types';

const HomeV2Screen: React.FC = () => {
  const [store, setStore] = useState<Store | null>(null);
  const [ordersTogo, setOrdersTogo] = useState<Order[]>([]);
  const [clickedOrder, setClickedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'mesas' | 'ordenes'>('ordenes');
  const [openDetail, setOpenDetail] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get store ID from storage (equivalent to localStorage.getItem('idStore'))
      const idStore = await StorageService.getItem('idStore');
      
      if (!idStore) {
        Alert.alert('Error', 'No se encontró el ID de la tienda. Por favor, inicia sesión.');
        return;
      }

      // Get store data
      const storeResponse = await StoreService.getStoreById(idStore);
      const storeData = storeResponse.data;
      
      // Set active tab based on store ID (store.id_store === 1 ? 'mesas' : 'ordenes')
      setActiveTab(storeData.id_store === 1 ? 'mesas' : 'ordenes');
      
      // Get orders
      const ordersResponse = await OrderService.getOrdersByStore(storeData.id_store);
      const orders = ordersResponse.data;
      
      // Add orders to tables/places
      const updatedStore = addOrdersToTables(storeData, orders);
      setStore(updatedStore);
      
      // Filter togo orders
      const togoOrders = orders.filter((order: Order) => order.togo === true);
      setOrdersTogo(togoOrders);
      
    } catch (error: any) {
      console.error('Error loading data:', error);
      Alert.alert(
        'Error',
        `No se pudieron cargar los datos.\n\n${error.message}`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const addOrdersToTables = (dataStore: Store, dataOrders: Order[]): Store => {
    const updatedStore = { ...dataStore };
    
    if (updatedStore.places && dataOrders) {
      dataOrders.forEach((order) => {
        updatedStore.places?.forEach((place) => {
          if (place.id_place === order.id_place) {
            place.order = order;
            place.available = false;
          }
        });
      });
    }
    
    return updatedStore;
  };

  const handleTabChange = (newTab: 'mesas' | 'ordenes') => {
    setActiveTab(newTab);
    if (newTab === 'mesas' && store?.places?.[0]) {
      setClickedOrder(store.places[0].order || null);
    } else if (store?.places?.[0]) {
      setClickedOrder(store.places[0].order || null);
    }
  };

  const handleClickNewOrder = () => {
    setOpenDetail(true);
    // TODO: Navigate to order creation screen
    Alert.alert('Nueva Orden', 'Funcionalidad de nueva orden - por implementar');
  };

  const notificationMessage = (message: string) => {
    Alert.alert('Notificación', message);
  };

  const handleOrderPress = (order: Order, place?: Place) => {
    setClickedOrder(order);
    // TODO: Navigate to order detail screen
    Alert.alert('Orden', `Orden #${order.id_order} - ${order.name}`);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading && !store) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lecrepe</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {store?.id_store === 1 && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'mesas' && styles.tabActive]}
            onPress={() => handleTabChange('mesas')}
          >
            <Text style={[styles.tabText, activeTab === 'mesas' && styles.tabTextActive]}>
              MESAS
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ordenes' && styles.tabActive]}
          onPress={() => handleTabChange('ordenes')}
        >
          <Text style={[styles.tabText, activeTab === 'ordenes' && styles.tabTextActive]}>
            ÓRDENES
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'mesas' ? (
          <View style={styles.mesasContainer}>
            {store && (
              <OrderTableV2
                data={store}
                selectedOrder={setClickedOrder}
                loadData={loadData}
                notification={notificationMessage}
                onOrderPress={handleOrderPress}
              />
            )}
          </View>
        ) : (
          <View style={styles.ordenesContainer}>
            <TouchableOpacity
              style={styles.newOrderButton}
              onPress={handleClickNewOrder}
            >
              <Text style={styles.newOrderButtonText}>Nueva orden</Text>
            </TouchableOpacity>
            
            <OrderToGo
              data={ordersTogo}
              selectedOrder={setClickedOrder}
              loadData={loadData}
              notification={notificationMessage}
              onOrderPress={handleOrderPress}
            />
          </View>
        )}
      </ScrollView>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
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
  content: {
    flex: 1,
  },
  mesasContainer: {
    flex: 1,
    padding: 8,
  },
  ordenesContainer: {
    flex: 1,
    padding: 8,
  },
  newOrderButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 8,
  },
  newOrderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeV2Screen;

