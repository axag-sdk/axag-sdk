# AXAG SDK

Tooling for the [Agent Experience Accessibility Guidelines](https://axag.org).

| Package | Path | Purpose |
|---------|------|---------|
| `@axag/core` | `packages/core` | Vocabulary, annotation reader, manifest and tool generation, HTML/JSX/DOM adapters |
| `@web-axag/axag-cli` | `packages/cli` | Scan sites, infer and apply annotations, generate manifests and MCP tools |
| `@web-axag/axag-lint` | `packages/lint` | Static linter for AXAG annotations |

`cli` and `lint` were imported with their full history from `axag-cli/axag-cli` and `axag-cli/axag-lint`.

## Develop

```bash
pnpm install
pnpm test        # builds core, then runs every package's tests
pnpm typecheck
pnpm build
```

The manifest JSON Schema lives in `packages/core/schema` and is published at `https://axag.org/schema/v1.1/axag-manifest.schema.json`.
