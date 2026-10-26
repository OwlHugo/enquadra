import type { Result } from './types.ts'

export interface Summary {
  readonly total: number
  readonly resolved: number
  readonly review: number
  readonly needsInfo: number
  readonly withReduction: number
  readonly blockers: number
  readonly aiCostUsd: number
}

export const summarize = (results: readonly Result[]): Summary => {
  let resolved = 0
  let review = 0
  let needsInfo = 0
  let withReduction = 0
  let blockers = 0
  let aiCostUsd = 0
  for (const r of results) {
    if (r.status === 'resolved') resolved++
    else if (r.status === 'review') review++
    else needsInfo++
    if ((r.classification?.cbsReduction ?? 0) > 0) withReduction++
    if (r.alerts.some((a) => a.severity === 'blocker')) blockers++
    aiCostUsd += r.ai?.costUsd ?? 0
  }
  return {
    total: results.length,
    resolved,
    review,
    needsInfo,
    withReduction,
    blockers,
    aiCostUsd,
  }
}
