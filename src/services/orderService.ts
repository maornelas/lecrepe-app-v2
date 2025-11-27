import { API_ENDPOINTS } from '../config/api';
import { Order, ApiResponse } from '../types';

/**
 * Order Service - Handles all order-related API calls
 */
export class OrderService {
  /**
   * Get orders by store ID
   */
  static async getOrdersByStore(id_store: string | number): Promise<ApiResponse<Order[]>> {
    try {
      const response = await fetch(API_ENDPOINTS.GET_ORDERS_BY_STORE(id_store), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return {
        data: Array.isArray(data) ? data : [],
        success: true,
      };
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      throw error;
    }
  }

  /**
   * Get closed orders by store ID
   */
  static async getClosedOrdersByStore(id_store: string | number): Promise<ApiResponse<Order[]>> {
    try {
      const response = await fetch(API_ENDPOINTS.GET_CLOSED_ORDERS_BY_STORE(id_store), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return {
        data: Array.isArray(data) ? data : [],
        success: true,
      };
    } catch (error: any) {
      console.error('Error fetching closed orders:', error);
      throw error;
    }
  }

  /**
   * Create a new order
   */
  static async createOrder(order: Partial<Order>): Promise<ApiResponse<Order>> {
    try {
      const response = await fetch(API_ENDPOINTS.CREATE_ORDER, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return {
        data,
        success: true,
      };
    } catch (error: any) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Update an order
   */
  static async updateOrder(id: string | number, order: Partial<Order>): Promise<ApiResponse<Order>> {
    try {
      const response = await fetch(API_ENDPOINTS.UPDATE_ORDER(id), {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return {
        data,
        success: true,
      };
    } catch (error: any) {
      console.error('Error updating order:', error);
      throw error;
    }
  }
}



