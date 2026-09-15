---
sidebar_position: 4
title: "axag validate"
description: "Validate existing AXAG annotations against the specification."
---

# axag validate

Validate existing AXAG annotations in your source files against the AXAG specification.

## Usage

```bash
axag validate [target] [options]
```

## Examples

```bash
# Validate current directory
axag validate

# Validate specific directory
axag validate ./src

# Validate at intermediate conformance level
axag validate --level intermediate

# Strict mode — fail on warnings too
axag validate --strict
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--level <level>` | `basic` | Conformance level: `basic`, `intermediate`, `full`. The legacy `A`, `AA`, `AAA` names still work. |
| `--strict` | `false` | Treat warnings as errors |
| `--format <format>` | `text` | Output format: `text`, `json` |

## Conformance Levels

| Level | Name | Checks |
|-------|------|--------|
| **basic** | Basic | Required attributes present (`axag-intent`, `axag-action-type`) |
| **intermediate** | Intermediate | + entity, risk-level, description, idempotency |
| **full** | Full | + parameters, preconditions, confirmation gates, tenant boundaries |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All validations passed |
| `1` | Validation errors found |
| `2` | Validation warnings found (strict mode only) |

## Example Output

```
✓  button#submit     — basic: pass, intermediate: pass
✗  button#delete-all — intermediate: missing axag-risk-level (expected "high" or "critical")
⚠  a#nav-home        — intermediate: missing axag-description

Results: 18 passed, 2 errors, 1 warning
Conformance: intermediate — FAIL
```

## CI Usage

See [CI Integration](/docs/ci-integration) for using `axag validate` in GitHub Actions.
