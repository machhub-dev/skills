import { getOrInitializeSDK } from './sdk.service';
import { BaseService, type PaginationOptions } from './base.service';

/**
 * Example domain model
 */
export interface Item {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  status: 'active' | 'inactive';
  categoryId?: any; // Reference field
  created_at?: string;
  updated_at?: string;
}

/**
 * Example Domain Service
 * Extend BaseService to inherit common CRUD operations
 */
class ExampleService extends BaseService {
  private collectionName = 'items'; // Change to your collection name

  /**
   * Get all items
   */
  async getAllItems(): Promise<Item[]> {
    try {
      return await this.getAllRecords<Item>(this.collectionName);
    } catch (error) {
      console.error('Error fetching all items:', error);
      throw error;
    }
  }

  /**
   * Get paginated items with sorting and filtering
   */
  async getPaginatedItems(options: PaginationOptions): Promise<Item[]> {
    try {
      return await this.getPaginatedRecords<Item>(this.collectionName, options);
    } catch (error) {
      console.error('Error fetching paginated items:', error);
      throw error;
    }
  }

  /**
   * Get total count of items
   */
  async getTotalItemsCount(filters?: PaginationOptions['filters']): Promise<number> {
    try {
      return await this.getTotalRecordsCount(this.collectionName, filters);
    } catch (error) {
      console.error('Error fetching items count:', error);
      throw error;
    }
  }

  /**
   * Get item by ID
   */
  async getItemById(itemId: string): Promise<Item | null> {
    try {
      return await this.getRecordById<Item>(this.collectionName, itemId);
    } catch (error) {
      console.error(`Error fetching item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Create new item
   */
  async createItem(data: Partial<Item>): Promise<Item> {
    try {
      return await this.createRecord<Item>(this.collectionName, data);
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  /**
   * Update item
   */
  async updateItem(itemId: string, data: Partial<Item>): Promise<Item> {
    try {
      return await this.updateRecord<Item>(this.collectionName, itemId, data);
    } catch (error) {
      console.error(`Error updating item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Delete item
   */
  async deleteItem(itemId: string): Promise<void> {
    try {
      await this.deleteRecord(this.collectionName, itemId);
    } catch (error) {
      console.error(`Error deleting item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Example: Custom query - Get low stock items
   */
  async getLowStockItems(threshold: number = 10): Promise<Item[]> {
    try {
      const sdk = await getOrInitializeSDK();
      const results = await sdk.collection(this.collectionName)
        .filter('quantity', '<', threshold)
        .sort('quantity', 'asc')
        .getAll();
      return results as Item[];
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      throw error;
    }
  }

  /**
   * Example: Custom query - Get items by status
   */
  async getItemsByStatus(status: 'active' | 'inactive'): Promise<Item[]> {
    try {
      const sdk = await getOrInitializeSDK();
      const results = await sdk.collection(this.collectionName)
        .filter('status', '=', status)
        .getAll();
      return results as Item[];
    } catch (error) {
      console.error(`Error fetching items with status ${status}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const exampleService = new ExampleService();
