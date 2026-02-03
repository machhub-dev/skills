// filepath: src/services/product.service.ts
import { BaseService } from './base.service';
import type { PaginationOptions, FilterOptions, SortOptions } from './base.service';

export interface Product {
    id: string;
    name: string;
    sku: string;
    price: number;
    description?: string;
    categoryId?: string;
    stock: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

class ProductService extends BaseService {
    private collectionName = 'products';

    /**
     * Get all products with optional filtering and pagination
     */
    async getAllProducts(options?: {
        pagination?: PaginationOptions;
        filters?: FilterOptions[];
        sort?: SortOptions;
    }): Promise<Product[]> {
        const products = await this.getAllRecords<Product>(
            this.collectionName,
            options
        );
        return products.map(this.transformProduct);
    }

    /**
     * Get product by ID
     */
    async getProductById(id: string): Promise<Product | null> {
        const product = await this.getRecordById<Product>(
            this.collectionName,
            id,
            { expand: ['categoryId'] }
        );
        return product ? this.transformProduct(product) : null;
    }

    /**
     * Get products by category
     */
    async getProductsByCategory(categoryId: string): Promise<Product[]> {
        const products = await this.getAllRecords<Product>(
            this.collectionName,
            {
                filters: [{
                    field: 'categoryId',
                    operator: 'eq',
                    value: `myapp.categories:${categoryId}`
                }]
            }
        );
        return products.map(this.transformProduct);
    }

    /**
     * Get active products only
     */
    async getActiveProducts(): Promise<Product[]> {
        const products = await this.getAllRecords<Product>(
            this.collectionName,
            {
                filters: [{
                    field: 'isActive',
                    operator: 'eq',
                    value: true
                }],
                sort: { field: 'name', direction: 'asc' }
            }
        );
        return products.map(this.transformProduct);
    }

    /**
     * Search products by name
     */
    async searchProducts(query: string): Promise<Product[]> {
        const products = await this.getAllRecords<Product>(
            this.collectionName,
            {
                filters: [{
                    field: 'name',
                    operator: 'contains',
                    value: query
                }]
            }
        );
        return products.map(this.transformProduct);
    }

    /**
     * Create new product
     */
    async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
        // Convert categoryId to reference format if provided
        const productData: any = { ...data };
        if (data.categoryId) {
            productData.categoryId = {
                Table: 'myapp.categories',
                ID: data.categoryId
            };
        }

        const created = await this.createRecord<Product>(
            this.collectionName,
            productData
        );
        return this.transformProduct(created);
    }

    /**
     * Update product
     */
    async updateProduct(
        id: string,
        updates: Partial<Omit<Product, 'id' | 'createdAt'>>
    ): Promise<Product> {
        // Convert categoryId to reference format if provided
        const updateData: any = { ...updates };
        if (updates.categoryId) {
            updateData.categoryId = {
                Table: 'myapp.categories',
                ID: updates.categoryId
            };
        }

        const updated = await this.updateRecord<Product>(
            this.collectionName,
            id,
            updateData
        );
        return this.transformProduct(updated);
    }

    /**
     * Delete product
     */
    async deleteProduct(id: string): Promise<void> {
        await this.deleteRecord(this.collectionName, id);
    }

    /**
     * Update product stock
     */
    async updateStock(id: string, quantity: number): Promise<Product> {
        return await this.updateProduct(id, { stock: quantity });
    }

    /**
     * Check if product is in stock
     */
    async isInStock(id: string): Promise<boolean> {
        const product = await this.getProductById(id);
        return product ? product.stock > 0 : false;
    }

    /**
     * Transform product from API format to app format
     */
    private transformProduct = (raw: any): Product => {
        return {
            id: this.extractId(raw.id),
            name: raw.name,
            sku: raw.sku,
            price: raw.price,
            description: raw.description,
            categoryId: raw.categoryId ? this.extractId(raw.categoryId) : undefined,
            stock: raw.stock,
            isActive: raw.isActive,
            createdAt: new Date(raw.createdAt),
            updatedAt: new Date(raw.updatedAt)
        };
    };
}

export const productService = new ProductService();
