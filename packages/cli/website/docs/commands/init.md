---
sidebar_position: 5
title: "axag init"
description: "Initialize AXAG configuration in your project."
---

# axag init

Initialize AXAG configuration in your project with interactive setup prompts.

## Usage

```bash
axag init [options]
```

## Examples

```bash
# Interactive setup
axag init

# Overwrite existing config
axag init --force
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--force` | `false` | Overwrite existing configuration file |

## What It Creates

Running `axag init` creates an `axag.config.json` in your project root:

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

## Interactive Prompts

The init wizard asks:

1. **Domain** — What type of application? (e-commerce, CRM, analytics, enterprise, etc.)
2. **AI inference** — Enable AI-powered inference? (requires API key)
3. **AI provider** — OpenAI or Anthropic?
4. **Max pages** — How many pages to crawl?
5. **Conformance level** — Target validation level (A, AA, AAA)?

## Config File Locations

axag-cli looks for configuration in this order:

1. `axag.config.json`
2. `.axagrc`
3. `.axagrc.json`
4. `.axagrc.yaml`
5. `"axag"` key in `package.json`
