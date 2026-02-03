// filepath: src/services/order.service.ts
import { BaseService } from './base.service';

export interface OrderItem {
    productId: string;
    quantity: number;
    price: number;
}

export interface Order {
    id: string;
    orderNumber: string;
    customerId: string;
    items: OrderItem[];
    totalAmount: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    createdAt: Date;
}

class OrderService extends BaseService {
    private collectionName = 'orders';

    async getAllOrders(): Promise<Order[]> {
        const orders = await this.getAllRecords<Order>(this.collectionName, {
            expand: ['customerId', 'items.productId'],
            sort: { field: 'createdAt', direction: 'desc' }
        });
        return orders.map(this.transformOrder);
    }

    async getOrderById(id: string): Promise<Order | null> {
        const order = await this.getRecordById<Order>(
            this.collectionName,
            id,
            { expand: ['customerId', 'items.productId'] }
        );
        return order ? this.transformOrder(order) : null;
    }

    async getOrdersByCustomer(customerId: string): Promise<Order[]> {
        const orders = await this.getAllRecords<Order>(this.collectionName, {
            filters: [{
                field: 'customerId',
                operator: 'eq',
                value: `myapp.customers:${customerId}`
            }]
        });
        return orders.map(this.transformOrder);
    }

    async createOrder(data: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>): Promise<Order> {
        const orderData: any = {
            ...data,
            orderNumber: this.generateOrderNumber(),
            customerId: {
                Table: 'myapp.customers',
                ID: data.customerId
            },
            items: data.items.map(item => ({
                productId: {
                    Table: 'myapp.products',
                    ID: item.productId
                },
                quantity: item.quantity,
                price: item.price
            }))
        };

        const created = await this.createRecord<Order>(this.collectionName, orderData);
        return this.transformOrder(created);
    }

    async updateOrderStatus(
        id: string,
        status: Order['status']
    ): Promise<Order> {
        const updated = await this.updateRecord<Order>(
            this.collectionName,
            id,
            { status }
        );
        return this.transformOrder(updated);
    }

    private generateOrderNumber(): string {
        return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private transformOrder = (raw: any): Order => {
        return {
            id: this.extractId(raw.id),
            orderNumber: raw.orderNumber,
            customerId: this.extractId(raw.customerId),
            items: raw.items.map((item: any) => ({
                productId: this.extractId(item.productId),
                quantity: item.quantity,
                price: item.price
            })),
            totalAmount: raw.totalAmount,
            status: raw.status,
            createdAt: new Date(raw.createdAt)
        };
    };
}

export const orderService = new OrderService();
