# @web-axag/compiler

Build-time AXAG extraction. Reads `axag` annotations from HTML, JSX/TSX, Vue SFCs and Angular templates, and writes the Semantic Manifest and the tools an agent runtime registers.

One implementation runs everywhere: the bundler plugin, `axag-cli generate` and your own scripts all call the same `compile()`, so the manifest is identical whichever produces it.

```bash
npm install -D @web-axag/compiler
```

## Bundler plugin

Built on [unplugin](https://github.com/unjs/unplugin), so it works with Vite, Rollup, webpack, Rspack and esbuild.

```ts title="vite.config.ts"
import { defineConfig } from 'vite';
import axag from '@web-axag/compiler/vite';

export default defineConfig({
  plugins: [axag()],
});
```

```js title="webpack.config.js"
const axag = require('@web-axag/compiler/webpack').default;
module.exports = { plugins: [axag()] };
```

The build then contains:

| File | Contents |
|------|----------|
| `.well-known/axag-manifest.json` | The Semantic Manifest, at the location agents look for |
| `axag-tools.webmcp.json` | The same actions as WebMCP tool definitions |

and the app can import the tools directly:

```ts
import { tools, manifest, dynamicActions } from 'virtual:axag/tools';
```

In dev, Vite serves both files from memory and recompiles when an annotated file changes.

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `root` | the bundler's root | Directory globs resolve from |
| `include` | `['**/*.{html,htm,jsx,tsx,vue}']` | Files to read |
| `exclude` | `node_modules`, `dist`, `build`, `.git`, `.next` | Files to skip |
| `harvest` | `true` | Add parameters from form controls |
| `angular` | `[]` | Extra globs to read as Angular templates; `*.component.html` always is |
| `manifestFileName` | `.well-known/axag-manifest.json` | Manifest location in the output |
| `toolsFileName` | `axag-tools.webmcp.json` | WebMCP tools location; `false` to skip |
| `failOnError` | `true` | Fail the build on error diagnostics |
| `onCompile` | — | Called after every compile, including rebuilds |

## Specs in components

`axag` can take an action spec instead of a macro string. The compiler reads it when it is a module-level `const` or a `defineAction({...})` call, in that file or one it imports:

```tsx
import { defineAction } from '@web-axag/core';

const deactivateUser = defineAction({
  intent: 'user.deactivate',
  actionType: 'write',
  riskLevel: 'critical',
  confirmationRequired: true,
  requiredParameters: [{ name: 'user_id', type: 'string', format: 'uuid' }],
  handler: async ({ user_id }) => api.deactivate(user_id),
});

<button axag={deactivateUser}>Deactivate</button>
```

Anything the compiler can't read — a prop, a value built at runtime — is listed in the manifest's `dynamic_actions` so runtimes know the manifest isn't the whole story, and `axag-lint` reports it as AXAG-LINT-033.

## API

```ts
import { compile } from '@web-axag/compiler';

const { manifest, registry, webmcpTools, diagnostics, files } = await compile({ root: 'src' });
```

`compile()` also takes `resolveBindings`, which `axag-cli` uses to attach Zod and OpenAPI parameters.

## Framework parsers

`@vue/compiler-sfc` and `@angular/compiler` are optional peer dependencies, imported only when a `.vue` file or an Angular template is read. Neither ships in your bundle: everything here runs at build time.
