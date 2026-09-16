# AXAG SDK

Tooling for the [Agent Experience Accessibility Guidelines](https://axag.org).

| Package | Path | Purpose |
|---------|------|---------|
| `@axag/core` | `packages/core` | Vocabulary, macro and annotation reader, parameter harvesting, manifest and tool generation, HTML/JSX/DOM adapters |
| `@axag/compiler` | `packages/compiler` | Build-time extraction and the Vite/webpack/Rollup/Rspack/esbuild plugin |
| `@axag/schema-zod` | `packages/schema-zod` | Zod 4 schemas as action parameters |
| `@axag/schema-openapi` | `packages/schema-openapi` | OpenAPI 3.0/3.1 operations as action parameters |
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
