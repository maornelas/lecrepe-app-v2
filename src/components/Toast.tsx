import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  visible,
  onClose,
  duration = 2000,
}) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Resetear valores de animación
      translateY.setValue(-100);
      opacity.setValue(0);
      
      // Animar entrada
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-cerrar después de la duración
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#4CAF50',
          icon: '✓',
        };
      case 'error':
        return {
          backgroundColor: '#F44336',
          icon: '✕',
        };
      case 'warning':
        return {
          backgroundColor: '#FF9800',
          icon: '⚠',
        };
      default:
        return {
          backgroundColor: '#2196F3',
          icon: 'ℹ',
        };
    }
  };

  const typeStyles = getTypeStyles();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.toast, { backgroundColor: typeStyles.backgroundColor }]}>
        <Text style={styles.icon}>{typeStyles.icon}</Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    fontSize: 18,
    color: '#fff',
    marginRight: 10,
    fontWeight: 'bold',
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  closeButton: {
    marginLeft: 10,
    padding: 4,
  },
  closeIcon: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default Toast;

