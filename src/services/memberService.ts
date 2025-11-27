import { API_ENDPOINTS } from '../config/api';
import { ApiResponse } from '../types';

export interface Member {
  _id: string;
  id?: number;
  fullname: string;
  phone?: string;
  rol: string;
  url_photo?: string;
  creation_date?: string;
  id_store?: number;
  [key: string]: any;
}

/**
 * Member Service - Handles all member-related API calls
 */
export class MemberService {
  /**
   * Get all members by store ID
   */
  static async getAllMembers(id_store: string | number): Promise<ApiResponse<Member[]>> {
    try {
      const response = await fetch(API_ENDPOINTS.GET_ALL_MEMBERS(id_store), {
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
      console.error('Error fetching members:', error);
      throw error;
    }
  }

  /**
   * Create a new member
   */
  static async createMember(member: Partial<Member>): Promise<ApiResponse<Member>> {
    try {
      const response = await fetch(API_ENDPOINTS.CREATE_MEMBER, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(member),
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
      console.error('Error creating member:', error);
      throw error;
    }
  }

  /**
   * Update a member
   */
  static async updateMember(id: string | number, member: Partial<Member>): Promise<ApiResponse<Member>> {
    try {
      const response = await fetch(API_ENDPOINTS.UPDATE_MEMBER(id), {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(member),
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
      console.error('Error updating member:', error);
      throw error;
    }
  }

  /**
   * Delete a member
   */
  static async deleteMember(id: string | number): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(API_ENDPOINTS.DELETE_MEMBER(id), {
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
      console.error('Error deleting member:', error);
      throw error;
    }
  }
}



