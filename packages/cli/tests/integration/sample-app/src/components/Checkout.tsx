import React from 'react';

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
      axag-idempotent="false"
      axag-scope="user"
      axag-preconditions='["cart_not_empty"]'
      onClick={onCheckout}
    >
      Checkout
    </button>
  );
}
