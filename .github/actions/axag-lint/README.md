# AXAG Lint action

Runs `axag-lint`, annotates the pull request, and writes SARIF for code scanning.

```yaml
name: AXAG

on: pull_request

permissions:
  contents: read
  security-events: write

jobs:
  axag:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }   # --changed-since needs the history

      - name: Generate the manifest
        run: npx --yes @web-axag/axag-cli generate src --manifest axag-manifest.json --validate

      - uses: web-axag/axag-sdk/.github/actions/axag-lint@main
        with:
          path: src
          manifest: axag-manifest.json
          changed-since: origin/${{ github.base_ref }}

      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: axag-lint.sarif
```

| Input | Default | Description |
|-------|---------|-------------|
| `path` | `src` | File or directory to lint |
| `manifest` | — | Manifest for the cross-reference rules |
| `config` | — | Config file, when it isn't `.axaglintrc.json` |
| `changed-since` | — | Only lint files changed since a git ref |
| `baseline` | — | Baseline file of findings to ignore |
| `sarif` | `axag-lint.sarif` | Where to write SARIF; empty to skip |
| `version` | `latest` | Version of `@web-axag/axag-lint` to run |

The job fails when the linter reports an error. Warnings and info appear as annotations without failing it.
