import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import { ProductService, Product } from '../services/productService';
import { OrderLecrepeService } from '../services/orderLecrepeService';
import { StorageService } from '../services/storageService';
import { useBluetooth } from '../contexts/BluetoothContext';
import { Order } from '../types';
import { useToast } from '../hooks/useToast';

// Declaración de tipos para TextEncoder (disponible en React Native)
declare const TextEncoder: {
  new (): {
    encode(input: string): Uint8Array;
  };
};

const { width } = Dimensions.get('window');

interface OrderCreationProps {
  isOpen: boolean;
  onClose: () => void;
  tableInfo?: {
    mesa: string | number;
    nombre: string;
    orden: number;
    id_place?: number; // ID numérico de la mesa para guardar en id_place
  };
  isTakeout?: boolean;
  editingOrder?: Order | null;
  isEditMode?: boolean;
  onSave?: (order: Partial<Order>) => Promise<void>;
  readOnly?: boolean;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  option?: string;
  selectedIngredients?: string[];
  excludedIngredients?: string[];
  selectedFruits?: string[];
  additionalIngredients?: Array<{ name: string; category: string; available: boolean }>;
  takeoutFee?: number;
  fee_togo?: number;
  itemTakeout?: boolean; // Marcar item individual como "para llevar" en órdenes de mesa
  originalProduct?: Product;
  withPearls?: boolean;
  deslactosado?: boolean;
  sinAzucar?: boolean;
  sinCremaBatida?: boolean;
  comments?: string;
}

