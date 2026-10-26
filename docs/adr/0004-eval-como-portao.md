# ADR 0004: Eval as a CI gate, severe error as the metric that blocks

Date: 2026-10-18 · Status: accepted

## Context

"Accuracy" hides the mistake that matters. Abstaining on an ambiguous item costs a person a minute. Marking an item `resolved` with the wrong code costs the business money and nobody notices.

## Decision

- `evals/cases.jsonl` holds hand-written cases with the legal source for each expected answer. Ambiguous cases expect `needs_info` with the options the law allows.
- `evals/run.ts` reports accuracy per category, **severe errors** (resolved with wrong code), correct abstention, and LLM calls, cost and latency.
- CI gate: rules-only mode must pass 100% with zero severe errors. AI mode may differ on ambiguous cases, but never with a severe error.
- Changing the model (`ENQUADRA_MODEL`) is only accepted if `pnpm eval` does not get worse.

## Known limitation

The set was written alongside the rules. It proves the rules implement the law as transcribed; it does not measure generalization. A held-out set from real anonymized catalogs is the next milestone, and until then the README states this limitation next to the numbers.
