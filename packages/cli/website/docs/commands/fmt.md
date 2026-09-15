---
sidebar_position: 5
title: "axag fmt"
description: "Convert AXAG annotations between macro and longhand form."
---

# axag fmt

Rewrite AXAG annotations in HTML, JSX and TSX files as a single `axag="..."` macro, or expand macros back into longhand `axag-*` attributes. Other attributes, text and formatting are left as written, and the generated manifest is identical either way.

## Usage

```bash
axag fmt [target] [options]
```

`target` is a file or directory (default: the current directory). `node_modules`, `dist`, `build`, `.git` and `.next` are skipped.

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--to <form>` | `macro` | `macro` or `longhand` |
| `--check` | `false` | Don't write; list files that would change and exit 1 if any would |

## What goes into the macro

```html
<!-- longhand -->
<button
  axag-intent="user.deactivate"
  axag-entity="user"
  axag-action-type="write"
  axag-risk-level="critical"
  axag-approval-required="true"
  axag-approval-roles='["security_admin"]'
  axag-preconditions='["user is active"]'
>

<!-- axag fmt --to macro -->
<button
  axag="write:user.deactivate!critical?approval&roles=security_admin"
  axag-preconditions='["user is active"]'
>
```

- Action type, intent and risk level form the head: `write:user.deactivate!critical`.
- Booleans, scope, tenant boundary, approval roles, side effects and plain parameter lists become query keys.
- `axag-entity` is dropped when it equals the intent prefix; the macro implies it.
- Anything the grammar can't express stays longhand: descriptions, pre/postconditions, parameter objects with types, and list items containing spaces.

## Skipped elements

`fmt` leaves an element untouched and prints a warning when:

- its macro is invalid or conflicts with a longhand attribute (fix what `axag-lint` reports as AXAG-LINT-027 / 028), or
- an AXAG attribute is a JSX expression such as `axag-risk-level={risk}`.

## In CI

```yaml
- run: npx axag fmt src --check
```
