---
sidebar_position: 9
title: API Reference
description: Use axag-cli programmatically in your Node.js projects.
---

# API Reference

axag-cli exposes a programmatic API for use in Node.js applications, build tools, and custom scripts.

## Installation

```bash
npm install axag-cli
```

## Core Functions

### `scanUrl(url, options)`

Scan a live URL and extract interactive elements with page context.

```typescript
import { scanUrl } from 'axag-cli';

const { elements, contexts } = await scanUrl('https://example.com', {
  maxPages: 5,
  headless: true,
  timeout: 30000,
  excludePatterns: [],
});
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `url` | `string` | URL to scan |
| `options.maxPages` | `number` | Maximum pages to crawl (default: 10) |
| `options.headless` | `boolean` | Run browser in headless mode (default: true) |
| `options.timeout` | `number` | Page load timeout in ms (default: 30000) |
| `options.excludePatterns` | `string[]` | URL patterns to skip |

**Returns:** `{ elements: ScannedElement[], contexts: PageContext[] }`

### `inferAnnotations(elements, contexts, options)`

Apply inference rules to generate AXAG annotations.

```typescript
import { inferAnnotations } from 'axag-cli';

const annotations = await inferAnnotations(elements, contexts, {
  domain: 'ecommerce',
});
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `elements` | `ScannedElement[]` | Elements from `scanUrl` |
| `contexts` | `PageContext[]` | Page contexts from `scanUrl` |
| `options.domain` | `string` | Domain hint for better inference |

**Returns:** `InferredAnnotation[]`

### `applyAnnotations(annotations, options)`

Write annotations to source files.

```typescript
import { applyAnnotations } from 'axag-cli';

await applyAnnotations(acceptedAnnotations, {
  backup: true,
  dryRun: false,
});
```

## Types

### `ScannedElement`

```typescript
interface ScannedElement {
  tagName: string;
  id?: string;
  classes: string[];
  text: string;
  attributes: Record<string, string>;
  outerHTML: string;
  pageUrl: string;
  selector: string;
}
```

### `InferredAnnotation`

```typescript
interface InferredAnnotation {
  element: ScannedElement;
  attributes: {
    'axag-intent': string;
    'axag-entity': string;
    'axag-action-type': 'read' | 'write' | 'execute';
    'axag-description': string;
    'axag-risk-level': 'none' | 'low' | 'medium' | 'high' | 'critical';
    'axag-idempotent'?: string;
    'axag-requires-confirmation'?: string;
    [key: string]: string | undefined;
  };
  confidence: number;
  reasoning: string;
  source: 'heuristic' | 'ai';
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
}
```

### `PageContext`

```typescript
interface PageContext {
  url: string;
  title: string;
  headings: string[];
  forms: { action: string; method: string; fields: string[] }[];
  landmarks: { role: string; label?: string }[];
}
```
