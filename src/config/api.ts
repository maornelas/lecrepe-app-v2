// API Configuration
export const API_BASE_URL = 'https://api-tepozan.ketxal.com:81/v1.0';

export const API_ENDPOINTS = {
  // Store endpoints
  GET_STORE_BY_ID: (id: string | number) => `${API_BASE_URL}/store/get/${id}`,
  UPDATE_STORE: (id: string | number) => `${API_BASE_URL}/store/update/${id}`,
  
  // Order endpoints
  GET_ORDERS_BY_STORE: (id_store: string | number) => `${API_BASE_URL}/order/get/store/${id_store}`,
  GET_CLOSED_ORDERS_BY_STORE: (id_store: string | number) => `${API_BASE_URL}/order/getClosed/store/${id_store}`,
  CREATE_ORDER: `${API_BASE_URL}/order/create/`,
  UPDATE_ORDER: (id: string | number) => `${API_BASE_URL}/order/update/${id}`,
  
  // User endpoints
  LOGIN_USER: (nip: string, id_store: string | number) => `${API_BASE_URL}/member/login/${nip}/${id_store}`,
  
  // Historic endpoints
  GET_ORDERS_HISTORIC: `${API_BASE_URL}/order/historic`,
  
  // Order Lecrepe endpoints
  GET_ALL_ORDERS_LECREPE: (storeId?: string | number) => 
    storeId ? `${API_BASE_URL}/order_lecrepe/get?store_id=${storeId}` : `${API_BASE_URL}/order_lecrepe/get`,
  GET_ORDER_LECREPE_BY_ID: (id: string | number) => `${API_BASE_URL}/order_lecrepe/get/${id}`,
  CREATE_ORDER_LECREPE: `${API_BASE_URL}/order_lecrepe/create`,
  UPDATE_ORDER_LECREPE: (id: string | number) => `${API_BASE_URL}/order_lecrepe/update/${id}`,
  MARK_ORDER_READY: (id: string | number) => `${API_BASE_URL}/order_lecrepe/ready/${id}`,
  MARK_ORDER_DELIVERED: (id: string | number) => `${API_BASE_URL}/order_lecrepe/delivered/${id}`,
  CANCEL_ORDER_LECREPE: (id: string | number) => `${API_BASE_URL}/order_lecrepe/cancel/${id}`,
  DELETE_ORDER_LECREPE: (id: string | number) => `${API_BASE_URL}/order_lecrepe/delete/${id}`,
  
  // Product endpoints
  GET_ALL_PRODUCTS: `${API_BASE_URL}/product/get`,
  CREATE_PRODUCT: `${API_BASE_URL}/product/create/`,
  UPDATE_PRODUCT: (id: string | number) => `${API_BASE_URL}/product/update/${id}`,
  DELETE_PRODUCT: (id: string | number) => `${API_BASE_URL}/product/delete/${id}`,
  
  // Member endpoints
  GET_ALL_MEMBERS: (id_store: string | number) => `${API_BASE_URL}/member/get/store/${id_store}`,
  CREATE_MEMBER: `${API_BASE_URL}/member/create/`,
  UPDATE_MEMBER: (id: string | number) => `${API_BASE_URL}/member/update/${id}`,
  DELETE_MEMBER: (id: string | number) => `${API_BASE_URL}/member/delete/${id}`,
};

