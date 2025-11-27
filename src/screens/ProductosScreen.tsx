import React, { useState, useEffect, useMemo } from 'react';
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
  TextInput,
  Dimensions,
} from 'react-native';
import { ProductService, Product } from '../services/productService';
import { API_ENDPOINTS } from '../config/api';

interface ProductosScreenProps {
  navigation?: any;
}

interface Category {
  id: string;
  label: string;
}

interface SubCategory {
  id: string;
  label: string;
}

const { width: screenWidth } = Dimensions.get('window');

const ProductosScreen: React.FC<ProductosScreenProps> = ({ navigation }) => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  
  // Modals
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newSubCategoryModalOpen, setNewSubCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubCategoryName, setNewSubCategoryName] = useState('');

  // New Product Form States
  const [productName, setProductName] = useState('');
  const [productIngredients, setProductIngredients] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [extraIngredientsPrice, setExtraIngredientsPrice] = useState('');
  const [takeoutPrice, setTakeoutPrice] = useState('');
  // For beverages
  const [priceChica, setPriceChica] = useState('');
  const [priceGrande, setPriceGrande] = useState('');
  const [priceTogo, setPriceTogo] = useState('');

  // Organize products by category and subcategory
  const { productCategories, subCategories, organizedProducts } = useMemo(() => {
    if (!allProducts || allProducts.length === 0) {
      return { productCategories: [], subCategories: {}, organizedProducts: {} };
    }

    // Filter out placeholder products
    const filteredProducts = allProducts.filter(
      (product) =>
        product.name &&
        !product.name.startsWith('__CATEGORY_PLACEHOLDER__') &&
        !product.name.startsWith('__SUBCATEGORY_PLACEHOLDER__')
    );

    // Generate unique categories
    const uniqueTypes = [...new Set(allProducts.map((p) => p.type).filter((type) => type))];
    const categoryOrder = ['crepa', 'crepas', 'bebida', 'bebidas', 'helado', 'helados'];
    const sortedTypes = uniqueTypes.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.toLowerCase());
      const bIndex = categoryOrder.indexOf(b.toLowerCase());
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    const categories: Category[] = sortedTypes.map((type) => ({
      id: type,
      label: type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Sin categoría',
    }));

    // Organize products by category and subcategory
    const organized: { [key: string]: { [key: string]: Product[] } } = {};
    const subCats: { [key: string]: SubCategory[] } = {};

    // First, generate all subcategories
    allProducts.forEach((product) => {
      const categoryKey = product.type;
      const subCategoryKey = product.label;

      if (!subCats[categoryKey]) {
        subCats[categoryKey] = [];
      }

      const subCategoryExists = subCats[categoryKey].some((sub) => sub.id === subCategoryKey);

      if (!subCategoryExists && subCategoryKey && subCategoryKey !== '__PLACEHOLDER__') {
        subCats[categoryKey].push({
          id: subCategoryKey,
          label: subCategoryKey ? subCategoryKey.charAt(0).toUpperCase() + subCategoryKey.slice(1) : 'Sin categoría',
        });
      }
    });

    // Then, organize real products
    filteredProducts.forEach((product) => {
      const categoryKey = product.type;
      const subCategoryKey = product.label;

      if (!organized[categoryKey]) {
        organized[categoryKey] = {};
      }

      if (!organized[categoryKey][subCategoryKey]) {
        organized[categoryKey][subCategoryKey] = [];
      }

      organized[categoryKey][subCategoryKey].push(product);
    });

    return {
      productCategories: categories,
      subCategories: subCats,
      organizedProducts: organized,
    };
  }, [allProducts]);

  // Set initial subcategory when categories load
  useEffect(() => {
    if (productCategories.length > 0 && Object.keys(subCategories).length > 0) {
      const currentCategory = productCategories[selectedTab]?.id;
      if (currentCategory) {
        const categorySubCategories = subCategories[currentCategory] || [];
        if (categorySubCategories.length > 0 && !selectedSubCategory) {
          setSelectedSubCategory(categorySubCategories[0].id);
        }
      }
    }
  }, [productCategories, subCategories, selectedTab, selectedSubCategory]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await ProductService.getAllProducts();
      if (response.data) {
        setAllProducts(response.data);
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
    loadProducts();
  };

  const getCurrentProducts = (): Product[] => {
    const categoryKey = productCategories[selectedTab]?.id;
    if (!categoryKey) return [];

    const categorySubCategories = subCategories[categoryKey] || [];
    if (categorySubCategories.length === 0) {
      // Category without subcategories
      return organizedProducts[categoryKey] ? Object.values(organizedProducts[categoryKey]).flat() : [];
    } else {
      // Category with subcategories
      return organizedProducts[categoryKey]?.[selectedSubCategory] || [];
    }
  };

  const handleTabChange = (index: number) => {
    setSelectedTab(index);
    const categoryKey = productCategories[index]?.id;
    if (categoryKey) {
      const categorySubCategories = subCategories[categoryKey] || [];
      if (categorySubCategories.length > 0) {
        setSelectedSubCategory(categorySubCategories[0].id);
      } else {
        setSelectedSubCategory('');
      }
    }
  };

  const handleProductPress = (product: Product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert('Eliminar Producto', '¿Estás seguro de que deseas eliminar este producto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await ProductService.deleteProduct(productId);
            Alert.alert('Éxito', 'Producto eliminado');
            loadProducts();
            setModalOpen(false);
          } catch (error: any) {
            Alert.alert('Error', 'No se pudo eliminar el producto');
          }
        },
      },
    ]);
  };

  const handleNewProduct = () => {
    setSelectedProduct(null);
    // Reset form fields
    setProductName('');
    setProductIngredients('');
    setProductPrice('');
    setExtraIngredientsPrice('');
    setTakeoutPrice('');
    setPriceChica('');
    setPriceGrande('');
    setPriceTogo('');
    setModalOpen(true);
  };

  const handleCancelNewProduct = () => {
    setModalOpen(false);
    setSelectedProduct(null);
    // Reset form fields
    setProductName('');
    setProductIngredients('');
    setProductPrice('');
    setExtraIngredientsPrice('');
    setTakeoutPrice('');
    setPriceChica('');
    setPriceGrande('');
    setPriceTogo('');
  };

  const isBebida = (): boolean => {
    const categoryKey = productCategories[selectedTab]?.id;
    return categoryKey === 'bebida' || categoryKey === 'bebidas';
  };

  const isCrepa = (): boolean => {
    const categoryKey = productCategories[selectedTab]?.id;
    return categoryKey === 'crepa' || categoryKey === 'crepas';
  };

  const formatStringToIngredients = (ingredientsData: string | any[]): Array<{ name: string; available: boolean }> => {
    if (Array.isArray(ingredientsData)) {
      return ingredientsData;
    }
    if (typeof ingredientsData === 'string') {
      if (!ingredientsData.trim()) return [];
      return ingredientsData.split(',').map(ingredient => ({
        name: ingredient.trim(),
        available: true
      })).filter(ingredient => ingredient.name);
    }
    return [];
  };

  const handleSaveNewProduct = async () => {
    try {
      const categoryKey = productCategories[selectedTab]?.id;
      const subCategoryKey = selectedSubCategory;

      if (!categoryKey) {
        Alert.alert('Error', 'No se pudo determinar la categoría');
        return;
      }

      // Validations
      if (!productName.trim()) {
        Alert.alert('Error', 'Por favor ingresa el nombre del producto');
        return;
      }

      const isBebidaProduct = isBebida();
      
      if (isBebidaProduct) {
        // Validate beverage prices
        const chicaValue = parseFloat(priceChica);
        const grandeValue = parseFloat(priceGrande);
        const togoValue = parseFloat(priceTogo);

        if (!priceChica || isNaN(chicaValue) || chicaValue <= 0) {
          Alert.alert('Error', 'Por favor ingresa un precio válido para tamaño chica');
          return;
        }

        if (!priceGrande || isNaN(grandeValue) || grandeValue <= 0) {
          Alert.alert('Error', 'Por favor ingresa un precio válido para tamaño grande');
          return;
        }

        if (!priceTogo || isNaN(togoValue) || togoValue <= 0) {
          Alert.alert('Error', 'Por favor ingresa un precio válido para llevar');
          return;
        }

        // Prepare beverage product data
        const newProductData = {
          name: productName.trim(),
          description: productIngredients.trim() || '',
          price: chicaValue, // Base price
          prices: [
            { size: 'chica', price: chicaValue },
            { size: 'grande', price: grandeValue },
            { size: 'togo', price: togoValue }
          ],
          url: '',
          type: categoryKey,
          label: subCategoryKey || 'general',
          ingredients: formatStringToIngredients(productIngredients),
          fee_togo: 0,
        };

        const result = await ProductService.createProduct(newProductData);

        if (result.success) {
          Alert.alert('Éxito', `Producto "${productName.trim()}" creado correctamente`);
          loadProducts();
          handleCancelNewProduct();
        } else {
          Alert.alert('Error', 'Error al crear el producto');
        }
      } else {
        // Validate crepa/other product price
        const priceValue = parseFloat(productPrice);
        if (!productPrice || isNaN(priceValue) || priceValue <= 0) {
          Alert.alert('Error', 'Por favor ingresa un precio válido mayor a 0');
          return;
        }

        // Prepare crepa/other product data
        const newProductData: any = {
          name: productName.trim(),
          description: productIngredients.trim() || '',
          price: priceValue,
          prices: [{ size: 'unico', price: priceValue }],
          url: '',
          type: categoryKey,
          label: subCategoryKey || 'general',
          ingredients: formatStringToIngredients(productIngredients),
          fee_togo: takeoutPrice ? parseFloat(takeoutPrice) || 0 : 0,
        };

        // Add extraIngredientsPrice only for crepas
        if (isCrepa() && extraIngredientsPrice) {
          const extraPriceValue = parseFloat(extraIngredientsPrice);
          if (!isNaN(extraPriceValue)) {
            newProductData.extraIngredientsPrice = extraPriceValue;
          }
        }

        const result = await ProductService.createProduct(newProductData);

        if (result.success) {
          Alert.alert('Éxito', `Producto "${productName.trim()}" creado correctamente`);
          loadProducts();
          handleCancelNewProduct();
        } else {
          Alert.alert('Error', 'Error al crear el producto');
        }
      }
    } catch (error: any) {
      console.error('Error creating product:', error);
      Alert.alert('Error', 'Error al crear el producto: ' + (error.message || 'Error desconocido'));
    }
  };

  // Helper function to format price input (only numbers and one decimal point)
  const formatPriceInput = (value: string): string => {
    // Allow only numbers and one decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    return cleaned;
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    const newCategoryId = newCategoryName.toLowerCase().replace(/\s+/g, '_');

    // Check if category already exists
    if (productCategories.some((cat) => cat.id === newCategoryId)) {
      Alert.alert('Error', 'Esta categoría ya existe');
      return;
    }

    try {
      const result = await ProductService.createCategory({
        name: newCategoryName.trim(),
        type: newCategoryId,
      });

      if (result.success) {
        setNewCategoryName('');
        setNewCategoryModalOpen(false);
        Alert.alert('Éxito', `Categoría "${newCategoryName.trim()}" creada correctamente`);
        loadProducts();
      } else {
        Alert.alert('Error', 'Error al crear la categoría');
      }
    } catch (error: any) {
      console.error('Error creating category:', error);
      Alert.alert('Error', 'Error al crear la categoría');
    }
  };

  const handleCreateSubCategory = async () => {
    if (!newSubCategoryName.trim()) return;

    const categoryKey = productCategories[selectedTab]?.id;
    if (!categoryKey) {
      Alert.alert('Error', 'No se pudo determinar la categoría');
      return;
    }

    const newSubCategoryId = newSubCategoryName.toLowerCase().replace(/\s+/g, '_');

    // Check if subcategory already exists
    const existingSubCategories = subCategories[categoryKey] || [];
    if (existingSubCategories.some((sub) => sub.id === newSubCategoryId)) {
      Alert.alert('Error', 'Esta subcategoría ya existe');
      return;
    }

    try {
      const result = await ProductService.createSubCategory(categoryKey, {
        name: newSubCategoryName.trim(),
        label: newSubCategoryId,
      });

      if (result.success) {
        setNewSubCategoryName('');
        setNewSubCategoryModalOpen(false);
        Alert.alert('Éxito', `Subcategoría "${newSubCategoryName.trim()}" creada correctamente`);
        loadProducts();
      } else {
        Alert.alert('Error', 'Error al crear la subcategoría');
      }
    } catch (error: any) {
      console.error('Error creating subcategory:', error);
      Alert.alert('Error', 'Error al crear la subcategoría');
    }
  };

  const getDefaultImageForProduct = (product: Product): string => {
    const categoryKey = product.type;
    const subCategoryKey = product.label;

    if (categoryKey === 'bebida' || categoryKey === 'bebidas') {
      const bebidaIcons: { [key: string]: string } = {
        caliente: '☕',
        calientes: '☕',
        fria: '🧊',
        frias: '🧊',
        latte: '☕',
      };
      return bebidaIcons[subCategoryKey || ''] || '🥤';
    }

    const defaultImages: { [key: string]: string } = {
      crepa: '🥞',
      crepas: '🥞',
      helado: '🍨',
      helados: '🍨',
    };

    return defaultImages[categoryKey] || '🍽️';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9800" />
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentProducts = getCurrentProducts();
  const currentCategory = productCategories[selectedTab];
  const currentSubCategories = currentCategory ? subCategories[currentCategory.id] || [] : [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
            <Text style={styles.backButtonIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.backButtonText}>REGRESAR</Text>
        </View>
        <TouchableOpacity style={styles.newProductButton} onPress={handleNewProduct}>
          <Text style={styles.newProductButtonText}>CREAR PRODUCTO</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Category Tabs */}
        <View style={styles.categoryTabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabsScroll}>
            {productCategories.map((category, index) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryTab, selectedTab === index && styles.categoryTabActive]}
                onPress={() => handleTabChange(index)}
              >
                <Text style={[styles.categoryTabText, selectedTab === index && styles.categoryTabTextActive]}>
                  {category.label.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.newCategoryButton}
            onPress={() => setNewCategoryModalOpen(true)}
          >
            <Text style={styles.newCategoryButtonText}>+ NUEVA CATEGORÍA</Text>
          </TouchableOpacity>
        </View>

        {/* Subcategory Tabs */}
        {currentSubCategories.length > 0 && (
          <View style={styles.subCategoryTabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subCategoryTabsScroll}>
              {currentSubCategories.map((subCat) => (
                <TouchableOpacity
                  key={subCat.id}
                  style={[
                    styles.subCategoryTab,
                    selectedSubCategory === subCat.id && styles.subCategoryTabActive,
                  ]}
                  onPress={() => setSelectedSubCategory(subCat.id)}
                >
                  <Text
                    style={[
                      styles.subCategoryTabText,
                      selectedSubCategory === subCat.id && styles.subCategoryTabTextActive,
                    ]}
                  >
                    {subCat.label.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.newSubCategoryButton}
              onPress={() => setNewSubCategoryModalOpen(true)}
            >
              <Text style={styles.newSubCategoryButtonText}>+ NUEVA SUBCATEGORÍA</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* View Toggle and Product Count */}
        <View style={styles.viewControls}>
          <Text style={styles.productCount}>Productos ({currentProducts.length})</Text>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
              onPress={() => setViewMode('list')}
            >
              <Text style={[styles.viewToggleIcon, viewMode === 'list' && styles.viewToggleIconActive]}>
                ☰
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'grid' && styles.viewToggleButtonActive]}
              onPress={() => setViewMode('grid')}
            >
              <Text style={[styles.viewToggleIcon, viewMode === 'grid' && styles.viewToggleIconActive]}>
                ⊞
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Products List/Grid */}
        <ScrollView
          style={styles.productsScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {currentProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay productos en esta categoría</Text>
            </View>
          ) : viewMode === 'list' ? (
            // List View
            <View style={styles.productsListContainer}>
              {currentProducts.map((product) => (
                <TouchableOpacity
                  key={product._id || product.id}
                  style={[
                    styles.productCardList,
                    selectedProduct?._id === product._id && styles.productCardListSelected,
                  ]}
                  onPress={() => handleProductPress(product)}
                >
                  <View style={styles.productCardListContent}>
                    <View style={[styles.productIcon, { backgroundColor: '#FF9800' }]}>
                      <Text style={styles.productIconText}>{getDefaultImageForProduct(product)}</Text>
                    </View>
                    <View style={styles.productCardListInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                    </View>
                    <Text style={styles.productPriceList}>
                      ${product.price ? (typeof product.price === 'number' ? product.price.toFixed(2) : product.price) : '0.00'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            // Grid View
            <View style={styles.productsGridContainer}>
              {currentProducts.map((product) => (
                <TouchableOpacity
                  key={product._id || product.id}
                  style={[
                    styles.productCardGrid,
                    selectedProduct?._id === product._id && styles.productCardGridSelected,
                  ]}
                  onPress={() => handleProductPress(product)}
                >
                  <View style={[styles.productIconGrid, { backgroundColor: '#FF9800' }]}>
                    <Text style={styles.productIconTextGrid}>{getDefaultImageForProduct(product)}</Text>
                  </View>
                  <Text style={styles.productNameGrid} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.productPriceGrid}>
                    ${product.price ? (typeof product.price === 'number' ? product.price.toFixed(2) : product.price) : '0.00'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Product Detail Modal - Full Screen */}
      <Modal
        visible={modalOpen}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <SafeAreaView style={styles.modalFullScreen}>
          <View style={styles.modalContentFullScreen}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedProduct
                  ? selectedProduct.name
                  : `Nuevo ${productCategories[selectedTab]?.label || 'Producto'}`}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  if (selectedProduct) {
                    setModalOpen(false);
                  } else {
                    handleCancelNewProduct();
                  }
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            {selectedProduct && (
              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                {/* Product Image Area */}
                <TouchableOpacity style={styles.imageUploadArea} disabled={true}>
                  <View style={styles.imageUploadContent}>
                    <Text style={styles.imageUploadIcon}>🪙</Text>
                    <Text style={styles.imageUploadText}>Carga no disponible</Text>
                  </View>
                </TouchableOpacity>
                <Text style={styles.imageUploadHint}>Click en la imagen para agregar una foto</Text>

                {/* Nombre Field */}
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Nombre</Text>
                  <View style={styles.formInput}>
                    <Text style={styles.formInputText}>{selectedProduct.name}</Text>
                  </View>
                </View>

                {/* Ingredientes Field */}
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Ingredientes</Text>
                  <View style={[styles.formInput, styles.formInputMultiline]}>
                    <Text style={styles.formInputText}>
                      {(() => {
                        if (selectedProduct.toppings && selectedProduct.toppings.length > 0) {
                          return selectedProduct.toppings
                            .map((t: any) => (typeof t === 'string' ? t : t.name || ''))
                            .join(', ');
                        }
                        if (selectedProduct.description) {
                          return selectedProduct.description;
                        }
                        return 'Sin ingredientes';
                      })()}
                    </Text>
                  </View>
                </View>

                {/* Precio Field */}
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Precio</Text>
                  <View style={styles.formInput}>
                    <Text style={styles.formInputPrefix}>$</Text>
                    <Text style={styles.formInputText}>
                      {(() => {
                        if (selectedProduct.prices && selectedProduct.prices.length > 0) {
                          const uniquePrice = selectedProduct.prices.find((p: any) => p.size === 'unico');
                          if (uniquePrice) {
                            return typeof uniquePrice.price === 'number'
                              ? uniquePrice.price.toFixed(2)
                              : uniquePrice.price;
                          }
                          const firstPrice = selectedProduct.prices[0];
                          return typeof firstPrice.price === 'number'
                            ? firstPrice.price.toFixed(2)
                            : firstPrice.price;
                        }
                        if (selectedProduct.price) {
                          return typeof selectedProduct.price === 'number'
                            ? selectedProduct.price.toFixed(2)
                            : selectedProduct.price;
                        }
                        return '0.00';
                      })()}
                    </Text>
                  </View>
                </View>

                {/* Precio por ingredientes adicionales (solo para crepas) */}
                {(selectedProduct.type === 'crepa' || selectedProduct.type === 'crepas') && (
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>Precio por ingredientes adicionales</Text>
                    <View style={styles.formInput}>
                      <Text style={styles.formInputPrefix}>$</Text>
                      <Text style={styles.formInputText}>
                        {selectedProduct.extraIngredientsPrice
                          ? typeof selectedProduct.extraIngredientsPrice === 'number'
                            ? selectedProduct.extraIngredientsPrice.toFixed(2)
                            : selectedProduct.extraIngredientsPrice
                          : '0.00'}
                      </Text>
                    </View>
                    <Text style={styles.formHint}>
                      Precio adicional más de una o dos ingredientes adicionales
                    </Text>
                  </View>
                )}

                {/* Precio para llevar */}
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Precio para llevar</Text>
                  <View style={styles.formInput}>
                    <Text style={styles.formInputPrefix}>$</Text>
                    <Text style={styles.formInputText}>
                      {selectedProduct.fee_togo
                        ? typeof selectedProduct.fee_togo === 'number'
                          ? selectedProduct.fee_togo.toFixed(2)
                          : selectedProduct.fee_togo
                        : '0.00'}
                    </Text>
                  </View>
                  <Text style={styles.formHint}>Precio adicional cuando el pedido es para llevar</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.saveButton, { marginRight: 6 }]}
                    onPress={() => {
                      Alert.alert('Info', 'Funcionalidad de guardar por implementar');
                    }}
                  >
                    <Text style={styles.saveButtonText}>GUARDAR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButtonOutlined, { marginLeft: 6 }]}
                    onPress={() => selectedProduct?._id && handleDeleteProduct(selectedProduct._id)}
                  >
                    <Text style={styles.deleteButtonOutlinedText}>ELIMINAR</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
            {!selectedProduct && (
              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                {/* Product Image Area */}
                <TouchableOpacity style={styles.imageUploadArea} disabled={true}>
                  <View style={styles.imageUploadContent}>
                    <Text style={styles.imageUploadIcon}>🪙</Text>
                    <Text style={styles.imageUploadText}>Carga no disponible</Text>
                  </View>
                </TouchableOpacity>
                <Text style={styles.imageUploadHint}>Click en la imagen para agregar una foto</Text>

                {/* Nombre Field */}
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Nombre</Text>
                  <TextInput
                    style={styles.textInputEditable}
                    value={productName}
                    onChangeText={setProductName}
                    placeholder="Ingresa el nombre del producto"
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Ingredientes Field */}
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Ingredientes</Text>
                  <TextInput
                    style={[styles.textInputEditable, styles.textInputMultiline]}
                    value={productIngredients}
                    onChangeText={setProductIngredients}
                    placeholder="Describe los ingredientes del producto"
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Price Fields - Different for beverages vs crepas */}
                {isBebida() ? (
                  <>
                    {/* Precio Chica */}
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Precio Chica</Text>
                      <View style={styles.formInput}>
                        <Text style={styles.formInputPrefix}>$</Text>
                        <TextInput
                          style={styles.textInputPrice}
                          value={priceChica}
                          onChangeText={(text) => setPriceChica(formatPriceInput(text))}
                          placeholder="0.00"
                          placeholderTextColor="#999"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    {/* Precio Grande */}
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Precio Grande</Text>
                      <View style={styles.formInput}>
                        <Text style={styles.formInputPrefix}>$</Text>
                        <TextInput
                          style={styles.textInputPrice}
                          value={priceGrande}
                          onChangeText={(text) => setPriceGrande(formatPriceInput(text))}
                          placeholder="0.00"
                          placeholderTextColor="#999"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    {/* Precio para llevar (bebidas) */}
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Precio para llevar</Text>
                      <View style={styles.formInput}>
                        <Text style={styles.formInputPrefix}>$</Text>
                        <TextInput
                          style={styles.textInputPrice}
                          value={priceTogo}
                          onChangeText={(text) => setPriceTogo(formatPriceInput(text))}
                          placeholder="0.00"
                          placeholderTextColor="#999"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    {/* Precio (for crepas and other products) */}
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Precio</Text>
                      <View style={styles.formInput}>
                        <Text style={styles.formInputPrefix}>$</Text>
                        <TextInput
                          style={styles.textInputPrice}
                          value={productPrice}
                          onChangeText={(text) => setProductPrice(formatPriceInput(text))}
                          placeholder="0.00"
                          placeholderTextColor="#999"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    {/* Precio por ingredientes adicionales (solo para crepas) */}
                    {isCrepa() && (
                      <View style={styles.formField}>
                        <Text style={styles.formLabel}>Precio por ingredientes adicionales</Text>
                        <View style={styles.formInput}>
                          <Text style={styles.formInputPrefix}>$</Text>
                          <TextInput
                            style={styles.textInputPrice}
                            value={extraIngredientsPrice}
                            onChangeText={(text) => setExtraIngredientsPrice(formatPriceInput(text))}
                            placeholder="0.00"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                          />
                        </View>
                        <Text style={styles.formHint}>
                          Precio adicional más de una o dos ingredientes adicionales
                        </Text>
                      </View>
                    )}

                    {/* Precio para llevar */}
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Precio para llevar</Text>
                      <View style={styles.formInput}>
                        <Text style={styles.formInputPrefix}>$</Text>
                        <TextInput
                          style={styles.textInputPrice}
                          value={takeoutPrice}
                          onChangeText={(text) => setTakeoutPrice(formatPriceInput(text))}
                          placeholder="0.00"
                          placeholderTextColor="#999"
                          keyboardType="numeric"
                        />
                      </View>
                      <Text style={styles.formHint}>
                        Precio adicional cuando el pedido es para llevar
                      </Text>
                    </View>
                  </>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.saveButton, { marginRight: 6 }]}
                    onPress={handleSaveNewProduct}
                  >
                    <Text style={styles.saveButtonText}>CREAR PRODUCTO</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButtonOutlined, { marginLeft: 6 }]}
                    onPress={handleCancelNewProduct}
                  >
                    <Text style={styles.deleteButtonOutlinedText}>CANCELAR</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* New Category Modal */}
      <Modal
        visible={newCategoryModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNewCategoryModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Categoría</Text>
              <TouchableOpacity onPress={() => setNewCategoryModalOpen(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.formLabel}>Nombre de la categoría</Text>
              <TextInput
                style={styles.textInput}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="Ej: Postres, Ensaladas, Desayunos, etc."
                placeholderTextColor="#999"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setNewCategoryName('');
                    setNewCategoryModalOpen(false);
                  }}
                >
                  <Text style={styles.modalButtonCancelText}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                >
                  <Text style={styles.modalButtonConfirmText}>CREAR CATEGORÍA</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Subcategory Modal */}
      <Modal
        visible={newSubCategoryModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNewSubCategoryModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Nueva Subcategoría para {currentCategory?.label || 'Productos'}
              </Text>
              <TouchableOpacity onPress={() => setNewSubCategoryModalOpen(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.formLabel}>Nombre de la subcategoría</Text>
              <TextInput
                style={styles.textInput}
                value={newSubCategoryName}
                onChangeText={setNewSubCategoryName}
                placeholder="Ej: Enchilosas, Especiales, etc."
                placeholderTextColor="#999"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setNewSubCategoryName('');
                    setNewSubCategoryModalOpen(false);
                  }}
                >
                  <Text style={styles.modalButtonCancelText}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={handleCreateSubCategory}
                  disabled={!newSubCategoryName.trim()}
                >
                  <Text style={styles.modalButtonConfirmText}>CREAR SUBCATEGORÍA</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonIcon: {
    fontSize: 18,
    color: '#fff',
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginRight: 80,
  },
  newProductButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  newProductButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  categoryTabsContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryTabsScroll: {
    flex: 1,
  },
  categoryTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  categoryTabActive: {
    borderBottomColor: '#FF9800',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
  },
  categoryTabTextActive: {
    color: '#333',
  },
  newCategoryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 4,
    marginLeft: 8,
  },
  newCategoryButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  subCategoryTabsContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  subCategoryTabsScroll: {
    flex: 1,
  },
  subCategoryTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: 'transparent',
  },
  subCategoryTabActive: {
    borderBottomColor: '#FF9800',
  },
  subCategoryTabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#999',
  },
  subCategoryTabTextActive: {
    color: '#333',
  },
  newSubCategoryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 4,
    marginLeft: 8,
  },
  newSubCategoryButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  viewControls: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  productCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  viewToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 4,
  },
  viewToggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  viewToggleButtonActive: {
    backgroundColor: '#FF9800',
  },
  viewToggleIcon: {
    fontSize: 16,
    color: '#FF9800',
  },
  viewToggleIconActive: {
    color: '#fff',
  },
  productsScroll: {
    flex: 1,
  },
  productsListContainer: {
    padding: 16,
  },
  productsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  productCardList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productCardListSelected: {
    borderWidth: 2,
    borderColor: '#FF9800',
    backgroundColor: '#fff5e6',
  },
  productCardListContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productCardGrid: {
    width: (screenWidth - 32) / 2,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    margin: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productCardGridSelected: {
    borderWidth: 2,
    borderColor: '#FF9800',
    backgroundColor: '#fff5e6',
  },
  productIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productIconText: {
    fontSize: 20,
  },
  productIconGrid: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productIconTextGrid: {
    fontSize: 32,
  },
  productCardListInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  productNameGrid: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  productPriceList: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  productPriceGrid: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  modalFullScreen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalContentFullScreen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
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
    backgroundColor: '#2D3036',
    borderRadius: 16,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#E8A334',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  modalBodyContent: {
    padding: 16,
    paddingBottom: 32,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  imageUploadArea: {
    width: '100%',
    height: 150,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    opacity: 0.7,
  },
  imageUploadContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageUploadIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  imageUploadText: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontWeight: '500',
  },
  imageUploadHint: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
  },
  formInputMultiline: {
    minHeight: 80,
    paddingTop: 10,
    alignItems: 'flex-start',
  },
  formInputPrefix: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  formInputText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  formHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 24,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButtonOutlined: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d32f2f',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonOutlinedText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: 'bold',
  },
  textInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
  },
  textInputEditable: {
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    borderWidth: 0,
  },
  textInputMultiline: {
    minHeight: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  textInputPrice: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    paddingVertical: 0,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF9800',
    marginRight: 6,
  },
  modalButtonCancelText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalButtonConfirm: {
    backgroundColor: '#FF9800',
    marginLeft: 6,
  },
  modalButtonConfirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ProductosScreen;
