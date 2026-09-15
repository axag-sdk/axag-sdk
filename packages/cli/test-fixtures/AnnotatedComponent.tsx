import React from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  return (
    <form
      axag-intent="product.search"
      axag-entity="product"
      axag-action-type="read"
      axag-description="Search for products by keyword"
      axag-risk-level="none"
      axag-idempotent="true"
      axag-scope="user"
      axag-required-parameters='[{"name":"query","type":"string"}]'
    >
      <input type="text" placeholder="Search..." />
      <button type="submit">Search</button>
    </form>
  );
}

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
      axag-required-parameters='[{"name":"product_id","type":"string"},{"name":"quantity","type":"number"}]'
      axag-side-effects='["cart_updated"]'
      onClick={() => console.log('add', productId)}
    >
      Add to Cart
    </button>
  );
}

interface CheckoutProps {
  onCheckout: () => void;
}

export function Checkout({ onCheckout }: CheckoutProps) {
  return (
    <button
      axag-intent="checkout.begin"
      axag-entity="checkout"
      axag-action-type="write"
      axag-description="Begin the checkout process"
      axag-risk-level="high"
      axag-confirmation-required="true"
      axag-scope="user"
      axag-preconditions='["cart_not_empty"]'
      onClick={onCheckout}
    >
      Checkout
    </button>
  );
}
