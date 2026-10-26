# Contributing

## Setup

```bash
pnpm install
pnpm check        # lint, types, architecture, tests with coverage gate, eval without AI
```

`pnpm check` is exactly what CI runs on a pull request. If it passes locally, CI passes.

## Adding or changing a law rule

1. Copy the item **verbatim** from the official text of LC 214/2025 on planalto.gov.br into `text`. Do not paraphrase.
2. List NCM prefixes in `include` / `exclude` exactly as written. The integrity test fails if a prefix is not in the text.
3. If the rule needs interpretation, use `excludedByProviso` or `derivedInclusion` with the reasoning written out.
4. If the law imposes a condition the description must confirm, add a `Condition` in `rules/conditions.ts` and real catalog descriptions to `conditions.test.ts`.
5. Add at least one case to `evals/cases.jsonl` with the legal source in `source`. Run `pnpm sources:update` if the case uses an NCM not yet probed against the official API.
6. Update `docs/coverage.md` and the totals line in the README if coverage changed. `COVERAGE` is computed from the rules, and a test fails if the three disagree.

## Rules for every PR

- The domain (`packages/domain`) has no I/O and no dependencies. `pnpm architecture` enforces it.
- No severe error in the eval, ever.
- A decision that changes behavior gets an ADR in `docs/adr/`.
- Commits follow Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

## Language

Code, identifiers, enum values and error codes are in English. Terms from the law and the NF-e layout (`cClassTrib`, `CST`, `NCM`, `CFOP`, annex names), quotations of LC 214/2025 and every text the user sees (CLI output, HTML report, questions) stay in Portuguese. See [ADR 0006](docs/adr/0006-english-code-portuguese-law.md) and the [glossary](docs/glossary.md).
