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
import { OrderCreation } from '../components';

interface OrdenesScreenProps {
  navigation?: any;
}

const OrdenesScreen: React.FC<OrdenesScreenProps> = ({ navigation }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [isOrderCreationOpen, setIsOrderCreationOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
        return;
      }

      const response = await OrderLecrepeService.getAllOrdersLecrepe(parseInt(idStore));
      if (response.data) {
        // Filter only "to go" orders
        const togoOrders = response.data.filter((order: Order) => order.togo === true);
        setOrders(togoOrders);
      }
    } catch (error: any) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'No se pudieron cargar las órdenes');
    } finally {
      setLoading(false);
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
      Alert.alert('Éxito', 'Orden cerrada');
      loadOrders();
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cerrar la orden');
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    try {
      await OrderLecrepeService.cancelOrderLecrepe(orderId);
      setDeleteDialogOpen(false);
      Alert.alert('Éxito', 'Orden cancelada');
      loadOrders();
      setActiveTab(3); // Switch to canceled tab
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cancelar la orden');
    }
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setOrderDetailOpen(true);
  };

  const handleNewOrder = () => {
    setIsOrderCreationOpen(true);
  };

  const handleCloseOrderCreation = () => {
    setIsOrderCreationOpen(false);
    loadOrders();
  };

  const handleCloseOrderDetail = () => {
    setOrderDetailOpen(false);
    setSelectedOrder(null);
  };

  const handleSaveOrder = async (updatedOrderData: Partial<Order>) => {
    if (!selectedOrder) return;
    try {
      await OrderLecrepeService.updateOrderLecrepe(selectedOrder.id_order, updatedOrderData);
      Alert.alert('Éxito', 'Orden actualizada exitosamente');
      loadOrders();
      handleCloseOrderDetail();
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo actualizar la orden');
    }
  };

  const handleOrderCreated = async (orderData: Partial<Order>) => {
    // Esta función se llama después de crear una nueva orden
    // Recargar las órdenes para mostrar la nueva
    loadOrders();
  };

  const handleRegresar = () => {
    navigation?.goBack();
  };

  const handleMesas = () => {
    navigation?.navigate('Mesas');
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Pendiente':
        return '#ff9800';
      case 'Lista':
        return '#4caf50';
      case 'Cerrada':
      case 'Entregada':
        return '#9e9e9e';
      case 'Cancelada':
        return '#424242';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'Lista':
      case 'Cerrada':
      case 'Entregada':
        return '✓';
      case 'Cancelada':
        return '✕';
      default:
        return '📋';
    }
  };

  const getItemsCount = (order: Order): number => {
    const items = order.items || order.products || [];
    return items.reduce((sum, item) => sum + item.units, 0);
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
    return items.reduce((sum, item) => sum + (item.type_price * item.units), 0);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff9800" />
          <Text style={styles.loadingText}>Cargando órdenes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentOrders = getCurrentOrders();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Navigation */}
      <View style={styles.header}>
        {/* Left side - Navigation buttons */}
        <View style={styles.headerLeft}>
          {/* Regresar */}
          <TouchableOpacity
            style={styles.circularButtonContainer}
            onPress={handleRegresar}
          >
            <View style={styles.circularButton}>
              <Text style={styles.circularButtonIcon}>←</Text>
            </View>
            <Text style={styles.circularButtonLabel}>REGRESAR</Text>
          </TouchableOpacity>

          {/* Mesas */}
          <TouchableOpacity
            style={styles.circularButtonContainer}
            onPress={handleMesas}
          >
            <View style={styles.circularButton}>
              <Text style={styles.circularButtonIcon}>🪑</Text>
            </View>
            <Text style={styles.circularButtonLabel}>MESAS</Text>
          </TouchableOpacity>
        </View>

        {/* Center - Title */}
        <Text style={styles.title}>Ordenes para llevar</Text>

        {/* Right side - Add button */}
        <TouchableOpacity
          style={styles.newOrderButton}
          onPress={handleNewOrder}
        >
          <Text style={styles.newOrderButtonText}>+ NUEVA</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs for order status */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 0 && styles.tabActive]}
            onPress={() => setActiveTab(0)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 0 && { color: '#ff9800', fontWeight: 'bold' },
              ]}
            >
              Pend. ({getPendingOrders().length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 1 && styles.tabActive]}
            onPress={() => setActiveTab(1)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 1 && { color: '#4caf50', fontWeight: 'bold' },
              ]}
            >
              Listas ({getReadyOrders().length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 2 && styles.tabActive]}
            onPress={() => setActiveTab(2)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 2 && { color: '#9e9e9e', fontWeight: 'bold' },
              ]}
            >
              Cerradas ({getClosedOrders().length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 3 && styles.tabActive]}
            onPress={() => setActiveTab(3)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 3 && { color: '#424242', fontWeight: 'bold' },
              ]}
            >
              Cancel. ({getCanceledOrders().length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Orders Grid */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.gridContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {currentOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 0
                ? 'No hay órdenes pendientes'
                : activeTab === 1
                ? 'No hay órdenes listas'
                : activeTab === 2
                ? 'No hay órdenes cerradas'
                : 'No hay órdenes canceladas'}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {currentOrders.map((order) => (
              <TouchableOpacity
                key={order._id || order.id_order}
                style={styles.orderCard}
                onPress={() => handleOrderClick(order)}
                activeOpacity={0.7}
              >
                {/* Header with status */}
                <View
                  style={[
                    styles.orderCardHeader,
                    { backgroundColor: getStatusColor(order.status) },
                  ]}
                >
                  <View style={styles.orderHeaderLeft}>
                    <Text style={styles.statusIcon}>
                      {getStatusIcon(order.status)}
                    </Text>
                    <Text style={styles.orderNumber}>
                      #{order.id_order}
                    </Text>
                  </View>
                  <View style={styles.statusChip}>
                    <Text style={styles.statusChipText}>{order.status}</Text>
                  </View>
                </View>

                {/* Order details */}
                <View style={styles.orderCardContent}>
                  <View style={styles.orderInfoRow}>
                    <Text style={styles.clientName} numberOfLines={1}>
                      {order.client?.name || 'Cliente General'}
                    </Text>
                    <Text style={styles.itemsCount}>
                      {getItemsCount(order)} items
                    </Text>
                  </View>
                  <Text style={styles.orderTotal}>
                    ${getTotalAmount(order).toFixed(2)}
                  </Text>
                  {order.comments && (
                    <Text style={styles.orderComments} numberOfLines={1}>
                      {order.comments}
                    </Text>
                  )}
                </View>

                {/* Action buttons */}
                <View style={styles.orderActions}>
                  {order.status === 'Pendiente' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonPrimary]}
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
                      style={[styles.actionButton, styles.actionButtonSuccess]}
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
                          setSelectedOrder(order);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Text style={styles.actionButtonCancelText}>
                          CANCELAR
                        </Text>
                      </TouchableOpacity>
                    )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Cancel Confirmation Dialog */}
      <Modal
        visible={deleteDialogOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteDialogOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>Confirmar Cancelación</Text>
            <Text style={styles.dialogContent}>
              ¿Estás seguro de que quieres cancelar la orden #
              {selectedOrder?.id_order}?
            </Text>
            <Text style={styles.dialogSubContent}>
              La orden se moverá al tab de "Canceladas" y no podrá ser
              modificada.
            </Text>
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                onPress={() => setDeleteDialogOpen(false)}
              >
                <Text style={styles.dialogButtonCancelText}>No, Mantener</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogButton, styles.dialogButtonConfirm]}
                onPress={() => handleCancelOrder(selectedOrder?.id_order || 0)}
              >
                <Text style={styles.dialogButtonConfirmText}>
                  Sí, Cancelar Orden
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Order Creation Modal - Nueva Orden */}
      <OrderCreation
        isOpen={isOrderCreationOpen}
        onClose={handleCloseOrderCreation}
        tableInfo={{
          mesa: 'PARA LLEVAR',
          nombre: 'Cliente General',
          orden: Math.floor(Math.random() * 1000) + 100,
        }}
        isTakeout={true}
        onSave={handleOrderCreated}
      />

      {/* Order Detail Modal using OrderCreation component */}
      <OrderCreation
        isOpen={orderDetailOpen}
        onClose={handleCloseOrderDetail}
        tableInfo={{
          mesa: selectedOrder?.id_place || 'PARA LLEVAR',
          nombre: selectedOrder?.client?.name || 'Cliente General',
          orden: selectedOrder?.id_order || 0,
        }}
        isTakeout={selectedOrder?.togo || true}
        editingOrder={selectedOrder}
        isEditMode={true}
        onSave={handleSaveOrder}
        readOnly={
          selectedOrder?.status === 'Cancelada' ||
          selectedOrder?.status === 'Cerrada' ||
          selectedOrder?.status === 'Entregada'
        }
      />
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
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 16,
  },
  circularButtonContainer: {
    alignItems: 'center',
  },
  circularButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  circularButtonIcon: {
    fontSize: 20,
    color: '#333',
  },
  circularButtonLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  newOrderButton: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  newOrderButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabsContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#ff9800',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  gridContainer: {
    padding: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
    textAlign: 'center',
  },
  orderCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
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
    gap: 4,
  },
  statusIcon: {
    fontSize: 16,
    color: '#fff',
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
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
  clientName: {
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
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  orderComments: {
    fontSize: 10,
    color: '#666',
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
  actionButtonPrimary: {
    backgroundColor: '#2196F3',
  },
  actionButtonSuccess: {
    backgroundColor: '#4caf50',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  dialogContent: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  dialogSubContent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  dialogButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  dialogButtonCancel: {
    backgroundColor: 'transparent',
  },
  dialogButtonConfirm: {
    backgroundColor: '#f44336',
  },
  dialogButtonCancelText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  dialogButtonConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    marginTop: 'auto',
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
  closeButtonModal: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonTextModal: {
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

export default OrdenesScreen;
