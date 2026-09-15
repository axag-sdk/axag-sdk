import React from 'react';

interface AddToCartProps {
  productId: string;
}

export function AddToCart({ productId }: AddToCartProps) {
  return (
    <button
      axag-intent="cart.add_item"
      axag-entity="cart"
      axag-action-type="write"
      axag-description="Add a product to the shopping cart"
      axag-risk-level="low"
      axag-idempotent="false"
      axag-scope="user"
      axag-required-parameters='[{"name":"product_id","type":"string"},{"name":"quantity","type":"number","min":1}]'
      axag-side-effects='["cart_updated"]'
      onClick={() => console.log('add', productId)}
    >
      Add to Cart
    </button>
  );
}
