/**
 * Annotated snippets written so the same text is valid HTML and valid JSX.
 * Every adapter must produce the same manifest action for each one.
 */
export const corpus: Record<string, string> = {
  'read-minimal': `<button axag-intent="product.search" axag-entity="product" axag-action-type="read">Search</button>`,
  'entity-from-intent': `<button axag-intent="cart.view" axag-action-type="read">Cart</button>`,
  'default-action-type': `<a href="/orders" axag-intent="order.list">Orders</a>`,
  'description': `<button axag-intent="report.export" axag-action-type="read" axag-description="Export the report as CSV">Export</button>`,
  'operation-id': `<button axag-intent="report.run" axag-action-type="read" axag-operation-id="runReportV2">Run</button>`,
  'string-params': `<form axag-intent="lead.create" axag-action-type="write" axag-risk-level="low" axag-idempotent="false" axag-required-parameters='["name","email"]' axag-optional-parameters='["company"]'></form>`,
  'object-params': `<form axag-intent="flight.search" axag-action-type="read" axag-required-parameters='[{"name":"passengers","type":"number","min":1,"max":9}]' axag-optional-parameters='[{"name":"cabin","type":"string","enum":["economy","business"]}]'></form>`,
  'invalid-json-params': `<button axag-intent="ticket.create" axag-action-type="write" axag-required-parameters='[subject'>New</button>`,
  'navigate': `<a href="/help" axag-intent="help.open" axag-action-type="navigate" axag-scope="public">Help</a>`,
  'safety-full': `<button axag-intent="user.deactivate" axag-entity="user" axag-action-type="write" axag-risk-level="critical" axag-confirmation-required="true" axag-approval-required="true" axag-approval-roles='["super_admin","security_admin"]' axag-idempotent="true" axag-scope="tenant" axag-tenant-boundary="strict" axag-preconditions='["user is active"]' axag-postconditions='["user cannot sign in"]' axag-side-effects='["session_revocation","audit_log"]'>Deactivate</button>`,
  'delete-high': `<button axag-intent="invoice.void" axag-action-type="delete" axag-risk-level="high" axag-confirmation-required="true" axag-idempotent="true" axag-scope="tenant">Void</button>`,
  'false-booleans': `<button axag-intent="draft.save" axag-action-type="write" axag-risk-level="low" axag-idempotent="true" axag-confirmation-required="false" axag-approval-required="false">Save</button>`,
  'custom-extension-attr': `<button axag-intent="expense.submit" axag-action-type="write" axag-risk-level="medium" axag-x-acme-billing-code="FIN-22">Submit</button>`,
  'async': `<button axag-intent="dataset.export" axag-action-type="read" axag-async="true">Export</button>`,
};
