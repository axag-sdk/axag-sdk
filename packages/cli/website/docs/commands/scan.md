---
sidebar_position: 1
title: "axag scan"
description: "Scan a live website or local source files for interactive elements and infer AXAG annotations."
---

# axag scan

Scan a live website or local source files for interactive elements, infer AXAG annotations, and enter interactive review.

## Usage

```bash
axag scan <url|directory> [options]
```

## Examples

```bash
# Scan a live URL
axag scan https://shop.example.com

# Scan local HTML/JSX files
axag scan ./src

# Scan with domain hint for better inference
axag scan https://shop.example.com --domain ecommerce

# Scan with AI-powered inference
axag scan https://app.example.com --ai --ai-provider openai --ai-model gpt-4o

# Scan without interactive review (batch mode)
axag scan https://app.example.com --no-interactive

# Scan with visible browser
axag scan https://app.example.com --no-headless

# Limit crawl depth
axag scan https://app.example.com --max-pages 5
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `-o, --output <dir>` | `.axag` | Output directory for results |
| `-d, --domain <domain>` | auto-detected | Domain hint for inference (e.g., `ecommerce`, `crm`, `analytics`) |
| `--headless / --no-headless` | `true` | Browser visibility |
| `--ai` | `false` | Enable AI-powered inference |
| `--ai-provider <provider>` | `openai` | AI provider (`openai`, `anthropic`) |
| `--ai-model <model>` | `gpt-4o` | AI model to use |
| `--max-pages <n>` | `10` | Maximum pages to crawl |
| `--interactive / --no-interactive` | `true` | Interactive review mode |

## Interactive Review

During review, each annotation is presented with a before/after diff, confidence score, and reasoning. Available actions:

| Key | Action | Description |
|-----|--------|-------------|
| ✔ | **Accept** | Keep annotation as-is |
| ✖ | **Reject** | Skip this element |
| ✎ | **Modify** | Change specific attribute values |
| ⏭ | **Skip** | Leave as pending for later |
| ✔✔ | **Accept All** | Accept all remaining annotations |

When modifying, you can change any attribute: intent, entity, action type, risk level, parameters, etc.

## Output

Results are stored in the output directory (default `.axag/`):

```
.axag/
├── report.json       # Full structured scan results
├── report.html       # Visual HTML report
└── annotations/      # Per-page annotation data
```
