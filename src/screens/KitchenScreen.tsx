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
import { OrderLecrepeService } from '../services/orderLecrepeService';
import { StorageService } from '../services/storageService';
import { Order } from '../types';

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
                Orden #{selectedOrder?.id_order}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setOrderDetailOpen(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedOrder && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.detailLabel}>Cliente:</Text>
                <Text style={styles.detailValue}>
                  {selectedOrder.client?.name || selectedOrder.name || 'N/A'}
                </Text>
                <Text style={styles.detailLabel}>Estado:</Text>
                <Text style={styles.detailValue}>{selectedOrder.status}</Text>
                <Text style={styles.detailLabel}>Productos:</Text>
                {selectedOrder.items?.map((item, index) => (
                  <View key={index} style={styles.productItem}>
                    <Text style={styles.productName}>
                      {item.product_name} - {item.type_name}
                    </Text>
                    <Text style={styles.productDetails}>
                      Cantidad: {item.units} | Precio: ${item.type_price.toFixed(2)}
                    </Text>
                    {item.toppings && item.toppings.length > 0 && (
                      <Text style={styles.toppingsText}>
                        Toppings: {item.toppings.map((t: any) => t.name).join(', ')}
                      </Text>
                    )}
                    {item.extras && item.extras.length > 0 && (
                      <Text style={styles.extrasText}>
                        Extras: {item.extras.map((e: any) => e.name).join(', ')}
                      </Text>
                    )}
                  </View>
                ))}
                {selectedOrder.products?.map((product, index) => (
                  <View key={index} style={styles.productItem}>
                    <Text style={styles.productName}>
                      {product.product_name} - {product.type_name}
                    </Text>
                    <Text style={styles.productDetails}>
                      Cantidad: {product.units} | Precio: ${product.type_price.toFixed(2)}
                    </Text>
                  </View>
                ))}
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
});

export default KitchenScreen;



