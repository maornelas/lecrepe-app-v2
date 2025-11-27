import { API_ENDPOINTS } from '../config/api';
import { Store, ApiResponse } from '../types';

/**
 * Store Service - Handles all store-related API calls
 */
export class StoreService {
  /**
   * Get store by ID
   */
  static async getStoreById(id: string | number): Promise<ApiResponse<Store>> {
    try {
      const response = await fetch(API_ENDPOINTS.GET_STORE_BY_ID(id), {
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
      console.error('Error fetching store:', error);
      throw error;
    }
  }

  /**
   * Update store
   */
  static async updateStore(id: string | number, store: Partial<Store>): Promise<ApiResponse<Store>> {
    try {
      const response = await fetch(API_ENDPOINTS.UPDATE_STORE(id), {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(store),
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
      console.error('Error updating store:', error);
      throw error;
    }
  }
}



