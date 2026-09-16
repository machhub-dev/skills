<!-- filepath: pages/products.vue -->
<script setup lang="ts">
interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
}

const {
  items: products,
  loading,
  error,
  getAll,
  remove,
} = useCollection<Product>("products");

onMounted(() => {
  getAll();
});

async function deleteProduct(id: string) {
  if (confirm("Delete this product?")) {
    await remove(id);
  }
}
</script>

<template>
  <div>
    <h1>Products</h1>

    <div v-if="loading">Loading products...</div>

    <div v-else-if="error" class="error">Error: {{ error.message }}</div>

    <div v-else>
      <div v-if="products.length === 0">No products found</div>

      <div v-else class="product-list">
        <div v-for="product in products" :key="product.id" class="product-card">
          <h3>{{ product.name }}</h3>
          <p class="price">${{ product.price }}</p>
          <p v-if="product.description">{{ product.description }}</p>
          <button @click="deleteProduct(product.id)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.product-card {
  border: 1px solid #ddd;
  padding: 1rem;
  border-radius: 8px;
}

.price {
  font-weight: bold;
  color: #2c3e50;
}

.error {
  color: red;
  padding: 1rem;
  background: #fee;
  border-radius: 4px;
}
</style>
