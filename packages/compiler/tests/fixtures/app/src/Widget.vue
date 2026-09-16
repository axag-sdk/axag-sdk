<template>
  <div class="widget">
    <button axag="write:cart.add_item!low?idempotent=false&effects=cart_updated" axag-description="Add a product to the cart">
      Add to cart
    </button>
    <button :axag="dynamicSpec">Dynamic</button>
  </div>
</template>

<script setup lang="ts">
const dynamicSpec = { intent: 'cart.remove_item' };
</script>
