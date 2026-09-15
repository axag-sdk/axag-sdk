/**
 * JSON Report Generator.
 */

import type { ScanReport, ScanResult } from '../types/index.js';
import type { RiskLevel, ActionType } from '../utils/constants.js';

export function generateJsonReport(scanResult: ScanResult): ScanReport {
  const annotations = scanResult.annotations;

  const riskDistribution = { none: 0, low: 0, medium: 0, high: 0, critical: 0 } as Record<RiskLevel, number>;
  const actionTypeDistribution = { read: 0, write: 0, delete: 0, execute: 0 } as Record<ActionType, number>;

  let totalConfidence = 0;

  for (const a of annotations) {
    riskDistribution[a.riskLevel]++;
    actionTypeDistribution[a.actionType]++;
    totalConfidence += a.confidence;
  }

  return {
    meta: scanResult.meta,
    summary: {
      totalElements: scanResult.elements.length,
      annotated: annotations.length,
      accepted: annotations.filter((a) => a.status === 'accepted').length,
      rejected: annotations.filter((a) => a.status === 'rejected').length,
      modified: annotations.filter((a) => a.status === 'modified').length,
      pending: annotations.filter((a) => a.status === 'pending').length,
      coveragePercent:
        scanResult.elements.length > 0
          ? Math.round((annotations.length / scanResult.elements.length) * 100)
          : 0,
      averageConfidence:
        annotations.length > 0
          ? Math.round((totalConfidence / annotations.length) * 100) / 100
          : 0,
      riskDistribution,
      actionTypeDistribution,
    },
    pages: scanResult.pages,
    annotations,
    conformance: {
      level: 'A',
      passed: 0,
      failed: 0,
      warnings: 0,
      rules: [],
    },
  };
}
