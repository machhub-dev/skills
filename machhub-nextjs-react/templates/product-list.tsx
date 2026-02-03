// filepath: src/components/ProductList.tsx
'use client';

import { useEffect } from 'react';
import { useCollection } from '@/hooks/useCollection';

interface Product {
    id: string;
    name: string;
    price: number;
    description?: string;
}

export function ProductList() {
    const { items: products, loading, error, getAll, remove } = useCollection<Product>('products');

    useEffect(() => {
        getAll();
    }, [getAll]);

    if (loading) {
        return <div>Loading products...</div>;
    }

    if (error) {
        return <div>Error: {error.message}</div>;
    }

    return (
        <div>
            <h2>Products</h2>
            {products.length === 0 ? (
                <p>No products found</p>
            ) : (
                <ul>
                    {products.map(product => (
                        <li key={product.id}>
                            <h3>{product.name}</h3>
                            <p>${product.price}</p>
                            {product.description && <p>{product.description}</p>}
                            <button onClick={() => remove(product.id)}>Delete</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
