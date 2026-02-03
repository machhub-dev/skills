<!-- filepath: src/routes/products/+page.svelte -->
<script lang="ts">
  import { onMount } from "svelte";
  import { createCollectionStore } from "$lib/stores/collection.svelte";

  interface Product {
    id: string;
    name: string;
    price: number;
    description?: string;
  }

  const store = createCollectionStore<Product>("products");

  onMount(() => {
    store.getAll();
  });

  async function deleteProduct(id: string) {
    if (confirm("Delete this product?")) {
      await store.remove(id);
    }
  }
</script>

<div>
  <h1>Products</h1>

  {#if store.loading}
    <div>Loading products...</div>
  {:else if store.error}
    <div class="error">Error: {store.error.message}</div>
  {:else if store.items.length === 0}
    <p>No products found</p>
  {:else}
    <div class="product-list">
      {#each store.items as product (product.id)}
        <div class="product-card">
          <h3>{product.name}</h3>
          <p class="price">${product.price}</p>
          {#if product.description}
            <p>{product.description}</p>
          {/if}
          <button onclick={() => deleteProduct(product.id)}>Delete</button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
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
