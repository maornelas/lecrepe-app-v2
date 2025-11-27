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
} from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';
import { ProductService, Product } from '../services/productService';
import { OrderLecrepeService } from '../services/orderLecrepeService';
import { StorageService } from '../services/storageService';
import { useBluetooth } from '../contexts/BluetoothContext';
import { Order } from '../types';

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
  takeoutFee?: number;
  fee_togo?: number;
  originalProduct?: Product;
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
      }
    } else {
      setIsCartExpanded(false);
    }
  }, [isOpen, isEditMode, editingOrder]);
  
  useEffect(() => {
    // Actualizar subcategoría cuando cambian los datos
    if (Object.keys(crepasData).length > 0 || Object.keys(bebidasData).length > 0) {
      const subCategories = activeTab === 0 
        ? Object.keys(crepasData)
        : Object.keys(bebidasData);
      if (subCategories.length > 0 && (!selectedSubCategory || !subCategories.includes(selectedSubCategory))) {
        setSelectedSubCategory(subCategories[0]);
      }
    }
  }, [crepasData, bebidasData, activeTab]);

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
        
        // Si estamos en modo de edición, inicializar después de cargar productos
        if (isEditMode && editingOrder) {
          initializeEditMode();
        }
      }
    } catch (error: any) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const initializeEditMode = () => {
    if (editingOrder) {
      setOrderName(editingOrder.name || '');
      const items: OrderItem[] = (editingOrder.items || editingOrder.products || []).map(
        (item, index) => ({
          id: item._id || `item_${index}`,
          name: item.product_name || item.name || '',
          price: item.type_price || 0,
          quantity: item.units || 1,
          category: item.type || 'crepa',
          option: item.size || 'Regular',
          selectedIngredients: item.toppings?.map((t: any) => t.name) || [],
          takeoutFee: isTakeout && (item.type === 'crepa') ? 5 : 0,
        })
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

    const itemName = withPearls
      ? `${drink.name} - ${selectedPriceOption} con Perlas`
      : `${drink.name} - ${selectedPriceOption}`;

    const newItem: OrderItem = {
      id: `${drink.id}_${selectedPriceOption.replace(/\s+/g, '_')}`,
      name: itemName,
      price: finalPrice,
      quantity: 1,
      category: 'bebida',
      option: selectedPriceOption,
    };

    setOrderItems((prev) => [...prev, newItem]);
    setDrinkOptionsModal({ open: false, drink: null });
    setSelectedPriceOption('');
    setWithPearls(false);
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
    return orderItems.reduce((total, item) => {
      const itemPrice = item.price + (item.takeoutFee || 0);
      return total + itemPrice * item.quantity;
    }, 0);
  };

  const getTotalItems = (): number => {
    return orderItems.reduce((total, item) => total + item.quantity, 0);
  };

  const handleOrderReady = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Error', 'Agrega al menos un producto a la orden');
      return;
    }

    try {
      const idStore = await StorageService.getItem('idStore');
      if (!idStore) {
        Alert.alert('Error', 'No se encontró el ID de la tienda');
        return;
      }

      // Calcular total incluyendo para llevar
      const total = getTotal();
      const crepasCount = orderItems.filter(item => item.category === 'crepa').reduce((sum, item) => sum + item.quantity, 0);
      const totalParaLlevar = isTakeout ? crepasCount * 10 : 0; // TOGO_PRICE = 10
      const finalTotal = total + totalParaLlevar;

      // Preparar datos de la orden similar a lecrepe-front
      const orderData: any = {
        id_store: parseInt(idStore),
        id_place: tableInfo.mesa === 'PARA LLEVAR' || tableInfo.mesa === 'NUEVA ORDEN' ? 0 : parseInt(String(tableInfo.mesa)) || 0,
        togo: isTakeout,
        status: isEditMode && editingOrder ? editingOrder.status : 'Pendiente',
        client: {
          name: orderName || 'Cliente General',
          phone: (editingOrder?.client as any)?.phone || '',
          email: (editingOrder?.client as any)?.email || '',
        },
        payment: {
          method: (editingOrder?.payment as any)?.method || 'Efectivo',
          amount: finalTotal,
          url_ticket: (editingOrder?.payment as any)?.url_ticket || '',
        },
        items: orderItems.map((item) => ({
          type: item.category || (activeTab === 0 ? 'crepa' : 'bebida'),
          name: item.name,
          size: item.option || 'Regular',
          price: item.price + (item.takeoutFee || 0), // Incluir takeoutFee en el precio
          units: item.quantity,
          toppings: item.selectedIngredients ? item.selectedIngredients.map((ingredient) => ({
            name: ingredient,
            price: 0,
            selected: true,
          })) : [],
          comments: '',
          url: '',
        })),
        attended_by: (editingOrder as any)?.attended_by || 'Sistema',
        comments: (editingOrder as any)?.comments || '',
        name: orderName || `Orden ${tableInfo.orden}`,
        products: orderItems, // Mantener productos originales
        date: isEditMode && editingOrder ? editingOrder.date : new Date().toISOString(),
        total: finalTotal,
        subtotal: finalTotal * 0.84,
        tax: finalTotal * 0.16,
        service_charge: isTakeout ? (crepasCount * 10) : 0,
      };

      if (isEditMode && onSave && editingOrder) {
        // Modo edición: llamar a onSave
        await onSave(orderData);
        Alert.alert('Éxito', 'Orden actualizada exitosamente');
        resetOrder();
        onClose();
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
          Alert.alert('Éxito', 'Orden creada exitosamente');
          
          // Si onSave está definido (desde OrdenesScreen), llamarlo para actualizar el estado
          if (onSave) {
            const createdOrder = response.data || {};
            await onSave({
              ...createdOrder,
              id_order: createdOrder.id_order || createdOrder._id || (createdOrder as any).id,
              total: createdOrder.total || finalTotal,
              status: createdOrder.status || 'Pendiente',
            } as Partial<Order>);
          }
          
          // Limpiar orden y cerrar modal después de un breve delay
          setTimeout(() => {
            resetOrder();
            onClose();
          }, 1000);
        } else {
          console.error('🔍 DEBUG OrderCreation - Error creating order:', response);
          Alert.alert('Error', 'No se pudo crear la orden');
        }
      }
    } catch (error: any) {
      console.error('Error processing order:', error);
      Alert.alert('Error', `No se pudo procesar la orden: ${error.message || 'Error desconocido'}`);
    }
  };

  const handlePrintOrder = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Aviso', 'No hay items en la orden para imprimir');
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
        Alert.alert('Error', 'Por favor configura la impresora en Configuración');
        setIsPrinting(false);
        return;
      }

      if (useBluetooth && !bluetoothDevice) {
        Alert.alert('Error', 'Por favor conecta un dispositivo Bluetooth en Configuración');
        setIsPrinting(false);
        return;
      }

      // Constante para precio de para llevar
      const TOGO_PRICE = 10; // Ajusta este valor según tu configuración
      // Ajustado para impresora de 58mm (32 caracteres por línea) o 80mm
      const anchoCantidad = isBluetoothEnabled ? 4 : 6; // Ancho para cantidad (58mm: 4, 80mm: 6)
      const anchoDescripcion = isBluetoothEnabled ? 18 : 28; // Ancho para descripción (58mm: 18, 80mm: 28)
      const anchoPrecio = isBluetoothEnabled ? 8 : 11; // Ancho para precio (58mm: 8, 80mm: 11)

      // Comandos ESC/POS
      const ESC = '\x1B';
      const centerText = ESC + 'a' + '\x01'; // Centrar
      const leftAlign = ESC + 'a' + '\x00'; // Izquierda
      const resetFormat = ESC + '@'; // Reset
      const lineFeed = '\n';
      const doubleSizeBold = ESC + '!' + '\x38'; // Doble tamaño y negritas
      const normalSize = ESC + '!' + '\x00'; // Tamaño normal

      // Generar encabezado
      const header = resetFormat + centerText + 
                     doubleSizeBold + 'LECREPE' + normalSize;

      let salida = "";
      let total = 0;
      let totalParaLlevar = 0;

      // Procesar productos
      orderItems.forEach(item => {
        const cantidad = item.quantity.toString().padEnd(anchoCantidad);
        let productDesc = item.name;
        
        // Agregar opción si existe (tamaño de bebida)
        if (item.option) {
          productDesc += ` ${item.option}`;
        }
        
        // Agregar ingredientes excluidos si existen
        if (item.excludedIngredients && item.excludedIngredients.length > 0) {
          productDesc += ` (sin ${item.excludedIngredients.join(', ')})`;
        }
        
        // Agregar frutas seleccionadas si existen
        if (item.selectedFruits && item.selectedFruits.length > 0) {
          productDesc += ` (${item.selectedFruits.join(', ')})`;
        }
        
        const descripcion = productDesc.substring(0, anchoDescripcion).padEnd(anchoDescripcion);
        const precio = `$${(item.price * item.quantity).toFixed(2)}`.padStart(anchoPrecio);
        salida += `${cantidad}${descripcion}${precio}${lineFeed}`;

        // Calcular total del producto
        total += item.price * item.quantity;

        // Calcular para llevar si es crepa
        if (isTakeout && item.category === 'crepa' && item.takeoutFee) {
          totalParaLlevar += item.takeoutFee * item.quantity;
        }
      });

      // Si no se calculó para llevar por item, calcular por cantidad de crepas
      if (isTakeout && totalParaLlevar === 0) {
        const crepasCount = orderItems.filter(item => item.category === 'crepa').reduce((sum, item) => sum + item.quantity, 0);
        totalParaLlevar = crepasCount * TOGO_PRICE;
      }

      // Generar ticket - Ajustado para 58mm o 80mm según el tipo de conexión
      const separator = isBluetoothEnabled ? '--------------------------------' : '---------------------------------------------';
      const orderNameLine = isBluetoothEnabled 
        ? `Nombre: ${orderName.length > 30 ? orderName.substring(0, 27) + '...' : orderName || 'Cliente General'}\n`
        : `Nombre Orden: ${orderName || 'Cliente General'}\n`;
      const headerLine = isBluetoothEnabled 
        ? 'CANT DESCRIPCION      TOTAL\n'
        : 'CANT   DESCRIPCION                  TOTAL\n';
      
      const ticketContent = resetFormat + 
        header + lineFeed + // LECREPE en grande y negritas
        centerText + `
-- LECREPE  --
CD. MANUEL DOBLADO
Tel: 432-100-4990
` + leftAlign + `
${separator}
Fecha: ${new Date().toLocaleDateString()}  
Hora: ${new Date().toLocaleTimeString()}
Orden No: ${tableInfo?.orden || 0}
${isTakeout ? 'PARA LLEVAR' : `MESA ${tableInfo?.mesa || ''}`}
${orderNameLine}${separator}
${headerLine}${separator}
${salida}
${separator}
SUBTOTAL:            ${isBluetoothEnabled ? '' : '\t\t'}$${total.toFixed(2)}
${totalParaLlevar > 0 ? `PARA LLEVAR:         ${isBluetoothEnabled ? '' : '\t\t'}$${totalParaLlevar.toFixed(2)}\n` : ''}${separator}
TOTAL A PAGAR:        ${isBluetoothEnabled ? '' : '\t\t'}$${(total+totalParaLlevar).toFixed(2)}
${separator}
` + centerText + `
        GRACIAS POR TU COMPRA
        VUELVE PRONTO :)
` + leftAlign + `
${separator}

${'\n'.repeat(isBluetoothEnabled ? 5 : 10)}
` + resetFormat;

      // Usar Bluetooth o TCP según la configuración
      if (isBluetoothEnabled && bluetoothDevice) {
        try {
          await sendToBluetooth(ticketContent);
          setIsPrinting(false);
          Alert.alert('Éxito', `Orden #${tableInfo?.orden || 0} enviada a impresora Bluetooth`);
        } catch (error: any) {
          setIsPrinting(false);
          Alert.alert('Error', 'Error al enviar a impresora Bluetooth: ' + (error.message || 'Error desconocido'));
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
                Alert.alert('Éxito', `Orden #${tableInfo?.orden || 0} enviada a impresora`);
              }, 500);
            } catch (error: any) {
              client.destroy();
              setIsPrinting(false);
              Alert.alert('Error', 'Error al enviar datos: ' + error.message);
            }
          }
        );

        client.on('error', (error: any) => {
          client.destroy();
          setIsPrinting(false);
          Alert.alert(
            'Error de conexión',
            'No se pudo conectar a la impresora.\n\nVerifica:\n- IP correcta: ' + printerIP + '\n- Puerto: ' + printerPort + '\n- Que la tablet esté en la misma red WiFi'
          );
        });

        client.on('close', () => {
          setIsPrinting(false);
        });

        setTimeout(() => {
          if (client && !client.destroyed) {
            client.destroy();
            setIsPrinting(false);
            Alert.alert('Timeout', 'La impresora no respondió. Verifica la conexión.');
          }
        }, 10000);
      }
    } catch (error: any) {
      setIsPrinting(false);
      Alert.alert('Error', 'Error al imprimir: ' + (error.message || 'Error desconocido'));
    }
  };

  // Función para manejar clic en items de crepa en el sidebar
  const handleCrepeItemClick = (item: OrderItem) => {
    if (readOnly) return;
    
    // Solo permitir para crepas
    if (item.category !== 'crepa') return;

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

      setSelectedIngredients(ingredientsToSelect);
      setSelectedFruits(fruitsToSelect);

      setIngredientsModal({
        open: true,
        item: item,
        originalProduct: originalProduct,
      });
    } else {
      Alert.alert('Error', 'No se pudo encontrar el producto original');
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
      Alert.alert('Error', 'Debes seleccionar al menos una fruta');
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

    const updatedItem: OrderItem = {
      ...ingredientsModal.item,
      id: uniqueId,
      selectedIngredients: selectedIngredients,
      excludedIngredients: excludedIngredients,
      selectedFruits: finalSelectedFruits,
    };

    // Verificar si el item actual ya tiene personalización
    const currentItemHasCustomization = 
      ingredientsModal.item.selectedIngredients || 
      ingredientsModal.item.excludedIngredients;

    if (currentItemHasCustomization) {
      // Si ya tiene personalización, actualizar el item existente
      setOrderItems(prev =>
        prev.map(item =>
          item.id === ingredientsModal.item!.id ? updatedItem : item
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
      setOrderItems(prev => [...prev, { ...updatedItem, quantity: 1 }]);
    }

    // Calcular precio actualizado con ingredientes adicionales
    const extraPrice = additionalIngredients.length > 1 
      ? (ingredientsModal.originalProduct?.extraIngredientsPrice || 0)
      : 0;
    const updatedPrice = (ingredientsModal.item.price || 0) + extraPrice;

    const finalUpdatedItem: OrderItem = {
      ...updatedItem,
      price: updatedPrice,
    };

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
    
    // Obtener precio base del item o del originalProduct si no está disponible
    let basePrice = ingredientsModal.item.price || 0;
    if (basePrice === 0 && ingredientsModal.originalProduct) {
      // Si el precio del item es 0, obtenerlo del producto original
      basePrice = (ingredientsModal.originalProduct as any).price || 
                  ingredientsModal.originalProduct.prices?.[0]?.price || 0;
    }
    
    const extraIngredientsPrice = ingredientsModal.originalProduct?.extraIngredientsPrice || 0;
    // Obtener fee_togo del item o del originalProduct
    const takeoutPrice = ingredientsModal.item.fee_togo || 
                        (ingredientsModal.originalProduct as any)?.fee_togo || 0;
    
    let total = basePrice;
    
    // Si hay más de un ingrediente adicional, agregar el precio extra
    if (additionalIngredients.length > 1) {
      total += extraIngredientsPrice;
    }
    
    // Si es para llevar, agregar el precio para llevar
    if (isTakeout && takeoutPrice > 0) {
      total += takeoutPrice;
    }
    
    return total;
  };

  // Función para mostrar/ocultar todos los ingredientes
  const handleShowAllIngredients = () => {
    if (showAllIngredients) {
      setShowAllIngredients(false);
    } else {
      // Por ahora, usar datos hardcodeados. Se pueden obtener de API después
      if (crepeIngredients.length === 0) {
        // Datos de ejemplo - se pueden obtener de API
        setCrepeIngredients([
          { name: 'Cajeta', category: 'dulce', available: true },
          { name: 'Nuez', category: 'dulce', available: true },
          { name: 'Almendra', category: 'dulce', available: true },
          { name: 'Miel', category: 'dulce', available: true },
          { name: 'Chocolate', category: 'dulce', available: true },
          { name: 'Queso', category: 'salado', available: true },
          { name: 'Jamón', category: 'salado', available: true },
          { name: 'Pollo', category: 'salado', available: true },
        ]);
      }
      if (crepeFruits.length === 0) {
        setCrepeFruits([
          { name: 'Fresa', category: 'fruta', available: true },
          { name: 'Plátano', category: 'fruta', available: true },
          { name: 'Durazno', category: 'fruta', available: true },
          { name: 'Mango', category: 'fruta', available: true },
          { name: 'Kiwi', category: 'fruta', available: true },
        ]);
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
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
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
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.orderItemPrice}>
                        ${(item.price + (item.takeoutFee || 0)).toFixed(2)}
                      </Text>
                    </View>
                    {item.excludedIngredients &&
                      item.excludedIngredients.length > 0 && (
                        <Text style={styles.orderItemDetail}>
                          sin {item.excludedIngredients.join(', ')}
                        </Text>
                      )}
                    {item.selectedFruits && item.selectedFruits.length > 0 && (
                      <Text style={styles.orderItemDetailFruit}>
                        con {item.selectedFruits.join(', ')}
                      </Text>
                    )}
                    {isTakeout && item.takeoutFee && item.takeoutFee > 0 && (
                      <Text style={styles.orderItemTakeout}>
                        📦 Para llevar (+${item.takeoutFee})
                      </Text>
                    )}
                    <View style={styles.orderItemActions}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateQuantity(item.id, -1)}
                        disabled={readOnly}
                      >
                        <Text style={styles.quantityButtonText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
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

              <View style={styles.drinkModalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() =>
                    setDrinkOptionsModal({ open: false, drink: null })
                  }
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
                  <Text style={styles.ingredientsSectionTitle}>Ingredientes disponibles:</Text>
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
                      Todos los ingredientes disponibles en crepas:
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

                {/* Desglose de precios */}
                {ingredientsModal.item && (() => {
                  // Obtener precio base del item o del originalProduct si no está disponible
                  let basePrice = ingredientsModal.item.price || 0;
                  if (basePrice === 0 && ingredientsModal.originalProduct) {
                    basePrice = (ingredientsModal.originalProduct as any).price || 
                                ingredientsModal.originalProduct.prices?.[0]?.price || 0;
                  }
                  
                  // Obtener fee_togo del item o del originalProduct
                  const takeoutPrice = ingredientsModal.item.fee_togo || 
                                      (ingredientsModal.originalProduct as any)?.fee_togo || 0;
                  
                  return (
                    <View style={styles.priceBreakdown}>
                      <Text style={styles.priceBreakdownTitle}>Desglose de precios:</Text>
                      <View style={styles.priceBreakdownRow}>
                        <Text style={styles.priceBreakdownLabel}>Precio base:</Text>
                        <Text style={styles.priceBreakdownValue}>${basePrice}</Text>
                      </View>
                      {additionalIngredients.length > 1 && ingredientsModal.originalProduct?.extraIngredientsPrice && ingredientsModal.originalProduct.extraIngredientsPrice > 0 && (
                        <View style={styles.priceBreakdownRow}>
                          <Text style={styles.priceBreakdownLabel}>Ingredientes adicionales:</Text>
                          <Text style={styles.priceBreakdownValueOrange}>
                            +${ingredientsModal.originalProduct.extraIngredientsPrice}
                          </Text>
                        </View>
                      )}
                      {isTakeout && ingredientsModal.item?.type === 'crepa' && takeoutPrice > 0 && (
                        <View style={styles.priceBreakdownRow}>
                          <Text style={styles.priceBreakdownLabel}>Precio para llevar:</Text>
                          <Text style={styles.priceBreakdownValueOrange}>
                            +${takeoutPrice}
                          </Text>
                        </View>
                      )}
                      <View style={styles.priceBreakdownDivider} />
                      <View style={styles.priceBreakdownRow}>
                        <Text style={styles.priceBreakdownTotalLabel}>Total:</Text>
                        <Text style={styles.priceBreakdownTotalValue}>
                          ${calculateTotalPrice()}
                        </Text>
                      </View>
                    </View>
                  );
                })()}

                {/* Mensaje de validación para frutas */}
                {showFruitValidationError && (
                  <Text style={styles.fruitValidationError}>
                    Debes seleccionar al menos una fruta
                  </Text>
                )}

                {/* Selected Ingredients Summary */}
                {(selectedIngredients.length > 0 || (selectedFruits.length > 0 && selectedIngredients.some(ingredient => ingredient.toLowerCase().includes('fruta')))) && (
                  <View style={styles.selectedCustomizationSection}>
                    <Text style={styles.selectedCustomizationTitle}>
                      Personalización seleccionada:
                    </Text>
                    {selectedIngredients.length > 0 && (
                      <Text style={styles.selectedCustomizationText}>
                        <Text style={styles.selectedCustomizationBold}>Ingredientes: </Text>
                        <Text>{selectedIngredients.join(', ')}</Text>
                      </Text>
                    )}
                    {selectedFruits.length > 0 && selectedIngredients.some(ingredient => ingredient.toLowerCase().includes('fruta')) && (
                      <Text style={styles.selectedCustomizationText}>
                        <Text style={styles.selectedCustomizationBold}>Frutas: </Text>
                        <Text>{selectedFruits.join(', ')}</Text>
                      </Text>
                    )}
                  </View>
                )}
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
  orderItemDetailFruit: {
    fontSize: 10,
    color: '#4CAF50',
    marginBottom: 2,
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

