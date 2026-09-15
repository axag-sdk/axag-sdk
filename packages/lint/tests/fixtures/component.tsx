import React from 'react';

export function SearchBar() {
  return (
    <div>
      <button
        axag-intent="product.search"
        axag-entity="product"
        axag-action-type="read"
        axag-description="Search for products"
        axag-risk-level="none"
        axag-idempotent="true"
        axag-scope="user"
        axag-required-parameters='["query"]'
        onClick={() => console.log('search')}
      >
        Search
      </button>
    </div>
  );
}

export function AddToCartButton() {
  return (
    <button
      axag-intent="cart.add_item"
      axag-entity="cart"
      axag-action-type="write"
      axag-description="Add item to shopping cart"
      axag-risk-level="low"
      axag-idempotent="true"
      axag-scope="user"
      axag-side-effects='["cart_updated"]'
      onClick={() => console.log('add')}
    >
      Add to Cart
    </button>
  );
}

export function DeleteAccountButton() {
  return (
    <button
      axag-intent="account.delete"
      axag-entity="account"
      axag-action-type="delete"
      axag-description="Permanently delete account"
      axag-risk-level="critical"
      axag-confirmation-required="true"
      axag-approval-required="true"
      axag-approval-roles='["admin","security_officer"]'
      axag-idempotent="false"
      axag-scope="user"
      axag-preconditions='["no_pending_orders"]'
      axag-side-effects='["data_purged"]'
      onClick={() => console.log('delete')}
    >
      Delete My Account
    </button>
  );
}
