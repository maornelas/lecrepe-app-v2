import { API_BASE_URL } from '../config/api';
import { Order, ApiResponse } from '../types';

/**
 * Order Lecrepe Service - Handles Lecrepe order-specific API calls
 */
export class OrderLecrepeService {
  /**
   * Get all Lecrepe orders by store
   */
  static async getAllOrdersLecrepe(storeId?: string | number): Promise<ApiResponse<Order[]>> {
    try {
      let url = `${API_BASE_URL}/order_lecrepe/get`;
      if (storeId) {
        url += `?store_id=${storeId}`;
      }
      const response = await fetch(url, {
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
      console.error('Error fetching Lecrepe orders:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  static async getOrderLecrepeById(id: string | number): Promise<ApiResponse<Order>> {
    try {
      const response = await fetch(`${API_BASE_URL}/order_lecrepe/get/${id}`, {
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
        data,
        success: true,
      };
    } catch (error: any) {
      console.error('Error fetching order:', error);
      throw error;
    }
  }

  /**
   * Create a new Lecrepe order
   */
  static async createOrderLecrepe(order: Partial<Order>): Promise<ApiResponse<Order>> {
    try {
      const response = await fetch(`${API_BASE_URL}/order_lecrepe/create`, {
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
   * Update a Lecrepe order
   */
  static async updateOrderLecrepe(id: string | number, order: Partial<Order>): Promise<ApiResponse<Order>> {
    try {
      const response = await fetch(`${API_BASE_URL}/order_lecrepe/update/${id}`, {
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

  /**
   * Mark order as ready
   */
  static async markOrderAsReady(orderId: string | number): Promise<ApiResponse<Order>> {
    try {
      const response = await fetch(`${API_BASE_URL}/order_lecrepe/ready/${orderId}`, {
        method: 'PUT',
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
        data,
        success: true,
      };
    } catch (error: any) {
      console.error('Error marking order as ready:', error);
      throw error;
    }
  }

  /**
   * Mark order as delivered
   */
  static async markOrderAsDelivered(orderId: string | number): Promise<ApiResponse<Order>> {
    try {
      const response = await fetch(`${API_BASE_URL}/order_lecrepe/delivered/${orderId}`, {
        method: 'PUT',
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
        data,
        success: true,
      };
    } catch (error: any) {
      console.error('Error marking order as delivered:', error);
      throw error;
    }
  }

  /**
   * Cancel a Lecrepe order
   */
  static async cancelOrderLecrepe(orderId: string | number): Promise<ApiResponse<Order>> {
    try {
      const response = await fetch(`${API_BASE_URL}/order_lecrepe/cancel/${orderId}`, {
        method: 'PUT',
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
        data,
        success: true,
      };
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Delete a Lecrepe order
   */
  static async deleteOrderLecrepe(orderId: string | number): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/order_lecrepe/delete/${orderId}`, {
        method: 'DELETE',
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
        data,
        success: true,
      };
    } catch (error: any) {
      console.error('Error deleting order:', error);
      throw error;
    }
  }
}

