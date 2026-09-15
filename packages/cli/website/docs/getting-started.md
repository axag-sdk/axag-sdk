---
sidebar_position: 1
title: Getting Started
description: Install axag-cli and annotate your first website in under 5 minutes.
---

# Getting Started

Install axag-cli and annotate your first website in under 5 minutes.

## Installation

```bash
# Install globally
npm install -g axag-cli

# Or use directly with npx (no install needed)
npx axag-cli scan https://your-site.com
```

**Requirements:** Node.js ≥ 18.0

## Quick Start

### 1. Initialize configuration (optional)

```bash
axag init
```

This creates an `axag.config.json` in your project root with sensible defaults. You can skip this step — axag-cli works out of the box.

### 2. Scan a website

```bash
axag scan https://your-app.com
```

The CLI will:
- Launch a headless browser (Playwright)
- Crawl up to 10 pages (configurable)
- Discover interactive elements (buttons, links, forms, inputs)
- Infer AXAG annotations using 25+ heuristic rules

### 3. Review interactively

After scanning, you'll enter interactive review mode:

```
─── 1 / 24 ──────────────────────────────
Element:  button#add-to-cart
Page:     https://your-app.com/products

Before (no AXAG):
  <button>Add to Cart</button>

After (with AXAG):
  <button
    axag-intent="cart.add"
    axag-entity="cart"
    axag-action-type="write"
    axag-risk-level="none"
    axag-idempotent="false"
  >Add to Cart</button>

Confidence: ████████░░ 82%
? Action?  ✔ Accept  ✖ Reject  ✎ Modify  ⏭ Skip  ✔✔ Accept All
```

### 4. Apply annotations

```bash
axag apply
```

Accepted annotations are written back to your HTML/JSX/TSX source files. Backup files (`.bak`) are created automatically.

### 5. Generate a report

```bash
axag report --format html
```

Open the generated HTML report for a visual summary of all annotations, confidence scores, and risk distribution.

## What's Next?

- **[Commands Reference](/docs/commands/scan)** — deep dive into all 5 commands
- **[Configuration](/docs/configuration)** — customize scanning, AI, and validation
- **[Inference Engine](/docs/inference-engine)** — understand how annotations are generated
- **[CI Integration](/docs/ci-integration)** — validate annotations on every PR
- **[AXAG Standard](https://axag.org)** — learn about the underlying specification
