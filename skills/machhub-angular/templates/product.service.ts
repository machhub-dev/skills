// filepath: src/app/services/product.service.ts
import { Injectable, signal } from '@angular/core';
import { SDKService } from './sdk.service';

export interface Product {
    id: string;
    name: string;
    price: number;
    description?: string;
}

@Injectable({
    providedIn: 'root'
})
export class ProductService {
    private collectionName = 'products';
    products = signal<Product[]>([]);
    loading = signal(false);

    constructor(private sdkService: SDKService) { }

    async getAll(): Promise<Product[]> {
        this.loading.set(true);
        try {
            const sdk = this.sdkService.getSDK();
            const items = await sdk.collection(this.collectionName).getAll();
            const products = items.map(this.transform);
            this.products.set(products);
            return products;
        } catch (error) {
            console.error('Failed to fetch products:', error);
            throw error;
        } finally {
            this.loading.set(false);
        }
    }

    async getById(id: string): Promise<Product | null> {
        try {
            const sdk = this.sdkService.getSDK();
            const fullId = `myapp.${this.collectionName}:${id}`;
            const item = await sdk.collection(this.collectionName).getOne(fullId);
            return item ? this.transform(item) : null;
        } catch (error) {
            console.error(`Failed to fetch product ${id}:`, error);
            return null;
        }
    }

    async create(data: Omit<Product, 'id'>): Promise<Product> {
        try {
            const sdk = this.sdkService.getSDK();
            const created = await sdk.collection(this.collectionName).create(data);
            const product = this.transform(created);

            // Update signal
            this.products.update(products => [...products, product]);

            return product;
        } catch (error) {
            console.error('Failed to create product:', error);
            throw error;
        }
    }

    async update(id: string, updates: Partial<Product>): Promise<Product> {
        try {
            const sdk = this.sdkService.getSDK();
            const fullId = `myapp.${this.collectionName}:${id}`;
            const updated = await sdk.collection(this.collectionName).update(fullId, updates);
            const product = this.transform(updated);

            // Update signal
            this.products.update(products =>
                products.map(p => p.id === id ? product : p)
            );

            return product;
        } catch (error) {
            console.error(`Failed to update product ${id}:`, error);
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        try {
            const sdk = this.sdkService.getSDK();
            const fullId = `myapp.${this.collectionName}:${id}`;
            await sdk.collection(this.collectionName).delete(fullId);

            // Update signal
            this.products.update(products => products.filter(p => p.id !== id));
        } catch (error) {
            console.error(`Failed to delete product ${id}:`, error);
            throw error;
        }
    }

    private transform(raw: any): Product {
        return {
            id: this.extractId(raw.id),
            name: raw.name,
            price: raw.price,
            description: raw.description
        };
    }

    private extractId(value: any): string {
        if (typeof value === 'object' && value?.ID) {
            return value.ID;
        }
        if (typeof value === 'string' && value.includes(':')) {
            return value.split(':')[1];
        }
        return value;
    }
}
