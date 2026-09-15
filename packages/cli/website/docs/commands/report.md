---
sidebar_position: 3
title: "axag report"
description: "Generate reports from scan results in HTML, Markdown, or JSON format."
---

# axag report

Generate a report from the last scan results.

## Usage

```bash
axag report [options]
```

## Examples

```bash
# Generate HTML report (default)
axag report

# Generate Markdown report
axag report --format markdown

# Generate JSON report
axag report --format json

# Custom output path
axag report -o my-report.html
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--format <format>` | `html` | Report format: `html`, `markdown`, `json` |
| `-o, --output <path>` | auto | Output file path |
| `-i, --input <dir>` | `.axag` | Input directory with scan results |

## Report Formats

### HTML Report

Self-contained HTML file with:
- **Summary dashboard** — total elements, coverage percentage, average confidence
- **Risk distribution chart** — visual breakdown by risk level
- **Full annotation table** — every element with confidence bars
- **Page-by-page breakdown** — grouped by crawled URL

### Markdown Report

Clean Markdown suitable for:
- Pull request descriptions
- Documentation pages
- Wiki entries

Includes summary table and per-annotation details with code blocks.

### JSON Report

Structured `ScanReport` object for:
- CI pipeline consumption
- Programmatic analysis
- Data aggregation across multiple scans

```json
{
  "summary": {
    "totalElements": 24,
    "annotated": 22,
    "avgConfidence": 0.82,
    "riskDistribution": { "none": 12, "low": 6, "medium": 3, "high": 1 }
  },
  "annotations": [...]
}
```