const OrderCreation: React.FC<OrderCreationProps> = ({
  isOpen,
  onClose,
  tableInfo = { mesa: 'PARA LLEVAR', nombre: 'Cliente General', orden: 0 },
  isTakeout = true,
  editingOrder = null,
  isEditMode = false,
  onSave = null,
  readOnly = false,
}) => {
  // Usar contexto de Bluetooth (persistente entre pantallas)
  const { isBluetoothEnabled, bluetoothDevice, sendToBluetooth } = useBluetooth();
  // Usar hook de toast para notificaciones elegantes
  const { showSuccess, showError, showInfo, showWarning, ToastComponent } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0); // 0: CREPAS, 1: BEBIDAS
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid'); // 'list' o 'grid'
  const [orderName, setOrderName] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [isCartExpanded, setIsCartExpanded] = useState(false);
  const [drinkOptionsModal, setDrinkOptionsModal] = useState<{
    open: boolean;
    drink: Product | null;
  }>({ open: false, drink: null });
  const [selectedPriceOption, setSelectedPriceOption] = useState('');
  const [withPearls, setWithPearls] = useState(false);
  const [deslactosado, setDeslactosado] = useState(false);
  const [sinAzucar, setSinAzucar] = useState(false);
  const [sinCremaBatida, setSinCremaBatida] = useState(false);
  
  // Modal de ingredientes
  const [ingredientsModal, setIngredientsModal] = useState<{
    open: boolean;
    item: OrderItem | null;
    originalProduct: Product | null;
  }>({ open: false, item: null, originalProduct: null });
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [selectedFruits, setSelectedFruits] = useState<string[]>([]);
  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [ingredientsTab, setIngredientsTab] = useState(0);
  const [additionalIngredients, setAdditionalIngredients] = useState<Array<{ name: string; category: string; available: boolean }>>([]);
  const [showFruitValidationError, setShowFruitValidationError] = useState(false);
  
  // Datos de ingredientes y frutas (hardcodeados por ahora, se pueden obtener de API después)
  const [crepeIngredients, setCrepeIngredients] = useState<Array<{ name: string; category: string; available: boolean }>>([]);
  const [crepeFruits, setCrepeFruits] = useState<Array<{ name: string; category: string; available: boolean }>>([]);
  
  // Mapear productos a estructura similar a lecrepe-front
  const [crepasData, setCrepasData] = useState<Record<string, any[]>>({});
  const [bebidasData, setBebidasData] = useState<Record<string, any[]>>({});
  
  // Estado para controlar la impresión
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      if (!isEditMode || !editingOrder) {
        resetOrder();
        // Si es una orden de mesa (no para llevar), inicializar con el nombre de la mesa
        if (!isTakeout && tableInfo.mesa && tableInfo.mesa !== 'PARA LLEVAR' && tableInfo.mesa !== 'NUEVA ORDEN') {
          setOrderName(String(tableInfo.mesa));
        }
      }
    } else {
      setIsCartExpanded(false);
    }
  }, [isOpen, isEditMode, editingOrder, isTakeout, tableInfo]);
  
  useEffect(() => {
    // Actualizar subcategoría cuando cambian los datos
    if (Object.keys(crepasData).length > 0 || Object.keys(bebidasData).length > 0) {
      const subCategories = activeTab === 0 
        ? Object.keys(crepasData)
        : Object.keys(bebidasData);
      if (subCategories.length > 0 && (!selectedSubCategory || !subCategories.includes(selectedSubCategory))) {
        setSelectedSubCategory(subCategories[0]);
      }
      
      // Si estamos en modo de edición y los productos están cargados, inicializar
      if (isEditMode && editingOrder && orderItems.length === 0) {
        initializeEditMode();
    }
    }
  }, [crepasData, bebidasData, activeTab, isEditMode, editingOrder]);

  const mapProductsToComponentData = (productsList: Product[]) => {
    const crepasDataMap: Record<string, any[]> = {};
    const bebidasDataMap: Record<string, any[]> = {};

    productsList.forEach((product) => {
      // Filtrar productos placeholder
      if (product.name && (
        product.name.startsWith('__CATEGORY_PLACEHOLDER__') ||
        product.name.startsWith('__SUBCATEGORY_PLACEHOLDER__')
      )) {
        return;
      }

      if (product.type === 'bebida' || product.type === 'bebidas') {
        // Mapear bebidas igual que en lecrepe-front
        const subCategory = product.label || 'Bebidas';
        let category = subCategory;

        // Mapear subcategorías
        if (subCategory === 'fria' || subCategory === 'frias') {
          category = 'Bebidas Frías';
        } else if (subCategory === 'caliente' || subCategory === 'calientes') {
          category = 'Bebidas Calientes';
        } else if (subCategory === 'latte' || subCategory === 'lattes') {
          category = 'Lattes';
        } else {
          category = subCategory.charAt(0).toUpperCase() + subCategory.slice(1);
        }

        if (!bebidasDataMap[category]) {
          bebidasDataMap[category] = [];
        }

        // Crear opciones de precio
        const priceOptions: Array<{ name: string; price: number }> = [];
        let basePrice = (product as any).price || product.prices?.[0]?.price || 0;

        if (product.prices && product.prices.length > 0) {
          product.prices.forEach((priceItem, index) => {
            if (priceItem.size === 'chica' || priceItem.size === 'chico') {
              priceOptions.push({ name: 'Chico', price: priceItem.price });
              basePrice = priceItem.price;
            } else if (priceItem.size === 'grande') {
              priceOptions.push({ name: 'Grande', price: priceItem.price });
            } else if (priceItem.size === 'para_llevar' || priceItem.size === 'parallevar' || priceItem.size === 'togo') {
              priceOptions.push({ name: 'Para llevar', price: priceItem.price });
            } else if (index === 2) {
              priceOptions.push({ name: 'Para llevar', price: priceItem.price });
            } else {
              const optionName = priceItem.size
                ? priceItem.size.charAt(0).toUpperCase() + priceItem.size.slice(1)
                : `Opción ${index + 1}`;
              priceOptions.push({ name: optionName, price: priceItem.price });
            }
          });

          // Si no hay "Para llevar" pero existe fee_togo
          const hasParaLlevar = priceOptions.some(option => option.name === 'Para llevar');
          if (!hasParaLlevar && (product as any).fee_togo) {
            const chicoPrice = product.prices.find(p => p.size === 'chica' || p.size === 'chico');
            if (chicoPrice) {
              const paraLlevarPrice = chicoPrice.price + (product as any).fee_togo;
              priceOptions.push({ name: 'Para llevar', price: paraLlevarPrice });
            }
          }
        } else {
          // Precios por defecto
          priceOptions.push(
            { name: 'Chico', price: basePrice },
            { name: 'Grande', price: Math.round(basePrice * 1.5) },
            { name: 'Para llevar', price: basePrice + ((product as any).fee_togo || 0) }
          );
        }

        bebidasDataMap[category].push({
          id: product._id,
          name: product.name,
          icon: 'coffee',
          basePrice: basePrice,
          priceOptions: priceOptions,
          label: subCategory,
          pricePerlas: (product as any).pricePerlas || 0,
          originalProduct: product,
        });
      } else {
        // Mapear crepas
        const category = product.label || 'Crepas';
        if (!crepasDataMap[category]) {
          crepasDataMap[category] = [];
        }

        crepasDataMap[category].push({
          id: product._id,
          name: product.name,
          price: (product as any).price || product.prices?.[0]?.price || 0,
          icon: 'cake',
          ingredients: (product as any).ingredients || [],
          fee_togo: (product as any).fee_togo || 0,
          extraIngredientsPrice: (product as any).extraIngredientsPrice || 0,
          type: product.type || 'crepa',
          originalProduct: product,
        });
      }
    });

    return { crepasDataMap, bebidasDataMap };
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await ProductService.getAllProducts();
      if (response.data) {
        setProducts(response.data);
        const { crepasDataMap, bebidasDataMap } = mapProductsToComponentData(response.data);
        setCrepasData(crepasDataMap);
        setBebidasData(bebidasDataMap);
        
        // Initialize subcategory
        const crepasCategories = Object.keys(crepasDataMap);
        if (crepasCategories.length > 0) {
          setSelectedSubCategory(crepasCategories[0]);
        }
        
        // Si estamos en modo de edición, inicializar con los datos recién cargados
        if (isEditMode && editingOrder) {
          initializeEditMode(crepasDataMap, bebidasDataMap);
        }
      }
    } catch (error: any) {
      console.error('Error loading products:', error);
      showError('No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const initializeEditMode = (crepasDataToUse?: Record<string, any[]>, bebidasDataToUse?: Record<string, any[]>) => {
    if (editingOrder) {
      setOrderName(editingOrder.name || '');
      // Usar los datos pasados como parámetros o los del estado
      const crepasDataFinal = crepasDataToUse || crepasData;
      const bebidasDataFinal = bebidasDataToUse || bebidasData;
      
      const items: OrderItem[] = (editingOrder.items || editingOrder.products || []).map(
        (item, index) => {
          // El type_price del backend ya incluye el fee_togo si es para llevar
          let itemPrice = item.type_price || 0;
          const itemType = item.type || 'crepa';
          const itemName = item.product_name || item.name || '';
          
          // Calcular fee_togo basándose en el producto original
          let calculatedFeeTogo = 0;
          
          // Buscar el producto en los datos cargados para obtener el fee_togo
          const allProducts = (itemType === 'crepa' || itemType === 'crepas')
            ? Object.values(crepasDataFinal).flat()
            : Object.values(bebidasDataFinal).flat();
          
          const foundProduct = allProducts.find((p: any) => {
            const productName = p.name || '';
            const normalizedItemName = itemName.toLowerCase().trim();
            const normalizedProductName = productName.toLowerCase().trim();
            return normalizedItemName === normalizedProductName ||
                   normalizedItemName.includes(normalizedProductName) ||
                   normalizedProductName.includes(normalizedItemName);
          });
          
          if (foundProduct && isTakeout && (itemType === 'crepa' || itemType === 'crepas') && foundProduct.fee_togo) {
            calculatedFeeTogo = foundProduct.fee_togo;
          }
          
          // Si type_price es 0 o no está definido, buscar el precio del producto original
          if (itemPrice === 0) {
            const itemSize = item.size || '';
            
            if (foundProduct) {
              // Si hay un tamaño específico, buscar el precio de ese tamaño
              if (itemSize && foundProduct.priceOptions && foundProduct.priceOptions.length > 0) {
                const sizePrice = foundProduct.priceOptions.find((p: any) => {
                  const size = p.name || '';
                  return size.toLowerCase() === itemSize.toLowerCase() ||
                         (itemSize.toLowerCase().includes('llevar') && size.toLowerCase().includes('llevar'));
                });
                if (sizePrice) {
                  itemPrice = sizePrice.price || foundProduct.basePrice || foundProduct.price || 0;
                } else {
                  itemPrice = foundProduct.basePrice || foundProduct.price || 0;
                }
              } else {
                // Usar el precio base del producto
                itemPrice = foundProduct.basePrice || foundProduct.price || 0;
              }
              
              // Si el precio no incluye el fee_togo y es para llevar, agregarlo
              if (calculatedFeeTogo > 0 && (item.type_price || 0) === 0) {
                itemPrice += calculatedFeeTogo;
              }
              
              // Identificar ingredientes adicionales (toppings marcados con additional: true o selected: true)
              // NO cargar ingredientes esenciales seleccionados (ya no se guardan como toppings)
              const productIngredients = foundProduct.ingredients && Array.isArray(foundProduct.ingredients)
                ? foundProduct.ingredients.map((ing: any) => typeof ing === 'string' ? ing : ing.name)
                : [];
              
              // Obtener ingredientes adicionales (marcados con additional: true o selected: true sin marca)
              const additionalToppings = item.toppings?.filter((t: any) => {
                // Si tiene marca additional: true, es adicional
                if (t.additional === true) return true;
                // Si tiene selected: true, verificar si es adicional (no está en ingredientes del producto)
                if (t.selected === true && t.selected !== false) {
                  const toppingName = t.name || '';
                  return !productIngredients.some((ing: string) => 
                    ing.toLowerCase().trim() === toppingName.toLowerCase().trim()
                  );
                }
                return false;
              }) || [];
              
              const additionalIngredients = additionalToppings.map((t: any) => ({
                name: t.name,
                category: 'dulce',
                available: true
              }));
              
              // Obtener ingredientes esenciales excluidos (selected: false)
              const excludedToppings = item.toppings?.filter((t: any) => t.selected === false) || [];
              const excludedIngredients = excludedToppings.map((t: any) => t.name);
              
              // NO cargar selectedIngredients (ingredientes esenciales seleccionados) porque ya no se guardan
              // Solo se necesitan para la lógica interna del modal de personalización
              
              // Cargar opciones adicionales de bebidas desde comments
              const comments = (item as any).comments || '';
              const commentsLower = comments.toLowerCase();
              const wasDeslactosado = commentsLower.includes('deslactosado');
              const wasSinAzucar = commentsLower.includes('sin azúcar') || commentsLower.includes('sin azucar');
              const wasSinCremaBatida = commentsLower.includes('sin crema batida');
              
              // Verificar si el item es para llevar individualmente (en órdenes de mesa)
              const wasItemTakeout = (item as any).item_togo === true || 
                                     (commentsLower.includes('para llevar') && !isTakeout);
              
          return {
            id: item._id || `item_${index}`,
            name: item.product_name || item.name || '',
            price: itemPrice, // Ya incluye fee_togo si aplica
                quantity: (item.units && item.units > 0) ? item.units : 1,
            category: item.type || 'crepa',
            option: item.size || 'Regular',
            selectedIngredients: [], // No cargar ingredientes esenciales seleccionados (ya no se guardan)
            excludedIngredients: excludedIngredients,
                additionalIngredients: additionalIngredients,
                takeoutFee: calculatedFeeTogo,
                fee_togo: calculatedFeeTogo,
                itemTakeout: wasItemTakeout, // Cargar estado de "para llevar" individual
                originalProduct: foundProduct,
                deslactosado: wasDeslactosado,
                sinAzucar: wasSinAzucar,
                sinCremaBatida: wasSinCremaBatida,
                comments: comments,
              };
          } else {
            // Si no se encuentra el producto, usar valores del item original
            // Identificar ingredientes adicionales (marcados con additional: true o selected: true)
            const additionalToppings = item.toppings?.filter((t: any) => {
              // Si tiene marca additional: true, es adicional
              if (t.additional === true) return true;
              // Si tiene selected: true, es adicional (porque los esenciales seleccionados ya no se guardan)
              if (t.selected === true && t.selected !== false) return true;
              return false;
            }) || [];
            const additionalIngredients = additionalToppings.map((t: any) => ({
              name: t.name,
              category: 'dulce',
              available: true
            }));
            
            // Obtener ingredientes esenciales excluidos (selected: false)
            const excludedToppings = item.toppings?.filter((t: any) => t.selected === false) || [];
            const excludedIngredients = excludedToppings.map((t: any) => t.name);
            
            // Cargar opciones adicionales de bebidas desde comments
            const comments = (item as any).comments || '';
            const commentsLower = comments.toLowerCase();
            const wasDeslactosado = commentsLower.includes('deslactosado');
            const wasSinAzucar = commentsLower.includes('sin azúcar') || commentsLower.includes('sin azucar');
            const wasSinCremaBatida = commentsLower.includes('sin crema batida');
            
            // Verificar si el item es para llevar individualmente (en órdenes de mesa)
            const wasItemTakeout = (item as any).item_togo === true || 
                                   (commentsLower.includes('para llevar') && !isTakeout);
            
            return {
              id: item._id || `item_${index}`,
              name: item.product_name || item.name || '',
              price: itemPrice,
              quantity: (item.units && item.units > 0) ? item.units : 1,
              category: itemType,
              option: item.size || 'Regular',
              selectedIngredients: [], // No cargar ingredientes esenciales seleccionados (ya no se guardan)
              excludedIngredients: excludedIngredients,
              additionalIngredients: additionalIngredients,
              takeoutFee: calculatedFeeTogo,
              fee_togo: calculatedFeeTogo,
              itemTakeout: wasItemTakeout, // Cargar estado de "para llevar" individual
              deslactosado: wasDeslactosado,
              sinAzucar: wasSinAzucar,
              sinCremaBatida: wasSinCremaBatida,
              comments: comments,
            };
          }
        } else {
          // Si type_price existe, el precio ya incluye el fee_togo
          // Pero necesitamos mostrar el fee_togo por separado
          // Identificar ingredientes adicionales (marcados con additional: true o selected: true)
          const additionalToppings = item.toppings?.filter((t: any) => {
            // Si tiene marca additional: true, es adicional
            if (t.additional === true) return true;
            // Si tiene selected: true, es adicional (porque los esenciales seleccionados ya no se guardan)
            if (t.selected === true && t.selected !== false) return true;
            return false;
          }) || [];
          const additionalIngredients = additionalToppings.map((t: any) => ({
            name: t.name,
            category: 'dulce',
            available: true
          }));
          
          // Obtener ingredientes esenciales excluidos (selected: false)
          const excludedToppings = item.toppings?.filter((t: any) => t.selected === false) || [];
          const excludedIngredients = excludedToppings.map((t: any) => t.name);
          
          // Cargar opciones adicionales de bebidas desde comments
          const comments = (item as any).comments || '';
          const commentsLower = comments.toLowerCase();
          const wasDeslactosado = commentsLower.includes('deslactosado');
          const wasSinAzucar = commentsLower.includes('sin azúcar') || commentsLower.includes('sin azucar');
          const wasSinCremaBatida = commentsLower.includes('sin crema batida');
          
          // Verificar si el item es para llevar individualmente (en órdenes de mesa)
          const wasItemTakeout = (item as any).item_togo === true || 
                                 (commentsLower.includes('para llevar') && !isTakeout);
          
          return {
            id: item._id || `item_${index}`,
            name: item.product_name || item.name || '',
            price: itemPrice,
            quantity: (item.units && item.units > 0) ? item.units : 1,
            category: itemType,
            option: item.size || 'Regular',
            selectedIngredients: [], // No cargar ingredientes esenciales seleccionados (ya no se guardan)
            excludedIngredients: excludedIngredients,
            additionalIngredients: additionalIngredients,
            takeoutFee: calculatedFeeTogo,
            fee_togo: calculatedFeeTogo,
            itemTakeout: wasItemTakeout, // Cargar estado de "para llevar" individual
            deslactosado: wasDeslactosado,
            sinAzucar: wasSinAzucar,
            sinCremaBatida: wasSinCremaBatida,
            comments: comments,
          };
        }
        }
      );
      setOrderItems(items);
    }
  };

  const resetOrder = () => {
    setOrderName('');
    setOrderItems([]);
    setSelectedPriceOption('');
    setWithPearls(false);
  };

  const getSubCategories = (): string[] => {
    if (activeTab === 0) {
      return Object.keys(crepasData);
    } else {
      return Object.keys(bebidasData);
    }
  };

  const getProductsBySubCategory = (subCategory: string): any[] => {
    if (activeTab === 0) {
      return crepasData[subCategory] || [];
    } else {
      return bebidasData[subCategory] || [];
    }
  };

  const getCurrentProducts = (): any[] => {
    return getProductsBySubCategory(selectedSubCategory);
  };

  // Función para obtener el color de la tarjeta según el tipo de bebida
  const getCardColor = (item: any) => {
    if (activeTab === 1) { // Solo para bebidas
      const productName = item.name.toLowerCase();
      
      if (productName.includes('frappé') || productName.includes('frappe') || productName.includes('frapuccino')) {
        return {
          backgroundColor: '#E3F2FD', // Azul claro
          borderColor: '#2196F3',
          textColor: '#333', // Texto oscuro para fondo claro
        };
      } else if (productName.includes('smoothie') || productName.includes('batido')) {
        return {
          backgroundColor: '#E8F5E8', // Verde claro
          borderColor: '#4CAF50',
          textColor: '#333', // Texto oscuro para fondo claro
        };
      } else if (productName.includes('té') || productName.includes('tea') || productName.includes('te')) {
        return {
          backgroundColor: '#FFF3E0', // Naranja claro
          borderColor: '#FF9800',
          textColor: '#333', // Texto oscuro para fondo claro
        };
      } else if (productName.includes('capuchino') || productName.includes('cappuccino') || productName.includes('capuccino')) {
        return {
          backgroundColor: '#F3E5F5', // Morado claro
          borderColor: '#9C27B0',
          textColor: '#333', // Texto negro para capuchinos
        };
      } else if (productName.includes('latte') || productName.includes('mocha') || productName.includes('macchiato')) {
        return {
          backgroundColor: '#FFF8E1', // Amarillo claro
          borderColor: '#FFC107',
          textColor: '#333', // Texto oscuro para fondo claro
        };
      }
    }
    
    // Color por defecto
    return {
      backgroundColor: '#fff',
      borderColor: '#e0e0e0',
      textColor: '#333',
    };
  };

  const addItemToOrder = (item: any) => {
    if (activeTab === 1) {
      // Bebidas - abrir modal de opciones
      setDrinkOptionsModal({ open: true, drink: item });
      setSelectedPriceOption('');
      setWithPearls(false);
    } else {
      // Crepas - agregar directamente
      const basePrice = item.price || 0;
      const takeoutFee = isTakeout && item.type === 'crepa' ? (item.fee_togo || 5) : 0;
      
      const existingItem = orderItems.find(
        (orderItem) => orderItem.id === item.id && !orderItem.selectedIngredients
      );

      if (existingItem) {
        setOrderItems((prev) =>
          prev.map((orderItem) =>
            orderItem.id === existingItem.id
              ? { ...orderItem, quantity: orderItem.quantity + 1 }
              : orderItem
          )
        );
      } else {
        const newItem: OrderItem = {
          id: item.id,
          name: item.name,
          price: basePrice,
          quantity: 1,
          category: 'crepa',
          takeoutFee: takeoutFee,
          originalProduct: item.originalProduct,
        };
        setOrderItems((prev) => [...prev, newItem]);
      }
    }
  };

  const isFrappe = (product: any) => {
    const name = (product.name || '').toLowerCase();
    return name.includes('frappé') || name.includes('frappe') || name.includes('smoothie');
  };

  const handleDrinkOptionsConfirm = () => {
    if (!drinkOptionsModal.drink || !selectedPriceOption) return;

    const drink = drinkOptionsModal.drink as any;
    const selectedOption = drink.priceOptions?.find(
      (opt: any) => opt.name === selectedPriceOption
    );
    let finalPrice = selectedOption?.price || drink.basePrice || 0;

    if (withPearls && drink.pricePerlas) {
      finalPrice += drink.pricePerlas;
    }

    // Construir array de opciones adicionales para frappés
    const frappeOptions: string[] = [];
    if (isFrappe(drink)) {
      if (deslactosado) frappeOptions.push('Deslactosado');
      if (sinAzucar) frappeOptions.push('Sin Azúcar');
      if (sinCremaBatida) frappeOptions.push('Sin crema batida');
    }

    // Construir comentarios con las opciones seleccionadas
    const comments = frappeOptions.length > 0 ? frappeOptions.join(', ') : '';

    let itemName = `${drink.name} - ${selectedPriceOption}`;
    if (withPearls) {
      itemName += ' con Perlas';
    }

    const newItem: OrderItem = {
      id: `${drink.id}_${selectedPriceOption.replace(/\s+/g, '_')}${withPearls ? '_con_perlas' : ''}${deslactosado ? '_deslactosado' : ''}${sinAzucar ? '_sin_azucar' : ''}${sinCremaBatida ? '_sin_crema' : ''}`,
      name: itemName,
      price: finalPrice,
      quantity: 1,
      category: 'bebida',
      option: selectedPriceOption,
      withPearls: withPearls,
      deslactosado: deslactosado,
      sinAzucar: sinAzucar,
      sinCremaBatida: sinCremaBatida,
      comments: comments,
    };

    setOrderItems((prev) => [...prev, newItem]);
    setDrinkOptionsModal({ open: false, drink: null });
    setSelectedPriceOption('');
    setWithPearls(false);
    setDeslactosado(false);
    setSinAzucar(false);
    setSinCremaBatida(false);
  };

  const updateQuantity = (itemId: string, change: number) => {
    setOrderItems((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const newQuantity = item.quantity + change;
            if (newQuantity <= 0) return null;
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter((item): item is OrderItem => item !== null)
    );
  };

  const getTotal = (): number => {
    // El precio del item ya incluye el takeoutFee si es para llevar
    // No necesitamos sumarlo por separado
    return orderItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };

  const getTotalItems = (): number => {
    return orderItems.reduce((total, item) => total + item.quantity, 0);
  };

  // Función para toggle de "para llevar" en items individuales (solo para órdenes de mesa)
  const toggleItemTakeout = (itemId: string) => {
    if (readOnly) return;
    
    setOrderItems(prev =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newItemTakeout = !item.itemTakeout;
          const originalProduct = item.originalProduct;
          
          // Si el item es una crepa, calcular el fee_togo
          if (item.category === 'crepa' && originalProduct) {
            const feeTogo = (originalProduct as any).fee_togo || 10; // Default $10
            
            // Calcular precio base (sin fee_togo)
            // Si el item ya tiene takeoutFee, restarlo para obtener el precio base
            const currentTakeoutFee = item.takeoutFee || item.fee_togo || 0;
            const basePrice = item.price - currentTakeoutFee;
            
            // Calcular nuevo precio
            const newPrice = newItemTakeout ? basePrice + feeTogo : basePrice;
            
            return {
              ...item,
              itemTakeout: newItemTakeout,
              takeoutFee: newItemTakeout ? feeTogo : 0,
              fee_togo: newItemTakeout ? feeTogo : 0,
              price: newPrice,
            };
          }
          
          return {
            ...item,
            itemTakeout: newItemTakeout,
            takeoutFee: 0,
            fee_togo: 0,
          };
        }
        return item;
      })
    );
  };

  const handleOrderReady = async () => {
    if (orderItems.length === 0) {
      showError('Agrega al menos un producto a la orden');
      return;
    }

    try {
      const idStore = await StorageService.getItem('idStore');
      if (!idStore) {
        showError('No se encontró el ID de la tienda');
        return;
      }

      // Calcular total (ya incluye takeoutFee porque item.price ya lo incluye)
      const total = getTotal();
      const finalTotal = total; // Ya no necesitamos sumar totalParaLlevar por separado

      // Calcular cantidad de crepas para service_charge
      const crepasCount = orderItems.filter(item => item.category === 'crepa').reduce((sum, item) => sum + item.quantity, 0);

      // Determinar el nombre del cliente y de la orden
      // Si es una orden de mesa (no para llevar), usar el nombre de la mesa
      const clientName = !isTakeout && tableInfo.mesa && tableInfo.mesa !== 'PARA LLEVAR' && tableInfo.mesa !== 'NUEVA ORDEN'
        ? tableInfo.mesa
        : (orderName || 'Cliente General');
      const orderNameFinal = !isTakeout && tableInfo.mesa && tableInfo.mesa !== 'PARA LLEVAR' && tableInfo.mesa !== 'NUEVA ORDEN'
        ? tableInfo.mesa
        : (orderName || `Orden ${tableInfo.orden}`);

      // Preparar datos de la orden similar a lecrepe-front
      const orderData: any = {
        id_store: parseInt(idStore),
        id_place: tableInfo.mesa === 'PARA LLEVAR' || tableInfo.mesa === 'NUEVA ORDEN' 
          ? 0 
          : (tableInfo.id_place || (typeof tableInfo.mesa === 'number' ? tableInfo.mesa : parseInt(String(tableInfo.mesa)) || 0)),
        togo: isTakeout,
        status: isEditMode && editingOrder ? editingOrder.status : 'Pendiente',
        client: {
          name: clientName,
          phone: (editingOrder?.client as any)?.phone || '',
          email: (editingOrder?.client as any)?.email || '',
        },
        payment: {
          method: (editingOrder?.payment as any)?.method || 'Efectivo',
          amount: finalTotal,
          url_ticket: (editingOrder?.payment as any)?.url_ticket || '',
        },
        items: orderItems.map((item) => {
          // Solo guardar ingredientes excluidos y adicionales en toppings
          // NO guardar ingredientes esenciales seleccionados (son los que vienen por defecto)
          const toppings: any[] = [];
          
          // Agregar ingredientes esenciales excluidos (selected: false)
          if (item.excludedIngredients && item.excludedIngredients.length > 0) {
            item.excludedIngredients.forEach((ingredient) => {
              toppings.push({
                name: ingredient,
                price: 0,
                selected: false,
              });
            });
          }
          
          // Agregar ingredientes adicionales (selected: true, additional: true)
          if (item.additionalIngredients && item.additionalIngredients.length > 0) {
            item.additionalIngredients.forEach((ingredient) => {
              const ingredientName = typeof ingredient === 'string' ? ingredient : ingredient.name;
              toppings.push({
                name: ingredientName,
                price: 0,
                selected: true,
                additional: true, // Marcar como ingrediente adicional para distinguirlo en KitchenScreen
              });
            });
          }
          
          // Construir comentarios con opciones adicionales de bebidas
          let comments = '';
          if (item.category === 'bebida') {
            const frappeOptions: string[] = [];
            if (item.deslactosado) frappeOptions.push('Deslactosado');
            if (item.sinAzucar) frappeOptions.push('Sin Azúcar');
            if (item.sinCremaBatida) frappeOptions.push('Sin crema batida');
            comments = frappeOptions.length > 0 ? frappeOptions.join(', ') : (item.comments || '');
          }
          
          // Si el item está marcado como "para llevar" individualmente (en órdenes de mesa)
          if (!isTakeout && item.itemTakeout && item.category === 'crepa') {
            // Agregar indicador de "para llevar" en los comentarios si no hay otros comentarios
            if (!comments) {
              comments = 'Para llevar';
            } else {
              comments = `Para llevar, ${comments}`;
            }
          }
          
          return {
            type: item.category || (activeTab === 0 ? 'crepa' : 'bebida'),
            name: item.name,
            size: item.option || 'Regular',
            price: item.price, // El precio ya incluye takeoutFee y cargo adicional si aplica
            units: item.quantity || 1, // Asegurar que siempre haya al menos 1 unidad
            toppings: toppings,
            comments: comments,
            url: '',
            // Agregar campo para indicar si el item individual es para llevar (en órdenes de mesa)
            item_togo: (!isTakeout && item.itemTakeout) ? true : undefined,
            // También incluir takeoutFee en el item para referencia
            takeout_fee: (!isTakeout && item.itemTakeout && item.takeoutFee) ? item.takeoutFee : undefined,
          };
        }),
        attended_by: (editingOrder as any)?.attended_by || 'Sistema',
        comments: (editingOrder as any)?.comments || '',
        name: orderNameFinal,
        products: orderItems, // Mantener productos originales
        date: isEditMode && editingOrder ? editingOrder.date : new Date().toISOString(),
        total: finalTotal,
        subtotal: finalTotal * 0.84,
        tax: finalTotal * 0.16,
        service_charge: isTakeout ? (crepasCount * 10) : 0,
      };

      if (isEditMode && onSave && editingOrder) {
        // Modo edición: llamar a onSave
        // Asegurarse de incluir id_order en orderData para que el backend lo reconozca
        const orderDataWithId = {
          ...orderData,
          id_order: editingOrder.id_order || editingOrder._id || (editingOrder as any).id,
        };
        await onSave(orderDataWithId);
        // onSave ya maneja el toast y el cierre del modal, solo limpiar la orden
        resetOrder();
      } else {
        // Modo creación: crear nueva orden
        console.log('🔍 DEBUG OrderCreation - Sending order to backend:', {
          orderData,
          isTakeout,
          tableInfo,
          orderItems: orderItems.length,
        });

        const response = await OrderLecrepeService.createOrderLecrepe(orderData);
        
        if (response.success) {
          console.log('🔍 DEBUG OrderCreation - Order created successfully:', response.data);
          
          // Si onSave está definido (desde MesasScreen u OrdenesScreen), delegar el manejo completo
          if (onSave) {
            const createdOrder = response.data || {};
            await onSave({
              ...createdOrder,
              id_order: createdOrder.id_order || createdOrder._id || (createdOrder as any).id,
              total: createdOrder.total || finalTotal,
              status: createdOrder.status || 'Pendiente',
            } as Partial<Order>);
            // onSave ya maneja el toast y el cierre del modal, solo limpiar la orden
            resetOrder();
          } else {
            // Si no hay onSave (modo standalone), mostrar toast y cerrar modal
            showSuccess('Orden creada exitosamente');
            setTimeout(() => {
              resetOrder();
              onClose();
            }, 1000);
          }
        } else {
          console.error('🔍 DEBUG OrderCreation - Error creating order:', response);
          showError('No se pudo crear la orden');
        }
      }
    } catch (error: any) {
      console.error('Error processing order:', error);
      showError(`No se pudo procesar la orden: ${error.message || 'Error desconocido'}`);
    }
  };


  const handlePrintOrder = async () => {
    if (orderItems.length === 0) {
      showWarning('No hay items en la orden para imprimir');
      return;
    }

    setIsPrinting(true);

    try {
      // Obtener configuración de la impresora (solo para WiFi)
      const savedIP = await StorageService.getItem('printerIP');
      const savedPort = await StorageService.getItem('printerPort');

      const printerIP = savedIP || '192.168.1.26';
      const printerPort = savedPort || '9100';
      // useBluetooth viene del contexto

      // Verificar configuración
      if (!useBluetooth && (!printerIP || !printerPort)) {
        showError('Por favor configura la impresora en Configuración');
        setIsPrinting(false);
        return;
      }

      if (useBluetooth && !bluetoothDevice) {
        showError('Por favor conecta un dispositivo Bluetooth en Configuración');
        setIsPrinting(false);
        return;
      }

      // Constante para precio de para llevar
      const TOGO_PRICE = 10; // Ajusta este valor según tu configuración
      // Ajustado para impresora de 58mm (32 caracteres por línea) o 80mm
      const anchoCantidad = isBluetoothEnabled ? 4 : 6; // Ancho para cantidad (58mm: 4, 80mm: 6)
      const anchoDescripcion = isBluetoothEnabled ? 18 : 28; // Ancho para descripción (58mm: 18, 80mm: 28)
      const anchoPrecio = isBluetoothEnabled ? 8 : 11; // Ancho para precio (58mm: 8, 80mm: 11)

      // Función para remover acentos y caracteres especiales
      const removeAccents = (str: string): string => {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[ñÑ]/g, (match) => match === 'ñ' ? 'n' : 'N')
          .replace(/[áÁ]/g, 'A')
          .replace(/[éÉ]/g, 'E')
          .replace(/[íÍ]/g, 'I')
          .replace(/[óÓ]/g, 'O')
          .replace(/[úÚ]/g, 'U');
      };

      // Comandos ESC/POS
      const ESC = '\x1B';
      const centerText = ESC + 'a' + '\x01'; // Centrar
      const leftAlign = ESC + 'a' + '\x00'; // Izquierda
      const resetFormat = ESC + '@'; // Reset
      const lineFeed = '\n';
      const smallSize = ESC + '!' + '\x00'; // Tamaño pequeño/normal
      const normalSize = ESC + '!' + '\x00'; // Tamaño normal

      // Logo deshabilitado - no se carga para evitar conflictos
      const logoEscPos = '';

      let salida = "";
      let total = 0;
      let totalParaLlevar = 0;

      // Agrupar productos por categoría
      const groupedProducts: { [key: string]: typeof orderItems } = {};
      orderItems.forEach(item => {
        // Normalizar categoría: crepa/crepas -> crepas, bebida/bebidas -> bebidas
        let category = item.category || 'otros';
        if (category === 'crepa') category = 'crepas';
        if (category === 'bebida') category = 'bebidas';
        
        if (!groupedProducts[category]) {
          groupedProducts[category] = [];
        }
        groupedProducts[category].push(item);
      });

      // Procesar productos agrupados por categoría
      const categoryOrder = ['crepas', 'bebidas', 'otros'];
      categoryOrder.forEach(category => {
        if (!groupedProducts[category] || groupedProducts[category].length === 0) return;

        // Agregar encabezado de categoría (sin acentos)
        const categoryLabel = removeAccents(category.toUpperCase());
        salida += `${categoryLabel}:${lineFeed}`;

        // Procesar productos de esta categoría
        groupedProducts[category].forEach(item => {
          // Alinear cantidad a la derecha - asegurar que siempre haya al menos 1
          const itemQuantity = (item.quantity && item.quantity > 0) ? item.quantity : 1;
          const cantidad = itemQuantity.toString().padStart(anchoCantidad);
          let productDesc = removeAccents(item.name);
          
          // Agregar opción si existe (tamaño de bebida) - solo si no es "Regular" o si hay cambios
          if (item.option && item.option !== 'Regular' && item.option !== 'regular') {
            productDesc += ` ${removeAccents(item.option)}`;
          }
          
          // Agregar ingredientes excluidos si existen
          if (item.excludedIngredients && item.excludedIngredients.length > 0) {
            productDesc += ` (sin ${item.excludedIngredients.map(ing => removeAccents(ing)).join(', ')})`;
          }
          
          // Agregar frutas seleccionadas si existen
          if (item.selectedFruits && item.selectedFruits.length > 0) {
            productDesc += ` (${item.selectedFruits.map(fruit => removeAccents(fruit)).join(', ')})`;
          }
          
          const descripcion = productDesc.substring(0, anchoDescripcion).padEnd(anchoDescripcion);
          // El precio del item ya incluye el takeoutFee si es para llevar
          // item.price ya incluye takeoutFee cuando se guarda la orden
          const itemTotalPrice = item.price * itemQuantity;
          const precio = `$${itemTotalPrice.toFixed(2)}`.padStart(anchoPrecio);
          salida += `${cantidad} ${descripcion}${precio}${lineFeed}`; // Espacio entre cantidad y descripción

          // Calcular total del producto (el precio ya incluye takeoutFee si aplica)
          total += itemTotalPrice;
        });
      });

      // El totalParaLlevar ya está incluido en el precio de cada item
      // No necesitamos calcularlo por separado porque ya está en item.price
      // Si el backend devuelve un totalParaLlevar separado, lo usamos, sino es 0
      totalParaLlevar = 0;

      // Generar ticket - Ajustado para 58mm o 80mm según el tipo de conexión
      const separator = isBluetoothEnabled ? '--------------------------------' : '---------------------------------------------';
      const orderName = removeAccents(orderName || 'Cliente General');
      const orderNameLine = isBluetoothEnabled 
        ? `Nombre: ${orderName.length > 30 ? orderName.substring(0, 27) + '...' : orderName}\n`
        : `Nombre Orden: ${orderName}\n`;
      const headerLine = isBluetoothEnabled 
        ? 'CANT DESCRIPCION      TOTAL\n'
        : 'CANT   DESCRIPCION                  TOTAL\n';
      
      const fecha = removeAccents(new Date().toLocaleDateString());
      // Formatear hora solo con horas y minutos (sin segundos ni símbolos extraños)
      const now = new Date();
      const hora = removeAccents(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
      const mesaText = isTakeout ? 'PARA LLEVAR' : `MESA ${tableInfo?.mesa || ''}`;
      
      // Calcular ancho para alinear totales a la derecha
      const anchoTotal = isBluetoothEnabled ? 32 : 45;
      const subtotalLabel = 'SUBTOTAL:';
      const paraLlevarLabel = 'PARA LLEVAR:';
      const totalLabel = 'TOTAL A PAGAR:';
      
      const doubleSizeBold = ESC + '!' + '\x38'; // Doble tamaño y negritas
      const ticketContent = resetFormat + smallSize + // Tamaño pequeño
        (logoEscPos ? logoEscPos + lineFeed : '') + // Logo en la parte superior
        centerText + doubleSizeBold + removeAccents('LECREPE') + smallSize + lineFeed + // Texto LECREPE grande
        centerText + removeAccents('CD. MANUEL DOBLADO') + lineFeed +
        removeAccents('Tel: 432-100-4990') + lineFeed +
        leftAlign + separator + lineFeed +
        `Fecha: ${fecha}  Hora: ${hora}` + lineFeed +
        `Orden No: ${tableInfo?.orden || 0}` + lineFeed +
        mesaText + lineFeed +
        orderNameLine + separator + lineFeed +
        headerLine + separator + lineFeed +
        salida + separator + lineFeed +
        `${subtotalLabel}${' '.repeat(anchoTotal - subtotalLabel.length - total.toFixed(2).length - 1)}$${total.toFixed(2)}` + lineFeed +
        (totalParaLlevar > 0 ? `${paraLlevarLabel}${' '.repeat(anchoTotal - paraLlevarLabel.length - totalParaLlevar.toFixed(2).length - 1)}$${totalParaLlevar.toFixed(2)}` + lineFeed : '') +
        separator + lineFeed +
        `${totalLabel}${' '.repeat(anchoTotal - totalLabel.length - (total+totalParaLlevar).toFixed(2).length - 1)}$${(total+totalParaLlevar).toFixed(2)}` + lineFeed +
        separator + lineFeed +
        centerText + removeAccents('GRACIAS POR TU COMPRA') + lineFeed +
        removeAccents('VUELVE PRONTO :)') + lineFeed +
        leftAlign + separator + lineFeed +
        '\n'.repeat(isBluetoothEnabled ? 3 : 5) + // Menos espacios al final
        resetFormat;

      // Usar Bluetooth o TCP según la configuración
      if (isBluetoothEnabled && bluetoothDevice) {
        try {
          await sendToBluetooth(ticketContent);
          setIsPrinting(false);
          showSuccess(`Orden #${tableInfo?.orden || 0} enviada a impresora Bluetooth`);
        } catch (error: any) {
          setIsPrinting(false);
          showError('Error al enviar a impresora Bluetooth: ' + (error.message || 'Error desconocido'));
        }
      } else {
        const client = TcpSocket.createConnection(
          {
            host: printerIP,
            port: parseInt(printerPort, 10),
          },
          () => {
            try {
              const encoder = new TextEncoder();
              const uint8Array = encoder.encode(ticketContent);
              client.write(uint8Array as any);
              
              setTimeout(() => {
                client.destroy();
                setIsPrinting(false);
                showSuccess(`Orden #${tableInfo?.orden || 0} enviada a impresora`);
              }, 500);
            } catch (error: any) {
              client.destroy();
              setIsPrinting(false);
              showError('Error al enviar datos: ' + error.message);
            }
          }
        );

        client.on('error', (error: any) => {
          client.destroy();
          setIsPrinting(false);
          showError('No se pudo conectar a la impresora. Verifica IP, puerto y conexión WiFi');
        });

        client.on('close', () => {
          setIsPrinting(false);
        });

        setTimeout(() => {
          if (client && !client.destroyed) {
            client.destroy();
            setIsPrinting(false);
            showError('La impresora no respondió. Verifica la conexión.');
          }
        }, 10000);
      }
    } catch (error: any) {
      setIsPrinting(false);
      showError('Error al imprimir: ' + (error.message || 'Error desconocido'));
    }
  };

  // Función para manejar clic en items de crepa en el sidebar
  const handleCrepeItemClick = async (item: OrderItem) => {
    if (readOnly) return;
    
    // Solo permitir para crepas
    if (item.category !== 'crepa') return;

    // Cargar ingredientes y frutas si no están cargados
    if (crepeIngredients.length === 0 || crepeFruits.length === 0) {
      try {
        const [ingredientsResponse, fruitsResponse] = await Promise.all([
          ProductService.getCrepeIngredients(),
          ProductService.getCrepeFruits()
        ]);
        
        if (ingredientsResponse.success && ingredientsResponse.data) {
          setCrepeIngredients(ingredientsResponse.data);
        }
        
        if (fruitsResponse.success && fruitsResponse.data) {
          setCrepeFruits(fruitsResponse.data);
        }
      } catch (error: any) {
        console.error('Error loading ingredients:', error);
        // Continuar aunque haya error, usar los que ya están cargados
      }
    }

    // Buscar el producto original
    let originalProduct: Product | null = null;

    // Si el item ya tiene originalProduct, usarlo directamente
    if (item.originalProduct) {
      originalProduct = item.originalProduct;
    } else {
      // Buscar por ID en los productos cargados
      const baseId = item.id.split('_custom_')[0];
      originalProduct = products.find(p => p._id === baseId) || null;

      // Si no se encuentra por ID, buscar por nombre
      if (!originalProduct && item.name) {
        originalProduct = products.find(p => 
          p.name && 
          p.name.toLowerCase().trim() === item.name.toLowerCase().trim() && 
          (p.type === 'crepa' || p.type === 'crepas')
        ) || null;
      }
    }

    if (originalProduct) {
      // Inicializar ingredientes seleccionados
      let ingredientsToSelect: string[] = [];
      
      if (item.selectedIngredients && item.selectedIngredients.length > 0) {
        // Usar los ingredientes ya seleccionados
        ingredientsToSelect = item.selectedIngredients;
      } else if (originalProduct.ingredients && Array.isArray(originalProduct.ingredients)) {
        // Inicializar con todos los ingredientes disponibles
        ingredientsToSelect = originalProduct.ingredients
          .filter((ingredient: any) => ingredient.available !== false)
          .map((ingredient: any) => typeof ingredient === 'string' ? ingredient : ingredient.name);
      }

      // Inicializar frutas seleccionadas
      let fruitsToSelect: string[] = [];
      if (item.selectedFruits && item.selectedFruits.length > 0) {
        fruitsToSelect = item.selectedFruits;
      } else if (item.name && item.name.toLowerCase().includes('chocolatosa')) {
        // Para chocolatosa, inicializar frutas si están disponibles
        fruitsToSelect = [];
      }

      // Inicializar ingredientes adicionales del item
      let additionalIngredientsToLoad: Array<{ name: string; category: string; available: boolean }> = [];
      if (item.additionalIngredients && item.additionalIngredients.length > 0) {
        // Convertir a formato correcto si es necesario
        additionalIngredientsToLoad = item.additionalIngredients.map((ing: any) => {
          if (typeof ing === 'string') {
            // Si es string, buscar en crepeIngredients o crepeFruits para obtener la categoría
            // Si los arrays aún no están cargados, intentar cargarlos primero
            let foundIngredient = crepeIngredients.find(ci => ci.name === ing);
            let foundFruit = crepeFruits.find(cf => cf.name === ing);
            
            // Si no se encuentra y los arrays están vacíos, intentar cargar desde API
            if (!foundIngredient && !foundFruit && (crepeIngredients.length === 0 || crepeFruits.length === 0)) {
              // Usar categoría por defecto basada en el nombre o intentar detectar
              const lowerName = ing.toLowerCase();
              if (lowerName.includes('fruta') || ['fresa', 'plátano', 'durazno', 'mango', 'kiwi', 'piña'].some(f => lowerName.includes(f))) {
                return { name: ing, category: 'fruta', available: true };
              } else {
                return { name: ing, category: 'dulce', available: true };
              }
            }
            
            if (foundIngredient) {
              return foundIngredient;
            } else if (foundFruit) {
              return foundFruit;
            } else {
              // Si no se encuentra después de buscar, usar categoría por defecto
              const lowerName = ing.toLowerCase();
              if (lowerName.includes('fruta') || ['fresa', 'plátano', 'durazno', 'mango', 'kiwi', 'piña'].some(f => lowerName.includes(f))) {
                return { name: ing, category: 'fruta', available: true };
              } else {
                return { name: ing, category: 'dulce', available: true };
              }
            }
          } else if (ing && typeof ing === 'object' && ing.name) {
            // Si ya es un objeto, asegurarse de que tenga el formato correcto
            return {
              name: ing.name,
              category: ing.category || 'dulce',
              available: ing.available !== false
            };
          }
          return null;
        }).filter((ing): ing is { name: string; category: string; available: boolean } => ing !== null);
      }

      setSelectedIngredients(ingredientsToSelect);
      setSelectedFruits(fruitsToSelect);
      setAdditionalIngredients(additionalIngredientsToLoad);
      
      // Log para debug - verificar que se carguen todos los ingredientes adicionales
      console.log('🔍 Cargando ingredientes adicionales al abrir modal:', additionalIngredientsToLoad.length, additionalIngredientsToLoad.map(ing => ing.name));

      setIngredientsModal({
        open: true,
        item: item,
        originalProduct: originalProduct,
      });
    } else {
      showError('No se pudo encontrar el producto original');
    }
  };

  // Función para manejar cambio en ingredientes seleccionados
  const handleIngredientToggle = (ingredientName: string) => {
    setSelectedIngredients(prev => {
      const newIngredients = prev.includes(ingredientName)
        ? prev.filter(name => name !== ingredientName)
        : [...prev, ingredientName];

      // Si se desmarca el ingrediente "fruta", limpiar las frutas seleccionadas
      if (ingredientName.toLowerCase().includes('fruta') && !newIngredients.includes(ingredientName)) {
        setSelectedFruits([]);
      }

      return newIngredients;
    });
  };

  // Función para manejar la selección de frutas
  const handleFruitSelect = (fruitName: string) => {
    setSelectedFruits(prev => {
      return prev.includes(fruitName)
        ? prev.filter(fruit => fruit !== fruitName)
        : [...prev, fruitName];
    });
  };

  // Función para confirmar cambios en ingredientes
  const handleIngredientsConfirm = () => {
    if (!ingredientsModal.item || !ingredientsModal.originalProduct) return;

    const excludedIngredients: string[] = [];
    if (ingredientsModal.originalProduct.ingredients && Array.isArray(ingredientsModal.originalProduct.ingredients)) {
      ingredientsModal.originalProduct.ingredients.forEach((ingredient: any) => {
        const ingredientName = typeof ingredient === 'string' ? ingredient : ingredient.name;
        const isAvailable = typeof ingredient === 'string' ? true : (ingredient.available !== false);
        if (isAvailable && !selectedIngredients.includes(ingredientName)) {
          excludedIngredients.push(ingredientName);
        }
      });
    }

    // Verificar si el ingrediente "fruta" está seleccionado
    const hasFruitIngredient = selectedIngredients.some(ingredient => 
      ingredient.toLowerCase().includes('fruta')
    );

    // Validar que si el ingrediente "fruta" está seleccionado, debe haber al menos una fruta elegida
    if (hasFruitIngredient && selectedFruits.length === 0) {
      setShowFruitValidationError(true);
      showError('Debes seleccionar al menos una fruta');
      return;
    }
    setShowFruitValidationError(false);

    // Generar ID único basado en ingredientes excluidos y frutas seleccionadas
    let uniqueId = ingredientsModal.item.id;
    const finalSelectedFruits = hasFruitIngredient ? selectedFruits : [];

    if (excludedIngredients.length > 0 || finalSelectedFruits.length > 0) {
      const customParts = [];
      if (excludedIngredients.length > 0) {
        customParts.push(excludedIngredients.sort().join('_'));
      }
      if (finalSelectedFruits.length > 0) {
        customParts.push(`fruits_${finalSelectedFruits.sort().join('_').toLowerCase().replace(/\s+/g, '_')}`);
      }
      uniqueId = `${ingredientsModal.item.id}_custom_${customParts.join('_')}`;
    }

    // Asegurarse de que todos los ingredientes adicionales se guarden en el formato correcto
    const normalizedAdditionalIngredients = additionalIngredients.map((ing: any) => {
      if (typeof ing === 'string') {
        return { name: ing, category: 'dulce', available: true };
      } else if (ing && typeof ing === 'object' && ing.name) {
        return {
          name: ing.name,
          category: ing.category || 'dulce',
          available: ing.available !== false
        };
      }
      return null;
    }).filter((ing): ing is { name: string; category: string; available: boolean } => ing !== null);

    // Log para debug - verificar que se guarden todos los ingredientes adicionales
    console.log('🔍 Guardando ingredientes adicionales:', normalizedAdditionalIngredients.length, normalizedAdditionalIngredients.map(ing => ing.name));

    const updatedItem: OrderItem = {
      ...ingredientsModal.item,
      id: uniqueId,
      selectedIngredients: selectedIngredients,
      excludedIngredients: excludedIngredients,
      selectedFruits: finalSelectedFruits,
      additionalIngredients: normalizedAdditionalIngredients, // Guardar todos los ingredientes adicionales normalizados
    };

    // Verificar si el item actual ya tiene personalización
    const currentItemHasCustomization = 
      ingredientsModal.item.selectedIngredients || 
      ingredientsModal.item.excludedIngredients;

    // Calcular precio actualizado con ingredientes adicionales
    // El precio del item ya incluye el fee_togo si viene de una orden existente
    // Si hay 2 o más ingredientes adicionales, agregar $5 pesos
    const extraPrice = normalizedAdditionalIngredients.length >= 2 
      ? (ingredientsModal.originalProduct?.extraIngredientsPrice || 5)
      : 0;
    // Usar el precio del item directamente (ya incluye fee_togo si aplica)
    const updatedPrice = (ingredientsModal.item.price || 0) + extraPrice;

    const finalUpdatedItem: OrderItem = {
      ...updatedItem,
      price: updatedPrice,
      additionalIngredients: normalizedAdditionalIngredients, // Guardar todos los ingredientes adicionales normalizados
    };

    if (currentItemHasCustomization) {
      // Si ya tiene personalización, actualizar el item existente
      setOrderItems(prev =>
        prev.map(item =>
          item.id === ingredientsModal.item!.id ? finalUpdatedItem : item
        )
      );
    } else {
      // Si no tiene personalización, crear un nuevo item personalizado
      // Primero, reducir la cantidad del item original en 1
      setOrderItems(prev =>
        prev.map(item => {
          if (item.id === ingredientsModal.item!.id && item.quantity > 1) {
            return { ...item, quantity: item.quantity - 1 };
          } else if (item.id === ingredientsModal.item!.id && item.quantity === 1) {
            return null; // Eliminar el item original
          }
          return item;
        }).filter((item): item is OrderItem => item !== null)
      );

      // Luego, agregar el nuevo item personalizado
      setOrderItems(prev => [...prev, { ...finalUpdatedItem, quantity: 1 }]);
    }

    setIngredientsModal({ open: false, item: null, originalProduct: null });
    setSelectedIngredients([]);
    setSelectedFruits([]);
    setShowAllIngredients(false);
    setAdditionalIngredients([]);
    setShowFruitValidationError(false);
    
    // Actualizar el item en la orden
    setOrderItems(prev =>
      prev.map(item =>
        item.id === ingredientsModal.item!.id ? finalUpdatedItem : item
      )
    );
  };

  // Función para cancelar cambios en ingredientes
  const handleIngredientsCancel = () => {
    setIngredientsModal({ open: false, item: null, originalProduct: null });
    setSelectedIngredients([]);
    setSelectedFruits([]);
    setShowAllIngredients(false);
    setAdditionalIngredients([]);
    setShowFruitValidationError(false);
  };

  // Función para obtener ingredientes por categoría
  const getIngredientsByCategory = (category: string) => {
    if (!crepeIngredients || !Array.isArray(crepeIngredients)) {
      return [];
    }
    return crepeIngredients.filter(ingredient => ingredient.category === category);
  };

  // Función para manejar cambio de tab de ingredientes
  const handleIngredientsTabChange = (tabIndex: number) => {
    setIngredientsTab(tabIndex);
  };

  // Función para manejar toggle de ingredientes adicionales
  const handleAdditionalIngredientToggle = (ingredient: { name: string; category: string; available: boolean }) => {
    setAdditionalIngredients(prev => {
      const isSelected = prev.some(item => item.name === ingredient.name);
      if (isSelected) {
        return prev.filter(item => item.name !== ingredient.name);
      } else {
        return [...prev, ingredient];
      }
    });

    // Si es una fruta, también actualizar selectedFruits
    if (ingredient.category === 'fruta') {
      setSelectedFruits(prev => {
        const isSelected = prev.includes(ingredient.name);
        if (isSelected) {
          return prev.filter(fruit => fruit !== ingredient.name);
        } else {
          return [...prev, ingredient.name];
        }
      });
    }
  };

  // Función para verificar si un ingrediente está seleccionado
  const isIngredientSelected = (ingredient: { name: string; category: string; available: boolean }) => {
    // Para frutas, verificar en selectedFruits también
    if (ingredient.category === 'fruta') {
      return additionalIngredients.some(item => item.name === ingredient.name) || 
             selectedFruits.includes(ingredient.name);
    }
    return additionalIngredients.some(item => item.name === ingredient.name);
  };

  // Función para calcular el precio total del producto
  const calculateTotalPrice = () => {
    if (!ingredientsModal.item) return 0;
    
    // El precio del item ya incluye el fee_togo si viene de una orden existente
    // Solo necesitamos agregar el precio de ingredientes adicionales si hay más de uno
    let total = ingredientsModal.item.price || 0;
    
    // Si el precio es 0, intentar obtenerlo del producto original
    if (total === 0 && ingredientsModal.originalProduct) {
      total = (ingredientsModal.originalProduct as any).price || 
                  ingredientsModal.originalProduct.prices?.[0]?.price || 0;
    
      // Si es para llevar y es una crepa, agregar el fee_togo solo si no está incluido
    const takeoutPrice = ingredientsModal.item.fee_togo || 
                        (ingredientsModal.originalProduct as any)?.fee_togo || 0;
      if (isTakeout && takeoutPrice > 0 && (ingredientsModal.item.category === 'crepa' || ingredientsModal.item.category === 'crepas')) {
        total += takeoutPrice;
      }
    }
    
    // Agregar precio de ingredientes adicionales si hay más de uno
    const extraIngredientsPrice = ingredientsModal.originalProduct?.extraIngredientsPrice || 0;
    if (additionalIngredients.length > 1) {
      total += extraIngredientsPrice;
    }
    
    return total;
  };

  // Función para mostrar/ocultar todos los ingredientes
  const handleShowAllIngredients = async () => {
    if (showAllIngredients) {
      setShowAllIngredients(false);
    } else {
      // Cargar ingredientes y frutas desde la API si no están cargados
      if (crepeIngredients.length === 0 || crepeFruits.length === 0) {
        try {
          const [ingredientsResponse, fruitsResponse] = await Promise.all([
            ProductService.getCrepeIngredients(),
            ProductService.getCrepeFruits()
          ]);
          
          if (ingredientsResponse.success && ingredientsResponse.data) {
            setCrepeIngredients(ingredientsResponse.data);
          }
          
          if (fruitsResponse.success && fruitsResponse.data) {
            setCrepeFruits(fruitsResponse.data);
          }
        } catch (error: any) {
          console.error('Error loading ingredients:', error);
          showError('No se pudieron cargar los ingredientes');
        }
      }
      setShowAllIngredients(true);
    }
  };

  if (!isOpen) return null;

  const subCategories = getSubCategories();
  const currentProducts = getCurrentProducts();
  const isColdDrink = (product: any) => {
    const label = product.label || '';
    return label === 'fria' || label === 'frias';
  };

  return (
    <>
      <ToastComponent />
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
        presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.printButton,
                (orderItems.length === 0 || isPrinting) && styles.printButtonDisabled,
              ]}
              onPress={handlePrintOrder}
              disabled={orderItems.length === 0 || isPrinting}
            >
              {isPrinting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.printButtonText}>IMPRIMIR ORDEN</Text>
              )}
            </TouchableOpacity>

            <View style={styles.viewModeButtons}>
              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  viewMode === 'list' && styles.viewModeButtonActive,
                ]}
                onPress={() => setViewMode('list')}
              >
                <Text style={styles.viewModeIcon}>☰</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  viewMode === 'grid' && styles.viewModeButtonActive,
                ]}
                onPress={() => setViewMode('grid')}
              >
                <Text style={styles.viewModeIcon}>⊞</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.orderButton}
              onPress={() => setIsCartExpanded(!isCartExpanded)}
            >
              {getTotalItems() > 0 && (
                <View style={styles.orderBadge}>
                  <Text style={styles.orderBadgeText}>{getTotalItems()}</Text>
                </View>
              )}
              <Text style={styles.orderButtonIcon}>🛒</Text>
              <Text style={styles.orderButtonText}>ORDEN</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 0 && styles.tabActive]}
              onPress={() => {
                setActiveTab(0);
                const crepasCategories = Object.keys(crepasData);
                if (crepasCategories.length > 0) {
                  setSelectedSubCategory(crepasCategories[0]);
                }
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 0 && styles.tabTextActive,
                ]}
              >
                CREPAS
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 1 && styles.tabActive]}
              onPress={() => {
                setActiveTab(1);
                const bebidasCategories = Object.keys(bebidasData);
                if (bebidasCategories.length > 0) {
                  setSelectedSubCategory(bebidasCategories[0]);
                }
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 1 && styles.tabTextActive,
                ]}
              >
                BEBIDAS
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF9800" />
              <Text style={styles.loadingText}>Cargando productos...</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.content} 
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {viewMode === 'list' ? (
                // Vista con divisores por subcategoría
                <>
                  {activeTab === 0 && Object.entries(crepasData).map(([subcategory, items]) => (
                    <View key={subcategory} style={styles.categorySection}>
                      <Text style={styles.categoryTitle}>{subcategory}</Text>
                      <View style={styles.productsGrid}>
                        {items.map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.productCard}
                            onPress={() => !readOnly && addItemToOrder(item)}
                            disabled={readOnly}
                          >
                            <Text style={styles.productName} numberOfLines={2}>
                              {item.name}
                            </Text>
                            <Text style={styles.productPrice}>${item.price}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                  {activeTab === 1 && Object.entries(bebidasData).map(([subcategory, items]) => (
                    <View key={subcategory} style={styles.categorySection}>
                      <Text style={styles.categoryTitle}>{subcategory}</Text>
                      <View style={styles.productsGrid}>
                        {items.map((item) => {
                          const cardColor = getCardColor(item);
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={[
                                styles.productCard,
                                {
                                  backgroundColor: cardColor.backgroundColor,
                                  borderColor: cardColor.borderColor,
                                },
                              ]}
                              onPress={() => !readOnly && addItemToOrder(item)}
                              disabled={readOnly}
                            >
                              <Text
                                style={[
                                  styles.productName,
                                  { color: cardColor.textColor },
                                ]}
                                numberOfLines={2}
                              >
                                {item.name}
                              </Text>
                              <Text
                                style={[
                                  styles.productPrice,
                                  { color: cardColor.textColor === '#333' ? '#FF9800' : cardColor.textColor },
                                ]}
                              >
                                ${item.basePrice}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                // Vista con tabs de subcategorías
                <>
                  {subCategories.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.subCategoryTabs}
                    >
                      {subCategories.map((subCategory) => (
                        <TouchableOpacity
                          key={subCategory}
                          style={[
                            styles.subCategoryTab,
                            selectedSubCategory === subCategory &&
                              styles.subCategoryTabActive,
                          ]}
                          onPress={() => setSelectedSubCategory(subCategory)}
                        >
                          <Text
                            style={[
                              styles.subCategoryTabText,
                              selectedSubCategory === subCategory &&
                                styles.subCategoryTabTextActive,
                            ]}
                          >
                            {subCategory}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  <View style={styles.productsGrid}>
                    {currentProducts.map((item) => {
                      const price = activeTab === 0 ? item.price : item.basePrice;
                      const cardColor = getCardColor(item);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.productCard,
                            {
                              backgroundColor: cardColor.backgroundColor,
                              borderColor: cardColor.borderColor,
                            },
                          ]}
                          onPress={() => !readOnly && addItemToOrder(item)}
                          disabled={readOnly}
                        >
                          <Text
                            style={[
                              styles.productName,
                              { color: cardColor.textColor },
                            ]}
                            numberOfLines={2}
                          >
                            {item.name}
                          </Text>
                          <Text
                            style={[
                              styles.productPrice,
                              { color: cardColor.textColor === '#333' ? '#FF9800' : cardColor.textColor },
                            ]}
                          >
                            ${price}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>
          )}

        </View>

      {/* Order Summary Sidebar - Panel lateral */}
      {isCartExpanded && (
        <>
          <TouchableOpacity
            style={styles.sidebarOverlay}
            activeOpacity={1}
            onPress={() => setIsCartExpanded(false)}
          />
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarHeaderLeft}>
                <Text style={styles.sidebarIcon}>🍽️</Text>
                <View>
                  <Text style={styles.sidebarTitle}>
                    {tableInfo.mesa === 'PARA LLEVAR'
                      ? 'PARA LLEVAR'
                      : `MESA ${tableInfo.mesa}`}
                  </Text>
                  <Text style={styles.sidebarSubtitle}>
                    {orderName || 'Cliente General'}
                  </Text>
                </View>
              </View>
              <View style={styles.sidebarHeaderRight}>
                <Text style={styles.sidebarOrderNumber}>#{tableInfo.orden}</Text>
                <Text style={styles.sidebarTotal}>${getTotal().toFixed(2)}</Text>
              </View>
              <TouchableOpacity
                style={styles.sidebarCloseButton}
                onPress={() => setIsCartExpanded(false)}
              >
                <Text style={styles.sidebarCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.orderNameInput}
              placeholder="Nombre de la orden (opcional)"
              value={orderName}
              onChangeText={setOrderName}
              editable={!readOnly}
            />

            <ScrollView style={styles.orderItemsList}>
              {orderItems.length === 0 ? (
                <View style={styles.emptyOrderContainer}>
                  <Text style={styles.emptyOrderText}>
                    No hay items en la orden
                  </Text>
                  <Text style={styles.emptyOrderSubtext}>
                    Selecciona items de las categorías
                  </Text>
                </View>
              ) : (
                orderItems.map((item) => (
                  <View key={item.id} style={styles.orderItem}>
                    <View style={styles.orderItemHeader}>
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => !readOnly && item.category === 'crepa' && handleCrepeItemClick(item)}
                        disabled={readOnly || item.category !== 'crepa'}
                      >
                        <Text 
                          style={[
                            styles.orderItemName,
                            !readOnly && item.category === 'crepa' && styles.orderItemNameClickable,
                          ]} 
                          numberOfLines={2}
                        >
                          {item.name || ''}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.orderItemPrice}>
                        ${(item.price || 0).toFixed(2)}
                      </Text>
                    </View>
                    {/* Mostrar solo "sin:" para ingredientes esenciales no seleccionados */}
                    {item.excludedIngredients &&
                      item.excludedIngredients.length > 0 && (
                        <Text style={styles.orderItemDetail}>
                          sin: {(item.excludedIngredients || []).join(', ')}
                        </Text>
                      )}
                    {/* Mostrar solo "con:" para ingredientes adicionales */}
                    {(() => {
                      const additionalIngs = (item.additionalIngredients || []).map((ing: any) => {
                        if (typeof ing === 'string' && ing.trim() !== '') return ing;
                        if (ing && typeof ing === 'object' && ing.name && typeof ing.name === 'string' && ing.name.trim() !== '') return ing.name;
                        return null;
                      }).filter((name: string | null): name is string => name !== null && name !== undefined);
                      const fruits = (item.selectedFruits || [])
                        .map((fruit: any) => {
                          if (typeof fruit === 'string' && fruit.trim() !== '') return fruit;
                          if (fruit && typeof fruit === 'object' && fruit.name && typeof fruit.name === 'string' && fruit.name.trim() !== '') return fruit.name;
                          return null;
                        })
                        .filter((fruit: string | null): fruit is string => fruit !== null && fruit !== undefined && fruit.trim() !== '');
                      const allAdditional = [...additionalIngs, ...fruits].filter((ing: string | null | undefined): ing is string => {
                        return ing !== null && ing !== undefined && typeof ing === 'string' && ing.trim() !== '';
                      });
                      
                      if (allAdditional.length > 0) {
                        return (
                          <Text style={styles.orderItemDetailIngredient}>
                            con: {allAdditional.join(', ')}
                          </Text>
                        );
                      }
                      return null;
                    })()}
                    {item.additionalIngredients && item.additionalIngredients.length >= 2 && (
                      <Text style={styles.orderItemAdditionalCharge}>
                        Ingredientes adicionales (+$5.00)
                      </Text>
                    )}
                    {/* Mostrar opciones adicionales de bebidas */}
                    {item.category === 'bebida' && (() => {
                      const options: string[] = [];
                      if (item.deslactosado) options.push('Deslactosado');
                      if (item.sinAzucar) options.push('Sin Azúcar');
                      if (item.sinCremaBatida) options.push('Sin crema batida');
                      const displayText = (item.comments && item.comments.trim() !== '') ? item.comments : (options.length > 0 ? options.join(', ') : '');
                      return displayText && displayText.trim() !== '' ? (
                        <Text style={styles.orderItemDetailIngredient}>
                          {displayText}
                        </Text>
                      ) : null;
                    })()}
                    {/* Mostrar "Para llevar" si es orden para llevar global o si el item individual está marcado como "para llevar" */}
                    {((isTakeout && (item.takeoutFee || item.fee_togo) && (item.takeoutFee || item.fee_togo || 0) > 0) || 
                      (!isTakeout && item.itemTakeout && (item.takeoutFee || item.fee_togo || 0) > 0)) && (
                      <Text style={styles.orderItemTakeout}>
                        📦 Para llevar (+${(item.takeoutFee || item.fee_togo || 0).toFixed(2)})
                      </Text>
                    )}
                    <View style={styles.orderItemActions}>
                      {/* Botón para marcar item como "para llevar" (solo en órdenes de mesa) */}
                      {!isTakeout && item.category === 'crepa' && (
                        <TouchableOpacity
                          style={[
                            styles.itemTakeoutButton,
                            item.itemTakeout && styles.itemTakeoutButtonActive,
                          ]}
                          onPress={() => toggleItemTakeout(item.id)}
                          disabled={readOnly}
                        >
                          <Text style={[
                            styles.itemTakeoutButtonText,
                            item.itemTakeout && styles.itemTakeoutButtonTextActive,
                          ]}>
                            📦
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item.id, -1)}
                        disabled={readOnly}
                      >
                        <Text style={styles.quantityButtonText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.quantity || 0}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item.id, 1)}
                        disabled={readOnly}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.orderReadyButton,
                (orderItems.length === 0 || readOnly) && styles.orderReadyButtonDisabled,
              ]}
              onPress={handleOrderReady}
              disabled={orderItems.length === 0 || readOnly}
            >
              <Text style={styles.orderReadyButtonText}>
                {isEditMode ? 'GUARDAR CAMBIOS' : 'ORDEN LISTA'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

        {/* Drink Options Modal */}
        <Modal
          visible={drinkOptionsModal.open}
          transparent={true}
          animationType="fade"
          presentationStyle="overFullScreen"
          onRequestClose={() =>
            setDrinkOptionsModal({ open: false, drink: null })
          }
        >
          <View style={styles.drinkModalOverlay}>
            <View style={styles.drinkModalContent}>
              <Text style={styles.drinkModalTitle}>
                {drinkOptionsModal.drink?.name}
              </Text>
              <Text style={styles.drinkModalSubtitle}>
                Selecciona una opción:
              </Text>

              <View style={styles.priceOptionsContainer}>
                {(drinkOptionsModal.drink as any)?.priceOptions?.map((option: any, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.priceOptionButton,
                      selectedPriceOption === option.name &&
                        styles.priceOptionButtonActive,
                    ]}
                    onPress={() => setSelectedPriceOption(option.name)}
                  >
                    <Text
                      style={[
                        styles.priceOptionName,
                        selectedPriceOption === option.name &&
                          styles.priceOptionNameActive,
                      ]}
                    >
                      {option.name}
                    </Text>
                    <Text
                      style={[
                        styles.priceOptionPrice,
                        selectedPriceOption === option.name &&
                          styles.priceOptionPriceActive,
                      ]}
                    >
                      ${option.price}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {drinkOptionsModal.drink &&
                isColdDrink(drinkOptionsModal.drink as any) && (
                  <TouchableOpacity
                    style={[
                      styles.pearlsButton,
                      withPearls && styles.pearlsButtonActive,
                    ]}
                    onPress={() => setWithPearls(!withPearls)}
                  >
                    <Text
                      style={[
                        styles.pearlsButtonText,
                        withPearls && styles.pearlsButtonTextActive,
                      ]}
                    >
                      Con Perlas
                    </Text>
                    <Text
                      style={[
                        styles.pearlsButtonPrice,
                        withPearls && styles.pearlsButtonPriceActive,
                      ]}
                    >
                      +${(drinkOptionsModal.drink as any).pricePerlas || 5}
                    </Text>
                  </TouchableOpacity>
                )}

              {/* Opciones adicionales para frappés */}
              {drinkOptionsModal.drink &&
                isFrappe(drinkOptionsModal.drink as any) && (
                  <View style={styles.additionalOptionsContainer}>
                    <Text style={styles.additionalOptionsTitle}>
                      Opciones adicionales:
                    </Text>
                    <View style={styles.additionalOptionsRow}>
                      <TouchableOpacity
                        style={[
                          styles.additionalOptionButton,
                          deslactosado && styles.additionalOptionButtonActive,
                        ]}
                        onPress={() => setDeslactosado(!deslactosado)}
                      >
                        <Text
                          style={[
                            styles.additionalOptionText,
                            deslactosado && styles.additionalOptionTextActive,
                          ]}
                        >
                          Deslactosado
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.additionalOptionButton,
                          sinAzucar && styles.additionalOptionButtonActive,
                        ]}
                        onPress={() => setSinAzucar(!sinAzucar)}
                      >
                        <Text
                          style={[
                            styles.additionalOptionText,
                            sinAzucar && styles.additionalOptionTextActive,
                          ]}
                        >
                          Sin Azúcar
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.additionalOptionButton,
                          sinCremaBatida && styles.additionalOptionButtonActive,
                        ]}
                        onPress={() => setSinCremaBatida(!sinCremaBatida)}
                      >
                        <Text
                          style={[
                            styles.additionalOptionText,
                            sinCremaBatida && styles.additionalOptionTextActive,
                          ]}
                        >
                          Sin crema batida
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

              <View style={styles.drinkModalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setDrinkOptionsModal({ open: false, drink: null });
                    setSelectedPriceOption('');
                    setWithPearls(false);
                    setDeslactosado(false);
                    setSinAzucar(false);
                    setSinCremaBatida(false);
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalConfirmButton,
                    !selectedPriceOption && styles.modalConfirmButtonDisabled,
                  ]}
                  onPress={handleDrinkOptionsConfirm}
                  disabled={!selectedPriceOption}
                >
                  <Text style={styles.modalConfirmButtonText}>Agregar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Ingredients Modal */}
        <Modal
          visible={ingredientsModal.open}
          transparent={true}
          animationType="slide"
          presentationStyle="overFullScreen"
          onRequestClose={handleIngredientsCancel}
        >
          <View style={styles.ingredientsModalOverlay}>
            <View style={styles.ingredientsModalContent}>
              <View style={styles.ingredientsModalHeader}>
                <Text style={styles.ingredientsModalTitle}>
                  Personalizar {ingredientsModal.item?.name}
                </Text>
                <TouchableOpacity
                  style={styles.ingredientsModalCloseButton}
                  onPress={handleIngredientsCancel}
                >
                  <Text style={styles.ingredientsModalCloseButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.ingredientsModalScrollView} showsVerticalScrollIndicator={false}>
                {/* Botón para mostrar/ocultar todos los ingredientes */}
                <View style={styles.showIngredientsButtonContainer}>
                  <TouchableOpacity
                    style={styles.showIngredientsButton}
                    onPress={handleShowAllIngredients}
                  >
                    <Text style={styles.showIngredientsButtonText}>
                      {showAllIngredients ? '👁️ OCULTAR INGREDIENTES' : '👁️ MOSTRAR INGREDIENTES'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Ingredients Selection */}
                <View style={styles.ingredientsSection}>
                  <Text style={styles.ingredientsSectionTitle}>Ingredientes esenciales:</Text>
                  <View style={styles.ingredientsGrid}>
                    {ingredientsModal.originalProduct?.ingredients && 
                     Array.isArray(ingredientsModal.originalProduct.ingredients) &&
                     ingredientsModal.originalProduct.ingredients
                      .filter((ingredient: any) => {
                        const isAvailable = typeof ingredient === 'string' 
                          ? true 
                          : (ingredient.available !== false);
                        return isAvailable;
                      })
                      .map((ingredient: any, index: number) => {
                        const ingredientName = typeof ingredient === 'string' 
                          ? ingredient 
                          : ingredient.name;
                        const isSelected = selectedIngredients.includes(ingredientName);
                        
                        return (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.ingredientCheckboxItem,
                              isSelected && styles.ingredientCheckboxItemSelected,
                            ]}
                            onPress={() => handleIngredientToggle(ingredientName)}
                          >
                            <Text style={styles.ingredientCheckboxIcon}>
                              {isSelected ? '✓' : ''}
                            </Text>
                            <Text
                              style={[
                                styles.ingredientCheckboxText,
                                isSelected && styles.ingredientCheckboxTextSelected,
                              ]}
                            >
                              {ingredientName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                </View>

                {/* Sección de todos los ingredientes disponibles */}
                {showAllIngredients && (
                  <View style={styles.allIngredientsSection}>
                    <Text style={styles.allIngredientsTitle}>
                      Ingredientes adicionales:
                    </Text>
                    
                    {/* Tabs para categorías de ingredientes */}
                    <View style={styles.ingredientsTabsContainer}>
                      <TouchableOpacity
                        style={[
                          styles.ingredientsTab,
                          ingredientsTab === 0 && styles.ingredientsTabActive,
                        ]}
                        onPress={() => handleIngredientsTabChange(0)}
                      >
                        <Text style={[
                          styles.ingredientsTabText,
                          ingredientsTab === 0 && styles.ingredientsTabTextActive,
                        ]}>
                          Dulces ({getIngredientsByCategory('dulce').length})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.ingredientsTab,
                          ingredientsTab === 1 && styles.ingredientsTabActive,
                        ]}
                        onPress={() => handleIngredientsTabChange(1)}
                      >
                        <Text style={[
                          styles.ingredientsTabText,
                          ingredientsTab === 1 && styles.ingredientsTabTextActive,
                        ]}>
                          Salados ({getIngredientsByCategory('salado').length})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.ingredientsTab,
                          ingredientsTab === 2 && styles.ingredientsTabActive,
                        ]}
                        onPress={() => handleIngredientsTabChange(2)}
                      >
                        <Text style={[
                          styles.ingredientsTabText,
                          ingredientsTab === 2 && styles.ingredientsTabTextActive,
                        ]}>
                          Frutas ({crepeFruits.length})
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Contenido de ingredientes según el tab seleccionado */}
                    <ScrollView style={styles.allIngredientsScrollView} nestedScrollEnabled>
                      <View style={styles.allIngredientsChipsContainer}>
                        {ingredientsTab === 0 && getIngredientsByCategory('dulce').map((ingredient) => {
                          const isSelected = isIngredientSelected(ingredient);
                          return (
                            <TouchableOpacity
                              key={ingredient.name}
                              style={[
                                styles.ingredientChip,
                                isSelected && styles.ingredientChipSelected,
                                !ingredient.available && styles.ingredientChipUnavailable,
                              ]}
                              onPress={() => handleAdditionalIngredientToggle(ingredient)}
                            >
                              <Text style={[
                                styles.ingredientChipText,
                                isSelected && styles.ingredientChipTextSelected,
                                !ingredient.available && styles.ingredientChipTextUnavailable,
                              ]}>
                                {ingredient.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                        {ingredientsTab === 1 && getIngredientsByCategory('salado').map((ingredient) => {
                          const isSelected = isIngredientSelected(ingredient);
                          return (
                            <TouchableOpacity
                              key={ingredient.name}
                              style={[
                                styles.ingredientChip,
                                isSelected && styles.ingredientChipSelected,
                                !ingredient.available && styles.ingredientChipUnavailable,
                              ]}
                              onPress={() => handleAdditionalIngredientToggle(ingredient)}
                            >
                              <Text style={[
                                styles.ingredientChipText,
                                isSelected && styles.ingredientChipTextSelected,
                                !ingredient.available && styles.ingredientChipTextUnavailable,
                              ]}>
                                {ingredient.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                        {ingredientsTab === 2 && crepeFruits.map((fruit) => {
                          const isSelected = isIngredientSelected(fruit);
                          return (
                            <TouchableOpacity
                              key={fruit.name}
                              style={[
                                styles.ingredientChip,
                                isSelected && styles.ingredientChipSelected,
                                !fruit.available && styles.ingredientChipUnavailable,
                              ]}
                              onPress={() => handleAdditionalIngredientToggle(fruit)}
                            >
                              <Text style={[
                                styles.ingredientChipText,
                                isSelected && styles.ingredientChipTextSelected,
                                !fruit.available && styles.ingredientChipTextUnavailable,
                              ]}>
                                {fruit.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* Sección de ingredientes adicionales seleccionados */}
                {additionalIngredients.length > 0 && (
                  <View style={styles.additionalIngredientsSection}>
                    <Text style={styles.additionalIngredientsTitle}>
                      Ingredientes adicionales seleccionados:
                    </Text>
                    <View style={styles.additionalIngredientsContainer}>
                      {additionalIngredients.map((ingredient) => (
                        <TouchableOpacity
                          key={ingredient.name}
                          style={styles.additionalIngredientChip}
                          onPress={() => handleAdditionalIngredientToggle(ingredient)}
                        >
                          <Text style={styles.additionalIngredientChipText}>
                            {ingredient.name} ✕
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Mensaje de precio adicional por ingredientes */}
                {additionalIngredients.length > 1 && ingredientsModal.originalProduct?.extraIngredientsPrice && (
                  <View style={styles.extraPriceMessage}>
                    <Text style={styles.extraPriceMessageText}>
                      Precio adicional por más de un ingrediente adicional: ${ingredientsModal.originalProduct.extraIngredientsPrice}
                    </Text>
                  </View>
                )}


                {/* Mensaje de validación para frutas */}
                {showFruitValidationError && (
                  <Text style={styles.fruitValidationError}>
                    Debes seleccionar al menos una fruta
                  </Text>
                )}

                {/* Selected Ingredients Summary - Solo mostrar "sin:" y "con:" */}
                {(() => {
                  // Calcular ingredientes esenciales no seleccionados (excluidos)
                  const excludedEssentialIngredients: string[] = [];
                  if (ingredientsModal.originalProduct?.ingredients && Array.isArray(ingredientsModal.originalProduct.ingredients)) {
                    ingredientsModal.originalProduct.ingredients.forEach((ingredient: any) => {
                      const ingredientName = typeof ingredient === 'string' ? ingredient : ingredient.name;
                      const isAvailable = typeof ingredient === 'string' ? true : (ingredient.available !== false);
                      if (isAvailable && !selectedIngredients.includes(ingredientName)) {
                        excludedEssentialIngredients.push(ingredientName);
                      }
                    });
                  }
                  
                  // Calcular ingredientes adicionales seleccionados
                  const additionalIngs = additionalIngredients.map((ing: any) => {
                    if (typeof ing === 'string') return ing;
                    if (ing && typeof ing === 'object' && ing.name) return ing.name;
                    return null;
                  }).filter((name: string | null): name is string => name !== null && name !== undefined);
                  
                  const fruits = selectedFruits.filter((fruit: string) => fruit && fruit.trim() !== '');
                  const allAdditional = [...additionalIngs, ...fruits].filter((ing: string) => ing && ing.trim() !== '');
                  
                  // Solo mostrar si hay ingredientes esenciales excluidos o ingredientes adicionales
                  if (excludedEssentialIngredients.length > 0 || allAdditional.length > 0) {
                    return (
                      <View style={styles.selectedCustomizationSection}>
                        <Text style={styles.selectedCustomizationTitle}>
                          Personalización seleccionada:
                        </Text>
                        {excludedEssentialIngredients.length > 0 && (
                          <Text style={styles.selectedCustomizationText}>
                            <Text style={styles.selectedCustomizationBold}>sin: </Text>
                            <Text>{excludedEssentialIngredients.join(', ')}</Text>
                          </Text>
                        )}
                        {allAdditional.length > 0 && (
                          <Text style={styles.selectedCustomizationText}>
                            <Text style={styles.selectedCustomizationBold}>con: </Text>
                            <Text>{allAdditional.join(', ')}</Text>
                          </Text>
                        )}
                      </View>
                    );
                  }
                  return null;
                })()}
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.ingredientsModalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButtonIngredients}
                  onPress={handleIngredientsCancel}
                >
                  <Text style={styles.modalCancelButtonText}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleIngredientsConfirm}
                >
                  <Text style={styles.modalConfirmButtonText}>CONFIRMAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  printButton: {
    backgroundColor: '#666',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  printButtonDisabled: {
    backgroundColor: '#ccc',
  },
  printButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  viewModeButtons: {
    flexDirection: 'row',
  },
  viewModeButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginLeft: 4,
  },
  viewModeButtonActive: {
    backgroundColor: '#FF9800',
  },
  viewModeIcon: {
    fontSize: 16,
    color: '#FF9800',
  },
  orderButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  orderButtonIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 1,
  },
  orderBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#FF9800',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#FF9800',
    fontWeight: 'bold',
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
  content: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  contentContainer: {
    padding: 8,
  },
  subCategoryTabs: {
    maxHeight: 50,
    marginBottom: 8,
  },
  subCategoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  subCategoryTabActive: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  subCategoryTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  subCategoryTabTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  categorySection: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: (width - 48) / 4,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    fontSize: 11,
    fontWeight: 'normal',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9800',
    textAlign: 'center',
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '85%',
    height: '100%',
    backgroundColor: '#fff',
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: {
      width: -4,
      height: 0,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    flexDirection: 'column',
  },
  sidebarHeader: {
    backgroundColor: '#2c2c2c',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    paddingRight: 48, // Space for close button
  },
  sidebarCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarCloseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sidebarHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sidebarIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sidebarTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  sidebarSubtitle: {
    fontSize: 11,
    color: '#ccc',
  },
  sidebarHeaderRight: {
    alignItems: 'flex-end',
  },
  sidebarOrderNumber: {
    fontSize: 11,
    color: '#ccc',
  },
  sidebarTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  orderNameInput: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    fontSize: 14,
    color: '#333',
  },
  orderItemsList: {
    flex: 1,
    padding: 8,
  },
  emptyOrderContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyOrderText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  emptyOrderSubtext: {
    fontSize: 12,
    color: '#ccc',
  },
  orderItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  orderItemNameClickable: {
    color: '#FF9800',
    textDecorationLine: 'underline',
  },
  orderItemPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  orderItemDetail: {
    fontSize: 10,
    color: '#d32f2f',
    marginBottom: 2,
  },
  orderItemDetailIngredient: {
    fontSize: 10,
    color: '#4CAF50',
    marginBottom: 2,
    fontWeight: '500',
  },
  orderItemDetailFruit: {
    fontSize: 10,
    color: '#4CAF50',
    marginBottom: 2,
  },
  orderItemAdditionalCharge: {
    fontSize: 10,
    color: '#FF9800',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  orderItemTakeout: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  orderItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemTakeoutButton: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  itemTakeoutButtonActive: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  itemTakeoutButtonText: {
    fontSize: 16,
  },
  itemTakeoutButtonTextActive: {
    color: '#fff',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 20,
    textAlign: 'center',
  },
  orderReadyButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    alignItems: 'center',
    borderRadius: 6,
    margin: 8,
  },
  orderReadyButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  orderReadyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  drinkModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drinkModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  drinkModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  drinkModalSubtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 16,
  },
  priceOptionsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  priceOptionButton: {
    flex: 1,
    minWidth: 80,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'transparent',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  priceOptionButtonActive: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  priceOptionName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  priceOptionNameActive: {
    color: '#fff',
  },
  priceOptionPrice: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
  },
  priceOptionPriceActive: {
    color: '#fff',
  },
  pearlsButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  pearlsButtonActive: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  pearlsButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  pearlsButtonTextActive: {
    color: '#fff',
  },
  pearlsButtonPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  pearlsButtonPriceActive: {
    color: '#fff',
  },
  additionalOptionsContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  additionalOptionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  additionalOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  additionalOptionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'transparent',
  },
  additionalOptionButtonActive: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  additionalOptionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  additionalOptionTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  drinkModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 8,
  },
  modalCancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modalConfirmButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  modalConfirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalConfirmButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  ingredientsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ingredientsModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  ingredientsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ingredientsModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  ingredientsModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ingredientsModalCloseButtonText: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  ingredientsModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  ingredientsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  ingredientItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  ingredientItemSelected: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  ingredientItemText: {
    fontSize: 14,
    color: '#333',
  },
  ingredientItemTextSelected: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  fruitsSection: {
    marginBottom: 16,
  },
  fruitsSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  fruitsContainer: {
    flexDirection: 'row',
  },
  fruitChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  fruitChipSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  fruitChipText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  fruitChipTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  ingredientsModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalCancelButtonIngredients: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 8,
  },
  ingredientsModalScrollView: {
    maxHeight: 400,
    marginBottom: 16,
  },
  showIngredientsButtonContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  showIngredientsButton: {
    borderWidth: 1,
    borderColor: '#FF9800',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  showIngredientsButtonText: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  ingredientsSection: {
    marginBottom: 12,
  },
  ingredientsSectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
  },
  ingredientsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  ingredientCheckboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    padding: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: '2%',
    marginBottom: 6,
  },
  ingredientCheckboxItemSelected: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  ingredientCheckboxIcon: {
    fontSize: 14,
    color: '#FF9800',
    marginRight: 6,
    width: 18,
    textAlign: 'center',
  },
  ingredientCheckboxText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  ingredientCheckboxTextSelected: {
    color: '#FF9800',
  },
  allIngredientsSection: {
    marginBottom: 16,
  },
  allIngredientsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 12,
  },
  ingredientsTabsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  ingredientsTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  ingredientsTabActive: {
    borderBottomColor: '#FF9800',
  },
  ingredientsTabText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#666',
  },
  ingredientsTabTextActive: {
    color: '#FF9800',
  },
  allIngredientsScrollView: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    backgroundColor: '#fafafa',
    padding: 8,
  },
  allIngredientsChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  ingredientChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
    marginRight: 8,
    marginBottom: 8,
  },
  ingredientChipSelected: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  ingredientChipUnavailable: {
    borderColor: '#f44336',
    backgroundColor: '#FFEBEE',
  },
  ingredientChipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  ingredientChipTextSelected: {
    color: '#fff',
  },
  ingredientChipTextUnavailable: {
    color: '#f44336',
  },
  additionalIngredientsSection: {
    marginBottom: 16,
  },
  additionalIngredientsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 8,
  },
  additionalIngredientsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 4,
    backgroundColor: '#FFF3E0',
  },
  additionalIngredientChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FF9800',
    marginRight: 8,
    marginBottom: 8,
  },
  additionalIngredientChipText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  extraPriceMessage: {
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 4,
    marginBottom: 16,
  },
  extraPriceMessageText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#E65100',
    textAlign: 'center',
  },
  priceBreakdown: {
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 16,
  },
  priceBreakdownTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  priceBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  priceBreakdownLabel: {
    fontSize: 12,
    color: '#666',
  },
  priceBreakdownValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  priceBreakdownValueOrange: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  priceBreakdownDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  priceBreakdownTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  priceBreakdownTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  fruitValidationError: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  selectedCustomizationSection: {
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    marginBottom: 16,
  },
  selectedCustomizationTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  selectedCustomizationText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  selectedCustomizationBold: {
    fontWeight: 'bold',
  },
});

export default OrderCreation;

