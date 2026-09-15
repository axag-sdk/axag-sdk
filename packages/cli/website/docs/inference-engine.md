---
sidebar_position: 7
title: Inference Engine
description: How axag-cli infers AXAG annotations using heuristic rules and optional AI.
---

# Inference Engine

axag-cli uses a two-tier approach to infer AXAG annotations: **heuristic rules** (default, always active) and **AI-powered enhancement** (optional).

## Heuristic Rules

The rule engine contains 25+ pattern-matching rules that analyze:

- **Element text content** — button labels, link text, aria-labels
- **HTML attributes** — `type`, `name`, `id`, `class`, `role`
- **Surrounding context** — parent elements, headings, form structure
- **Page URL patterns** — `/checkout`, `/admin`, `/search`

### Rule Categories

| Category | Pattern Examples | Inferred Attributes |
|----------|-----------------|---------------------|
| **Destructive** | delete, remove, deactivate, cancel | `action-type="write"`, `risk-level="high"`, `requires-confirmation="true"` |
| **Write** | checkout, submit, create, save, add | `action-type="write"`, appropriate risk level |
| **Read** | search, filter, view, download, export | `action-type="read"`, `risk-level="none"` |
| **Execute** | run, deploy, send, trigger, execute | `action-type="execute"`, confirmation gates |
| **Auth** | login, logout, register, sign up | Domain-specific intent patterns |
| **Navigation** | next, back, close, menu, tab | `action-type="read"`, navigation intents |

### Entity Inference

Entities are inferred from:
1. Page headings (`<h1>`, `<h2>`)
2. Form `<fieldset>` legends
3. Nearest landmark region
4. Table/list context
5. URL path segments
6. Keyword analysis of surrounding content

### Confidence Scoring

Each inference receives a confidence score (0–100%):

| Score | Meaning | Action |
|-------|---------|--------|
| 80–100% | High confidence | Usually correct; accept unless odd |
| 60–79% | Medium confidence | Review recommended |
| 0–59% | Low confidence | AI enhancement triggered (if enabled) |

## AI-Powered Enhancement

When `--ai` is enabled, elements with heuristic confidence < 60% are sent to an LLM for enhanced inference.

```bash
# Enable AI inference
export OPENAI_API_KEY=sk-...
axag scan https://app.example.com --ai
```

### How AI Inference Works

1. The LLM receives:
   - Element HTML (outer HTML, trimmed)
   - ARIA attributes and role
   - Full page context (headings, forms, landmarks)
   - Domain hint (if provided)

2. The LLM returns:
   - Complete AXAG annotation object
   - Confidence score with reasoning
   - Alternative interpretations

3. AI results replace heuristic results only when AI confidence is higher.

### Supported Providers

| Provider | Models | Env Variable |
|----------|--------|-------------|
| OpenAI | `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo` | `OPENAI_API_KEY` |
| Anthropic | `claude-3-opus`, `claude-3-sonnet` | `ANTHROPIC_API_KEY` |
