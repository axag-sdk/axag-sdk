---
sidebar_position: 6
title: "axag generate"
description: "Compile source files into a Semantic Manifest and MCP tools."
---

# axag generate

Read `axag` annotations from HTML, JSX/TSX, Vue SFCs and Angular templates and write a Semantic Manifest, an MCP tool registry and WebMCP tool definitions.

This runs the same compiler as the bundler plugins in `@axag/compiler`, so a manifest built in CI matches the one your build produces.

## Usage

```bash
axag generate [target] [options]
```

`target` is a directory (default: the current one).

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `-m, --manifest <path>` | `axag-manifest.json` | Where to write the manifest |
| `-t, --tools <path>` | — | Also write the MCP tool registry |
| `-w, --webmcp <path>` | — | Also write WebMCP tool definitions |
| `--no-harvest` | harvest on | Only use declared and schema-bound parameters |
| `--validate` | `false` | Validate the manifest against the AXAG JSON Schema |

## Example

```bash
axag generate src \
  --manifest public/.well-known/axag-manifest.json \
  --webmcp public/axag-tools.webmcp.json \
  --validate
```

```text
🏗  AXAG CLI — Manifest & Tool Compiler
──────────────────────────────────────────────────
✔ Read 4 files
  Actions: 5
  Conformance: intermediate
  Registered at runtime: 3
✔ Manifest written to public/.well-known/axag-manifest.json
✔ WebMCP tools written to public/axag-tools.webmcp.json
✔ Manifest passes schema validation ✅
```

"Registered at runtime" counts annotations whose value couldn't be read statically — `axag={somePropSpec}` and the like. They appear in the manifest's `dynamic_actions` list.

## What it reads

| Source | Notes |
|--------|-------|
| `.html`, `.htm` | Plain HTML |
| `.jsx`, `.tsx` | Including `axag={spec}` where the spec is a module-level `const` or `defineAction({...})` |
| `.vue` | The `<template>` block |
| `*.component.html` | Angular templates, including `[axag]` bindings (reported as dynamic) |

Schema bindings from `axag.config` and `axag-schema` attributes are applied, and parameters are harvested from form controls unless `--no-harvest` is passed.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Manifest written |
| `1` | An error diagnostic, or `--validate` failed |
