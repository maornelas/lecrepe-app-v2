// Type definitions for the app

export interface Order {
  _id: string;
  id_store: number;
  id_order: number;
  id_place?: number;
  name: string;
  client?: {
    name: string;
  };
  togo: boolean;
  date: string;
  creation_date?: string;
  created_at?: string;
  status: string;
  total?: number;
  items?: OrderItem[];
  products?: OrderProduct[];
  payment?: {
    _id: string;
    amount: number;
  };
}

export interface OrderItem {
  _id: string;
  product_id: number;
  product_name: string;
  type_id: number;
  type_name: string;
  type_price: number;
  toppings: any[];
  extras: any[];
  units: number;
}

export interface OrderProduct {
  product_id: number;
  product_name: string;
  type_id: number;
  type_name: string;
  type_price: number;
  toppings: any[];
  extras: any[];
  units: number;
}

export interface Place {
  id_place: number;
  name: string;
  available: boolean;
  order?: Order;
}

export interface Store {
  _id: string;
  id_store: number;
  name: string;
  places?: Place[];
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

