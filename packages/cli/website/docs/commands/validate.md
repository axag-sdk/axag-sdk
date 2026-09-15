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

# Validate at AA conformance level
axag validate --level AA

# Strict mode — fail on warnings too
axag validate --strict
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--level <level>` | `A` | Conformance level: `A` (basic), `AA` (intermediate), `AAA` (full) |
| `--strict` | `false` | Treat warnings as errors |
| `--format <format>` | `text` | Output format: `text`, `json` |

## Conformance Levels

| Level | Name | Checks |
|-------|------|--------|
| **A** | Basic | Required attributes present (`axag-intent`, `axag-action-type`) |
| **AA** | Intermediate | + entity, risk-level, description, idempotency |
| **AAA** | Full | + parameters, preconditions, confirmation gates, tenant boundaries |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All validations passed |
| `1` | Validation errors found |
| `2` | Validation warnings found (strict mode only) |

## Example Output

```
✓  button#submit     — A: pass, AA: pass
✗  button#delete-all — AA: missing axag-risk-level (expected "high" or "critical")
⚠  a#nav-home        — AA: missing axag-description

Results: 18 passed, 2 errors, 1 warning
Conformance: AA — FAIL
```

## CI Usage

See [CI Integration](/docs/ci-integration) for using `axag validate` in GitHub Actions.
