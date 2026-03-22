import React from 'react';

export function BrokenSearchBar() {
  return (
    <div>
      {/* AXAG-LINT-001: Interactive button without axag-intent */}
      <button onClick={() => console.log('search')}>
        Search
      </button>

      {/* AXAG-LINT-002: Intent but no entity */}
      <button
        axag-intent="product.search"
        axag-action-type="read"
        onClick={() => console.log('search')}
      >
        Search Again
      </button>

      {/* AXAG-LINT-004: Invalid action-type */}
      <button
        axag-intent="item.update"
        axag-entity="item"
        axag-action-type="update"
        onClick={() => console.log('update')}
      >
        Update
      </button>

      {/* AXAG-LINT-012: Approval without roles */}
      <button
        axag-intent="config.change"
        axag-entity="config"
        axag-action-type="write"
        axag-risk-level="high"
        axag-confirmation-required="true"
        axag-approval-required="true"
        axag-idempotent="true"
        axag-scope="tenant"
        axag-preconditions='["config_exists"]'
        onClick={() => console.log('change')}
      >
        Change Config
      </button>

      {/* AXAG-LINT-013: Read with critical risk */}
      <button
        axag-intent="audit.view"
        axag-entity="audit"
        axag-action-type="read"
        axag-risk-level="critical"
        onClick={() => console.log('view')}
      >
        View Audit
      </button>
    </div>
  );
}
