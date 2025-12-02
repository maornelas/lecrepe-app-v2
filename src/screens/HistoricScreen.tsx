import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { HistoricService } from '../services/historicService';
import { Order } from '../types';

interface HistoricScreenProps {
  navigation?: any;
}

const HistoricScreen: React.FC<HistoricScreenProps> = ({ navigation }) => {
  const [dataOrders, setDataOrders] = useState<Order[]>([]);
  const [clickedOrder, setClickedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await HistoricService.getOrdersFinished();
      if (response.data) {
        setDataOrders(response.data);
        if (response.data.length > 0) {
          setClickedOrder(response.data[0]);
        }
      }
    } catch (error: any) {
      console.error('Error loading historic orders:', error);
      Alert.alert('Error', 'No se pudieron cargar las órdenes cerradas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleOrderPress = (order: Order) => {
    setClickedOrder(order);
    // TODO: Navigate to order detail
    Alert.alert('Orden', `Orden #${order.id_order} - ${order.name}`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <Text style={styles.backButtonText}>← Regresar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Órdenes Cerradas</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {dataOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay órdenes cerradas</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {dataOrders.map((order) => (
              <TouchableOpacity
                key={order._id || order.id_order}
                style={[
                  styles.orderCard,
                  clickedOrder?._id === order._id && styles.orderCardSelected,
                ]}
                onPress={() => handleOrderPress(order)}
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.orderNumber}>#{order.id_order}</Text>
                  <Text style={styles.orderStatus}>{order.status}</Text>
                </View>
                <Text style={styles.orderName}>{order.name}</Text>
                <Text style={styles.orderDate}>
                  {formatDate(order.creation_date || order.date)}
                </Text>
                {order.id_place && (
                  <Text style={styles.orderPlace}>Lugar: {order.id_place}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Order Detail Section - Simplified for mobile */}
      {clickedOrder && (
        <View style={styles.detailContainer}>
          <Text style={styles.detailTitle}>Detalle de Orden</Text>
          <Text style={styles.detailText}>Orden: #{clickedOrder.id_order}</Text>
          <Text style={styles.detailText}>Cliente: {clickedOrder.name}</Text>
          <Text style={styles.detailText}>Estado: {clickedOrder.status}</Text>
          <Text style={styles.detailText}>
            Fecha: {formatDate(clickedOrder.creation_date || clickedOrder.date)}
          </Text>
        </View>
      )}
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
  listContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  orderCardSelected: {
    borderColor: '#2196F3',
    borderWidth: 2,
    backgroundColor: '#e3f2fd',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  orderStatus: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  orderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  orderPlace: {
    fontSize: 12,
    color: '#999',
  },
  detailContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
});

export default HistoricScreen;





