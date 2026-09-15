
# axag-lint

[![Homepage](https://img.shields.io/badge/homepage-axag.org-blue?logo=semantic-web)](https://axag.org)
[![CLI Homepage](https://img.shields.io/badge/cli.axag.org-AXAG%20CLI-blueviolet?logo=terminal)](https://cli.axag.org)

Static linter for [AXAG](https://axag.org) annotations in HTML, JSX, and TSX files. Validates semantic contracts on interactive UI elements to ensure agent-ready markup is correct, complete, and consistent.

## Install

```bash
npm install -g @web-axag/axag-lint
```

Or run without installing:

```bash
npx @web-axag/axag-lint ./src
```

## Usage

```bash
# Lint a directory
axag-lint ./src

# Lint a single file
axag-lint index.html

# JSON output for CI
axag-lint ./src --format json

# GitHub Actions annotations
axag-lint ./src --format github

# Only show errors
axag-lint ./src --quiet

# Cross-reference against a manifest
axag-lint ./src --manifest axag-manifest.json

# Generate default config
axag-lint --init
```

## Rules

| ID | Description | Default |
|----|-------------|---------|
| AXAG-LINT-001 | Interactive element missing `axag-intent` | error |
| AXAG-LINT-002 | Element has `axag-intent` but missing `axag-entity` | error |
| AXAG-LINT-003 | Element has `axag-intent` but missing `axag-action-type` | error |
| AXAG-LINT-004 | Invalid `axag-action-type` value | error |
| AXAG-LINT-005 | Invalid `axag-risk-level` value | error |
| AXAG-LINT-006 | High/critical risk without `confirmation-required` | warning |
| AXAG-LINT-007 | Write/delete without `idempotent` declaration | warning |
| AXAG-LINT-008 | Parameter in both required and optional lists | error |
| AXAG-LINT-009 | Invalid JSON in parameter attributes | error |
| AXAG-LINT-010 | Intent not found in manifest | warning |
| AXAG-LINT-011 | Role-based attributes without scope | warning |
| AXAG-LINT-012 | `approval-required` without `approval-roles` | error |
| AXAG-LINT-013 | Read action with critical risk level | error |
| AXAG-LINT-014 | Write action with contradictory precondition | warning |
| AXAG-LINT-015 | Navigate action with side effects | warning |
| AXAG-LINT-016 | Tenant-specific role with non-tenant scope | warning |
| AXAG-LINT-017 | Non-idempotent mutation without side effects | warning |
| AXAG-LINT-018 | Global scope with personal entity | warning |
| AXAG-LINT-019 | Superadmin role with tenant scope | warning |
| AXAG-LINT-020 | Same entity with different scopes in same file | warning |
| AXAG-LINT-021 | Delete action without scope declaration | warning |
| AXAG-LINT-022 | Write user-scope with tenant-level entity | warning |
| AXAG-LINT-023 | Write/delete without risk-level | error |
| AXAG-LINT-024 | Delete action with risk below high | warning |
| AXAG-LINT-025 | Read action with risk above low | info |
| AXAG-LINT-026 | Safety metadata mismatch for risk level | warning |
| AXAG-LINT-027 | Invalid `axag` macro syntax | error |
| AXAG-LINT-028 | `axag` macro conflicts with a longhand attribute | error |

Elements annotated with the `axag="write:user.deactivate!critical?confirm"` macro are expanded before any rule runs, so every rule applies to macro and longhand annotations alike.

## Configuration

Create `.axaglintrc.json` in your project root (or run `axag-lint --init`):

```json
{
  "include": ["**/*.{html,htm,jsx,tsx}"],
  "exclude": ["node_modules/**", "dist/**", "build/**"],
  "manifestPath": "./axag-manifest.json",
  "rules": {
    "AXAG-LINT-001": "error",
    "AXAG-LINT-007": "warning",
    "AXAG-LINT-025": "off"
  }
}
```

Rules can be set to `"error"`, `"warning"`, `"info"`, or `"off"`.

## Programmatic API

```typescript
import { lint } from '@web-axag/axag-lint';

const result = await lint('./src', {
  format: 'json',
  manifest: './axag-manifest.json',
});

console.log(`Errors: ${result.errorCount}`);
console.log(`Warnings: ${result.warningCount}`);
```


## Links

- [AXAG Specification](https://axag.org)
- [AXAG CLI](https://cli.axag.org)

## License

MIT
