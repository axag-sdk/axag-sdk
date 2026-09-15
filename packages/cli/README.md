
# 🏷️ axag-cli

[![Homepage](https://img.shields.io/badge/homepage-axag.org-blue?logo=semantic-web)](https://axag.org)
[![CLI Homepage](https://img.shields.io/badge/cli.axag.org-AXAG%20CLI-blueviolet?logo=terminal)](https://cli.axag.org)

> Scan websites, infer AXAG annotations, review interactively, and apply automatically.

`axag-cli` is the companion CLI for the [AXAG Standard](https://axag.org) — Agent Experience Accessibility Guidelines. It automates the process of making your UI agent-accessible by scanning your website, inferring semantic annotations, letting you review and refine them, and then applying them to your source files.

---

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌─────────────┐
│  1. SCAN    │ ──▶ │  2. INFER    │ ──▶ │  3. REVIEW    │ ──▶ │  4. APPLY   │
│  Crawl site │     │  Annotations │     │  Interactively│     │  To source  │
│  Find UI    │     │  via rules   │     │  Confirm/edit │     │  HTML/JSX   │
│  elements   │     │  + AI (opt)  │     │  or reject    │     │  files      │
└─────────────┘     └──────────────┘     └───────────────┘     └─────────────┘
                                                │
                                                ▼
                                         ┌─────────────┐
                                         │  5. REPORT  │
                                         │  HTML / MD  │
                                         │  / JSON     │
                                         └─────────────┘
```

## Installation

```bash
# Install globally
npm install -g axag-cli

# Or use with npx
npx axag-cli scan https://your-site.com
```

## Quick Start

```bash
# 1. Initialize config in your project
axag init

# 2. Scan a website
axag scan https://your-app.com

# 3. Review annotations interactively (happens automatically)
#    You'll see each element with inferred annotations:
#
#    ─── 1 / 24 ───────────────────────────────
#    Element: button#add-to-cart
#    Page:    https://your-app.com/products
#
#    Before (no AXAG):
#      <button>
#
#    After (with AXAG):
#      <button
#        axag-intent="cart.add"
#        axag-entity="cart"
#        axag-action-type="write"
#        axag-description="Add to Cart"
#        axag-risk-level="none"
#        axag-idempotent="false"
#      >
#
#    Confidence: ███████░░░ 70%
#    ? Action? (Use arrow keys)
#      ✔ Accept
#      ✖ Reject
#      ✎ Modify
#      ⏭ Skip
#      ✔✔ Accept all remaining

# 4. Apply accepted annotations
axag apply

# 5. Generate a report
axag report --format html
```

## Commands

### `axag scan <url|directory>`

Scan a live website or local source files for interactive elements, infer AXAG annotations, and enter interactive review.

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

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-o, --output <dir>` | `.axag` | Output directory for results |
| `-d, --domain <domain>` | auto-detected | Domain hint for inference |
| `--headless / --no-headless` | `true` | Browser visibility |
| `--ai` | `false` | Enable AI-powered inference |
| `--ai-provider <provider>` | `openai` | AI provider (openai, anthropic) |
| `--ai-model <model>` | `gpt-4o` | AI model |
| `--max-pages <n>` | `10` | Max pages to crawl |
| `--interactive / --no-interactive` | `true` | Interactive review mode |

### `axag report`

Generate a report from the last scan results.

```bash
axag report                          # HTML report (default)
axag report --format markdown        # Markdown report
axag report --format json            # JSON report
axag report -o my-report.html        # Custom output path
```

### `axag apply`

Apply confirmed annotations to source files.

```bash
axag apply                # Apply to source files
axag apply --dry-run      # Preview changes without applying
axag apply --no-backup    # Skip creating .bak files
```

### `axag validate [target]`

Validate existing AXAG annotations against the specification.

```bash
axag validate                         # Validate current directory
axag validate ./src                   # Validate specific directory
axag validate --level AA              # Validate at AA conformance
axag validate --strict                # Fail on warnings too
```

### `axag init`

Initialize AXAG configuration in your project.

```bash
axag init              # Interactive setup
axag init --force      # Overwrite existing config
```

## Configuration

Create `axag.config.json` in your project root (or run `axag init`):

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

Config is also loaded from: `.axagrc`, `.axagrc.json`, `.axagrc.yaml`, or the `"axag"` key in `package.json`.

## How Inference Works

### Heuristic Rules (Default)

The CLI uses a pattern-matching engine with 25+ rules covering:

- **Destructive actions** — delete, remove, deactivate → `high`/`critical` risk, confirmation required
- **Write actions** — checkout, submit, create, save → `write` action type, appropriate risk
- **Read actions** — search, filter, view, download → `read` action type, no risk
- **Execute actions** — run, deploy, send → `execute` action type, confirmation gates
- **Auth actions** — login, logout, register → appropriate intent patterns
- **Navigation** — next, back, close → generic read navigation

Entity inference uses page headings, form fields, surrounding landmarks, and keyword analysis.

### AI-Powered Inference (Optional)

When `--ai` is enabled, low-confidence heuristic results are enhanced by an LLM:

```bash
# Set your API key
export OPENAI_API_KEY=sk-...

# Run with AI
axag scan https://app.example.com --ai
```

The AI engine:
1. Receives the element HTML, ARIA attributes, and full page context
2. Returns a structured AXAG annotation with confidence score and reasoning
3. Only runs for elements where heuristic confidence < 60%

## Interactive Review

During review, each annotation is presented with:

- **Before/After diff** — see exactly what changes
- **Confidence bar** — visual indicator of inference quality
- **Reasoning** — why the CLI chose these values

Actions available:

| Key | Action | Description |
|-----|--------|-------------|
| ✔ | Accept | Keep annotation as-is |
| ✖ | Reject | Skip this element |
| ✎ | Modify | Change specific attribute values |
| ⏭ | Skip | Leave as pending for later |
| ✔✔ | Accept All | Accept all remaining annotations |

When modifying, you can change any attribute: intent, entity, action type, risk level, parameters, etc.

## Report Formats

### HTML Report

Self-contained HTML with:
- Summary dashboard (elements, coverage, confidence)
- Risk distribution chart
- Full annotation table with confidence bars
- Page-by-page breakdown

### Markdown Report

Clean Markdown with:
- Summary table
- Per-annotation details with code blocks
- Suitable for PR descriptions or documentation

### JSON Report

Structured data for programmatic consumption:
- Full `ScanReport` schema
- Machine-parseable for CI pipelines

## Programmatic API

```typescript
import { scanUrl, inferAnnotations, applyAnnotations } from 'axag-cli';

// Scan a website
const { elements, contexts } = await scanUrl('https://example.com', {
  maxPages: 5,
  headless: true,
  timeout: 30000,
  excludePatterns: [],
});

// Infer annotations
const annotations = await inferAnnotations(elements, contexts, {
  domain: 'ecommerce',
});

// Apply (programmatically accept all)
const accepted = annotations.map(a => ({ ...a, status: 'accepted' as const }));
// ...
```

## CI Integration

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
        with: { node-version: '20' }
      - run: npm install -g axag-cli
      - run: axag validate --level AA --strict
```

## Supported File Types

| Format | Scan | Apply |
|--------|------|-------|
| `.html` / `.htm` | ✅ | ✅ |
| `.jsx` | ✅ (simplified) | ✅ (regex-based) |
| `.tsx` | ✅ (simplified) | ✅ (regex-based) |
| Remote URL | ✅ | ❌ (read-only) |

> **Note:** JSX/TSX support uses simplified parsing. For production use with complex JSX,
> consider scanning the compiled HTML output instead.

## License

MIT — [AXAG Standard Contributors](https://github.com/axag-cli)
