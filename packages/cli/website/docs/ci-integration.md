---
sidebar_position: 8
title: CI Integration
description: Validate AXAG annotations on every pull request with GitHub Actions.
---

# CI Integration

Add AXAG validation to your CI pipeline to ensure annotations stay correct as your UI evolves.

## GitHub Actions

```yaml
# .github/workflows/axag-validate.yml
name: AXAG Validation
on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g axag-cli
      - run: axag validate --level AA --strict
```

## Configuration

Customize the validation level and strictness in `axag.config.json`:

```json
{
  "validation": {
    "conformanceLevel": "AA",
    "strict": true
  }
}
```

## Exit Codes

The `axag validate` command returns standard exit codes for CI:

| Code | Meaning | CI Result |
|------|---------|-----------|
| `0` | All validations passed | ✅ Pass |
| `1` | Validation errors found | ❌ Fail |
| `2` | Warnings found (strict mode) | ❌ Fail |

## JSON Output for CI

Use `--format json` for machine-parseable output:

```bash
axag validate --format json > validation-results.json
```

```json
{
  "passed": 18,
  "errors": 2,
  "warnings": 1,
  "level": "AA",
  "result": "FAIL",
  "details": [
    {
      "element": "button#delete-all",
      "file": "src/admin.html",
      "line": 42,
      "severity": "error",
      "message": "Missing axag-risk-level (expected 'high' or 'critical' for destructive action)"
    }
  ]
}
```

## Recommended Workflow

1. **Development** — Run `axag scan` on new features to generate annotations
2. **Review** — Interactive review catches inference errors before commit
3. **CI** — `axag validate` catches regressions on every PR
4. **Periodic** — Re-scan periodically to catch UI changes that need new annotations
