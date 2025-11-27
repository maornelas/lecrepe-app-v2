import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Place } from '../types';

interface CardTableProps {
  item: Place;
  onPress?: () => void;
}

const CardTable: React.FC<CardTableProps> = ({ item, onPress }) => {
  if (!item) return null;

  const isBusy = !item.available;
  const orderItemsCount = item.order?.items?.length || item.order?.products?.length || 0;

  // Icon mapping (simplified - you can add icons later)
  const getIconName = (name: string) => {
    const iconMap: { [key: string]: string } = {
      'ARBOL': '🌳',
      'MONA': '👩',
      'BICI': '🚲',
      'CENTRO': '📍',
      'TELEFONO': '📞',
      'TAZA': '☕',
      'BARDA': '🧱',
    };
    return iconMap[name] || '🍽️';
  };

  return (
    <TouchableOpacity
      style={[styles.card, isBusy && styles.cardBusy]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {orderItemsCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{orderItemsCount}</Text>
        </View>
      )}
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{getIconName(item.name)}</Text>
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={[styles.label, isBusy && styles.labelBusy]}>Nombre:</Text>
          {item.available ? (
            <Text style={styles.availableText}>disponible</Text>
          ) : (
            <Text style={[styles.value, isBusy && styles.valueBusy]}>
              {item.order?.client?.name || item.order?.name || 'Ocupada'}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#4CAF50',
    minHeight: 120,
  },
  cardBusy: {
    borderColor: '#f44336',
    backgroundColor: '#ffebee',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  labelBusy: {
    color: '#d32f2f',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  valueBusy: {
    color: '#d32f2f',
  },
  availableText: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
});

export default CardTable;



