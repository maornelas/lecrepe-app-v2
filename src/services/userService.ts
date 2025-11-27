import { API_ENDPOINTS } from '../config/api';
import { ApiResponse } from '../types';

export interface User {
  _id: string;
  nip: string;
  name: string;
  id_store?: number;
  [key: string]: any;
}

/**
 * User Service - Handles all user-related API calls
 */
export class UserService {
  /**
   * Login user with NIP and store ID
   */
  static async loginUser(nip: string, id_store: string | number): Promise<ApiResponse<User>> {
    try {
      const url = API_ENDPOINTS.LOGIN_USER(nip, id_store);
      console.log('🔐 Login attempt:', { nip, id_store, url });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Login response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Login error response:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Login response data:', data);
      
      return {
        data,
        success: true,
      };
    } catch (error: any) {
      console.error('❌ Error logging in user:', error);
      throw error;
    }
  }
}

