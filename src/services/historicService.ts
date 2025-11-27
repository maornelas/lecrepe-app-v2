import { API_BASE_URL } from '../config/api';
import { Order, ApiResponse } from '../types';

/**
 * Historic Service - Handles historic orders API calls
 */
export class HistoricService {
  /**
   * Get finished/closed orders (historic)
   */
  static async getOrdersFinished(): Promise<ApiResponse<Order[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/order/historic`, {
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
      console.error('Error fetching historic orders:', error);
      throw error;
    }
  }
}

