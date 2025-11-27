import { API_ENDPOINTS } from '../config/api';
import { ApiResponse } from '../types';

export interface Product {
  _id: string;
  id?: number;
  name: string;
  type: string; // 'crepa', 'bebida', 'helado'
  label?: string; // 'dulce', 'salada', 'caliente', 'frio'
  description?: string;
  url?: string;
  url_photo?: string;
  prices?: Array<{
    price: number;
    size?: string;
  }>;
  toppings?: Array<{
    name: string;
  }>;
  [key: string]: any;
}

/**
 * Product Service - Handles all product-related API calls
 */
export class ProductService {
  /**
   * Get all products
   */
  static async getAllProducts(): Promise<ApiResponse<Product[]>> {
    try {
      const response = await fetch(API_ENDPOINTS.GET_ALL_PRODUCTS, {
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
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  /**
   * Create a new product
   */
  static async createProduct(product: Partial<Product>): Promise<ApiResponse<Product>> {
    try {
      const response = await fetch(API_ENDPOINTS.CREATE_PRODUCT, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
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
      console.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Update a product
   */
  static async updateProduct(id: string | number, product: Partial<Product>): Promise<ApiResponse<Product>> {
    try {
      const response = await fetch(API_ENDPOINTS.UPDATE_PRODUCT(id), {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
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
      console.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Delete a product
   */
  static async deleteProduct(id: string | number): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(API_ENDPOINTS.DELETE_PRODUCT(id), {
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
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  /**
   * Create a new category
   */
  static async createCategory(categoryData: { name: string; type: string }): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(API_ENDPOINTS.CREATE_CATEGORY, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
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
      console.error('Error creating category:', error);
      throw error;
    }
  }

  /**
   * Create a new subcategory
   */
  static async createSubCategory(categoryType: string, subCategoryData: { name: string; label: string }): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(API_ENDPOINTS.CREATE_SUBCATEGORY, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categoryType,
          subCategoryData,
        }),
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
      console.error('Error creating subcategory:', error);
      throw error;
    }
  }
}



