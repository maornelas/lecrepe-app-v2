import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import CardTable from './CardTable';
import { Store, Order, Place } from '../types';

interface OrderTableV2Props {
  data: Store;
  selectedOrder: (order: Order | null) => void;
  loadData: () => void;
  notification: (message: string) => void;
  onOrderPress?: (order: Order, place: Place) => void;
}

const OrderTableV2: React.FC<OrderTableV2Props> = ({
  data,
  selectedOrder,
  loadData,
  notification,
  onOrderPress,
}) => {
  const [clickedOrder, setClickedOrder] = useState<Order | null>(null);
  const [clickedPlace, setClickedPlace] = useState<Place | null>(null);

  const handleCardClick = (place: Place) => {
    if (place.order) {
      setClickedOrder(place.order);
      selectedOrder(place.order);
      setClickedPlace(place);
      if (onOrderPress) {
        onOrderPress(place.order, place);
      }
    } else {
      // Table is available, could open new order modal
      notification('Mesa disponible');
    }
  };

  if (!data || !data.places) {
    return null;
  }

  // Render places in a grid layout (3 columns)
  const renderPlaces = () => {
    const places = data.places || [];
    const rows: Place[][] = [];
    
    // Group places into rows of 3
    for (let i = 0; i < places.length; i += 3) {
      rows.push(places.slice(i, i + 3));
    }

    return rows.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.row}>
        {row.map((place, colIndex) => (
          <View key={place.id_place || colIndex} style={styles.column}>
            <CardTable
              item={place}
              onPress={() => handleCardClick(place)}
            />
          </View>
        ))}
        {/* Fill empty spaces in the last row */}
        {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => (
          <View key={`empty-${i}`} style={styles.column} />
        ))}
      </View>
    ));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {renderPlaces()}
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  column: {
    flex: 1,
    maxWidth: '33%',
  },
});

export default OrderTableV2;



