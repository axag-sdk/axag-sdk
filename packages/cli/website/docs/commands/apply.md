---
sidebar_position: 2
title: "axag apply"
description: "Apply confirmed AXAG annotations to your source HTML, JSX, or TSX files."
---

# axag apply

Apply confirmed annotations from the last scan to your source files.

## Usage

```bash
axag apply [options]
```

## Examples

```bash
# Apply annotations to source files
axag apply

# Preview changes without applying
axag apply --dry-run

# Skip creating backup files
axag apply --no-backup
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--dry-run` | `false` | Preview changes without writing files |
| `--backup / --no-backup` | `true` | Create `.bak` backup files before modifying |
| `-i, --input <dir>` | `.axag` | Input directory with scan results |

## Supported File Types

| Format | Support | Notes |
|--------|---------|-------|
| `.html` / `.htm` | ✅ Full | Cheerio-based DOM manipulation |
| `.jsx` | ✅ Simplified | Regex-based attribute injection |
| `.tsx` | ✅ Simplified | Regex-based attribute injection |

:::tip
For complex JSX/TSX projects, consider scanning the compiled HTML output and then mapping annotations back to source files.
:::

## Backup Files

By default, `axag apply` creates backup files before modifying:

```
src/index.html      → src/index.html.bak
src/App.tsx         → src/App.tsx.bak
```

Use `--no-backup` to skip this step.
