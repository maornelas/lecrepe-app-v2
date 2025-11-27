import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import CardIndividual from './CardIndividual';
import { Order } from '../types';

interface OrderToGoProps {
  data: Order[];
  selectedOrder: (order: Order | null) => void;
  loadData: () => void;
  notification: (message: string) => void;
  onOrderPress?: (order: Order) => void;
}

const OrderToGo: React.FC<OrderToGoProps> = ({
  data,
  selectedOrder,
  loadData,
  notification,
  onOrderPress,
}) => {
  const [clickedOrder, setClickedOrder] = useState<Order | null>(data?.[0] || null);

  const handleCardClick = (order: Order) => {
    setClickedOrder(order);
    selectedOrder(order);
    if (onOrderPress) {
      onOrderPress(order);
    }
  };

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
          </View>
          <Text style={styles.emptyText}>No hay órdenes para llevar</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.grid}>
        {data.map((order) => (
          <View key={order._id || order.id_order} style={styles.cardWrapper}>
            <CardIndividual
              item={order}
              onPress={() => handleCardClick(order)}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardWrapper: {
    width: '48%',
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default OrderToGo;

