# AXAG SDK

Tooling for the [Agent Experience Accessibility Guidelines](https://axag.org).

| Package | Path | Purpose |
|---------|------|---------|
| `@web-axag/core` | `packages/core` | Vocabulary, macro and annotation reader, parameter harvesting, manifest and tool generation, HTML/JSX/DOM adapters |
| `@web-axag/compiler` | `packages/compiler` | Build-time extraction and the Vite/webpack/Rollup/Rspack/esbuild plugin |
| `@web-axag/webmcp` | `packages/webmcp` | Register actions as WebMCP tools, tied to the UI's lifetime |
| `@web-axag/shim` | `packages/shim` | A WebMCP registry for browsers without one |
| `@web-axag/bridge` | `packages/bridge` | Expose a tab's tools to MCP clients through a local relay |
| `@web-axag/server` | `packages/server` | Server-side enforcement: confirmation tokens, approval, tenant scope, CSRF, audit |
| `@web-axag/react` | `packages/react` | React: `useAxag`, `<AxagAction>` |
| `@web-axag/vue` | `packages/vue` | Vue: `useAxag`, `v-axag` |
| `@web-axag/angular` | `packages/angular` | Angular: `[axag]` directive |
| `@web-axag/schema-zod` | `packages/schema-zod` | Zod 4 schemas as action parameters |
| `@web-axag/schema-openapi` | `packages/schema-openapi` | OpenAPI 3.0/3.1 operations as action parameters |
| `@web-axag/cli` | `packages/cli` | Scan sites, infer and apply annotations, generate manifests and MCP tools |
| `@web-axag/lint` | `packages/lint` | Static linter for AXAG annotations |

`cli` and `lint` were imported with their full history from `axag-cli/axag-cli` and `axag-cli/axag-lint`.

## Develop

```bash
pnpm install
pnpm test        # builds core, then runs every package's tests
pnpm typecheck
pnpm build
```

The manifest JSON Schema lives in `packages/core/schema` and is published at `https://axag.org/schema/v1.1/axag-manifest.schema.json`.
