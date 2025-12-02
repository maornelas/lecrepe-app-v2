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
  Image,
} from 'react-native';
import { ProductService, Product } from '../services/productService';
import { backend } from '../config/constants';
import { StorageService } from '../services/storageService';

interface MenuScreenProps {
  navigation?: any;
}

const MenuScreen: React.FC<MenuScreenProps> = ({ navigation }) => {
  const [value, setValue] = useState(backend.product.crepe);
  const [valueFlavor, setValueFlavor] = useState(backend.product.sweet);
  const [valueTempe, setValueTempe] = useState(backend.product.hot);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await ProductService.getAllProducts();
      if (response.data) {
        setProducts(response.data);
      }
    } catch (error: any) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'No se pudieron cargar los productos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getFilteredProducts = (): Product[] => {
    if (value === backend.product.crepe && valueFlavor === backend.product.sweet) {
      return products.filter(
        (p) => p.type === backend.product.crepe && p.label === backend.product.sweet
      );
    }
    if (value === backend.product.crepe && valueFlavor === backend.product.salty) {
      return products.filter(
        (p) => p.type === backend.product.crepe && p.label === backend.product.salty
      );
    }
    if (value === backend.product.drink && valueTempe === backend.product.hot) {
      return products.filter(
        (p) => p.type === backend.product.drink && p.label === backend.product.hot
      );
    }
    if (value === backend.product.drink && valueTempe === backend.product.cold) {
      return products.filter(
        (p) => p.type === backend.product.drink && p.label === backend.product.cold
      );
    }
    if (value === backend.product.icecream) {
      return products.filter((p) => p.type === backend.product.icecream);
    }
    return [];
  };

  const handleProductPress = (product: Product) => {
    // TODO: Navigate to product detail or add to order
    Alert.alert('Producto', `${product.name}\n$${product.prices?.[0]?.price || 'N/A'}`);
  };

  const filteredProducts = getFilteredProducts();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Cargando menú...</Text>
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
        <Text style={styles.title}>Menú</Text>
      </View>

      {/* Main Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, value === backend.product.crepe && styles.tabActive]}
          onPress={() => setValue(backend.product.crepe)}
        >
          <Text
            style={[
              styles.tabText,
              value === backend.product.crepe && styles.tabTextActive,
            ]}
          >
            CREPAS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, value === backend.product.drink && styles.tabActive]}
          onPress={() => setValue(backend.product.drink)}
        >
          <Text
            style={[
              styles.tabText,
              value === backend.product.drink && styles.tabTextActive,
            ]}
          >
            BEBIDAS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, value === backend.product.icecream && styles.tabActive]}
          onPress={() => setValue(backend.product.icecream)}
        >
          <Text
            style={[
              styles.tabText,
              value === backend.product.icecream && styles.tabTextActive,
            ]}
          >
            HELADOS
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub Tabs for Crepes */}
      {value === backend.product.crepe && (
        <View style={styles.subTabsContainer}>
          <TouchableOpacity
            style={[
              styles.subTab,
              valueFlavor === backend.product.sweet && styles.subTabActive,
            ]}
            onPress={() => setValueFlavor(backend.product.sweet)}
          >
            <Text
              style={[
                styles.subTabText,
                valueFlavor === backend.product.sweet && styles.subTabTextActive,
              ]}
            >
              Dulces
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.subTab,
              valueFlavor === backend.product.salty && styles.subTabActive,
            ]}
            onPress={() => setValueFlavor(backend.product.salty)}
          >
            <Text
              style={[
                styles.subTabText,
                valueFlavor === backend.product.salty && styles.subTabTextActive,
              ]}
            >
              Saladas
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Sub Tabs for Drinks */}
      {value === backend.product.drink && (
        <View style={styles.subTabsContainer}>
          <TouchableOpacity
            style={[
              styles.subTab,
              valueTempe === backend.product.hot && styles.subTabActive,
            ]}
            onPress={() => setValueTempe(backend.product.hot)}
          >
            <Text
              style={[
                styles.subTabText,
                valueTempe === backend.product.hot && styles.subTabTextActive,
              ]}
            >
              Caliente
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.subTab,
              valueTempe === backend.product.cold && styles.subTabActive,
            ]}
            onPress={() => setValueTempe(backend.product.cold)}
          >
            <Text
              style={[
                styles.subTabText,
                valueTempe === backend.product.cold && styles.subTabTextActive,
              ]}
            >
              Fría
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Products List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.productsContainer}>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay productos disponibles</Text>
            </View>
          ) : (
            filteredProducts.map((product) => (
              <TouchableOpacity
                key={product._id || product.id}
                style={styles.productCard}
                onPress={() => handleProductPress(product)}
              >
                {product.url_photo || product.url ? (
                  <Image
                    source={{ uri: product.url_photo || product.url }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <Text style={styles.productImagePlaceholderText}>
                      {product.name.charAt(0)}
                    </Text>
                  </View>
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.type === backend.product.crepe && product.toppings && (
                    <Text style={styles.productToppings} numberOfLines={2}>
                      {product.toppings.map((t) => t.name).join(', ')}
                    </Text>
                  )}
                  <View style={styles.productPriceContainer}>
                    {product.prices?.map((price, index) => (
                      <Text key={index} style={styles.productPrice}>
                        ${price.price}
                        {price.size && ` (${price.size})`}
                      </Text>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
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
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  subTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomColor: '#FF9800',
  },
  subTabText: {
    fontSize: 13,
    color: '#666',
  },
  subTabTextActive: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  productsContainer: {
    padding: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productImagePlaceholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#999',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productToppings: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  productPriceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginRight: 8,
  },
});

export default MenuScreen;





