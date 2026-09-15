---
sidebar_position: 6
title: Configuration
description: Configure axag-cli with axag.config.json for scanning, AI inference, and validation.
---

# Configuration

axag-cli works out of the box with zero configuration. For advanced use, create `axag.config.json` (or run `axag init`).

## Full Configuration Reference

```json
{
  "$schema": "https://axag.org/schema/v1/config.json",
  "outputDir": ".axag",
  "domain": "ecommerce",
  "ai": {
    "enabled": false,
    "provider": "openai",
    "model": "gpt-4o"
  },
  "scanner": {
    "maxPages": 10,
    "headless": true,
    "timeout": 30000,
    "excludePatterns": ["logout", "signout", "/admin"]
  },
  "validation": {
    "conformanceLevel": "AA",
    "strict": false
  }
}
```

## Fields

### Top-Level

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `outputDir` | `string` | `".axag"` | Directory for scan results and reports |
| `domain` | `string` | auto-detected | Domain hint for inference: `ecommerce`, `crm`, `analytics`, `enterprise`, `support`, `marketing`, `travel`, `jobs` |

### `ai`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable AI-powered inference for low-confidence results |
| `provider` | `string` | `"openai"` | AI provider: `openai` or `anthropic` |
| `model` | `string` | `"gpt-4o"` | Model to use for inference |

:::note
When AI is enabled, set the `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` environment variable.
:::

### `scanner`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `maxPages` | `number` | `10` | Maximum pages to crawl |
| `headless` | `boolean` | `true` | Run browser in headless mode |
| `timeout` | `number` | `30000` | Page load timeout in milliseconds |
| `excludePatterns` | `string[]` | `[]` | URL patterns to skip during crawling |

### `validation`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `conformanceLevel` | `string` | `"AA"` | Target level: `A`, `AA`, or `AAA` |
| `strict` | `boolean` | `false` | Treat warnings as errors |

## Config File Locations

Configuration is loaded using [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig), which searches for:

1. `axag.config.json`
2. `.axagrc`
3. `.axagrc.json`
4. `.axagrc.yaml`
5. `"axag"` key in `package.json`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | API key for OpenAI inference |
| `ANTHROPIC_API_KEY` | API key for Anthropic inference |
