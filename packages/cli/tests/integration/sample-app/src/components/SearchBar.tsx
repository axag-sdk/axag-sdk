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
      axag-required-parameters='[{"name":"query","type":"string","description":"Search keyword"}]'
    >
      <input type="text" placeholder="Search..." />
      <button type="submit">Search</button>
    </form>
  );
}
