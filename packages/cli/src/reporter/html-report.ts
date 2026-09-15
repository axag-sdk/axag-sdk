/**
 * HTML Report Generator — produces a self-contained HTML report.
 */

import type { ScanReport } from '../types/index.js';

export function generateHtmlReport(report: ScanReport): string {
  const accepted = report.annotations.filter((a) => a.status === 'accepted' || a.status === 'modified');
  const rejected = report.annotations.filter((a) => a.status === 'rejected');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AXAG Scan Report — ${report.meta.target}</title>
  <style>
    :root { --primary: #4f46e5; --success: #16a34a; --danger: #dc2626; --warning: #d97706; --bg: #f8fafc; --card: #ffffff; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: #1e293b; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    header { background: var(--primary); color: white; padding: 2rem; text-align: center; }
    header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    header p { opacity: 0.9; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 2rem 0; }
    .stat { background: var(--card); padding: 1.5rem; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat .value { font-size: 2rem; font-weight: 700; color: var(--primary); }
    .stat .label { font-size: 0.85rem; color: #64748b; margin-top: 0.25rem; }
    h2 { margin: 2rem 0 1rem; font-size: 1.5rem; }
    table { width: 100%; border-collapse: collapse; background: var(--card); border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th { background: #f1f5f9; padding: 0.75rem 1rem; text-align: left; font-size: 0.85rem; text-transform: uppercase; color: #64748b; }
    td { padding: 0.75rem 1rem; border-top: 1px solid #e2e8f0; font-size: 0.9rem; }
    tr:hover { background: #f8fafc; }
    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .badge-accepted { background: #dcfce7; color: #16a34a; }
    .badge-rejected { background: #fee2e2; color: #dc2626; }
    .badge-modified { background: #fef3c7; color: #d97706; }
    .badge-pending { background: #e0e7ff; color: #4f46e5; }
    .badge-none { background: #f1f5f9; color: #64748b; }
    .badge-low { background: #dcfce7; color: #16a34a; }
    .badge-medium { background: #fef3c7; color: #d97706; }
    .badge-high { background: #fee2e2; color: #dc2626; }
    .badge-critical { background: #7f1d1d; color: white; }
    .confidence { display: inline-flex; align-items: center; gap: 0.5rem; }
    .confidence-bar { width: 60px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
    .confidence-fill { height: 100%; border-radius: 3px; }
    .meta { background: var(--card); padding: 1.5rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin: 1rem 0; }
    .meta dt { font-weight: 600; color: #64748b; font-size: 0.85rem; }
    .meta dd { margin: 0 0 0.75rem; }
    footer { text-align: center; padding: 2rem; color: #94a3b8; font-size: 0.85rem; }
  </style>
</head>
<body>
  <header>
    <h1>🏷️ AXAG Scan Report</h1>
    <p>${report.meta.target} — ${report.meta.scannedAt}</p>
  </header>
  <div class="container">
    <div class="stats">
      <div class="stat"><div class="value">${report.summary.totalElements}</div><div class="label">Elements Found</div></div>
      <div class="stat"><div class="value">${report.summary.annotated}</div><div class="label">Annotations</div></div>
      <div class="stat"><div class="value">${report.summary.accepted}</div><div class="label">Accepted</div></div>
      <div class="stat"><div class="value">${report.summary.rejected}</div><div class="label">Rejected</div></div>
      <div class="stat"><div class="value">${report.summary.coveragePercent}%</div><div class="label">Coverage</div></div>
      <div class="stat"><div class="value">${report.summary.averageConfidence}</div><div class="label">Avg Confidence</div></div>
    </div>

    <h2>Scan Metadata</h2>
    <dl class="meta">
      <dt>Target</dt><dd>${report.meta.target}</dd>
      <dt>Domain</dt><dd>${report.meta.domain}</dd>
      <dt>Pages Scanned</dt><dd>${report.meta.pagesScanned}</dd>
      <dt>Scan Duration</dt><dd>${report.meta.scanDurationMs}ms</dd>
      <dt>CLI Version</dt><dd>${report.meta.cliVersion}</dd>
    </dl>

    <h2>Pages Scanned</h2>
    <table>
      <thead><tr><th>Page</th><th>Elements</th><th>Annotations</th></tr></thead>
      <tbody>
        ${report.pages.map((p) => `<tr><td>${p.title || p.url}</td><td>${p.elementCount}</td><td>${p.annotationCount}</td></tr>`).join('\n        ')}
      </tbody>
    </table>

    <h2>Annotations (${accepted.length} accepted)</h2>
    <table>
      <thead><tr><th>Element</th><th>Intent</th><th>Action</th><th>Risk</th><th>Confidence</th><th>Status</th></tr></thead>
      <tbody>
        ${report.annotations.map((a) => `<tr>
          <td><code>${escapeHtml(a.selector)}</code></td>
          <td><code>${a.intent}</code></td>
          <td>${a.actionType}</td>
          <td><span class="badge badge-${a.riskLevel}">${a.riskLevel}</span></td>
          <td>
            <div class="confidence">
              <div class="confidence-bar"><div class="confidence-fill" style="width:${a.confidence * 100}%;background:${a.confidence >= 0.7 ? '#16a34a' : a.confidence >= 0.4 ? '#d97706' : '#dc2626'}"></div></div>
              ${Math.round(a.confidence * 100)}%
            </div>
          </td>
          <td><span class="badge badge-${a.status}">${a.status}</span></td>
        </tr>`).join('\n        ')}
      </tbody>
    </table>

    <h2>Risk Distribution</h2>
    <div class="stats">
      ${Object.entries(report.summary.riskDistribution).map(([level, count]) => `<div class="stat"><div class="value">${count}</div><div class="label">${level}</div></div>`).join('\n      ')}
    </div>
  </div>
  <footer>Generated by axag-cli v${report.meta.cliVersion} — <a href="https://axag.org">axag.org</a></footer>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
