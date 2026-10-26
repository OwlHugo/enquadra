# Contributing

## Setup

```bash
pnpm install
pnpm check        # lint, types, architecture, tests with coverage gate, eval without AI
```

`pnpm check` is exactly what CI runs on a pull request. If it passes locally, CI passes.

## Adding or changing a law rule

1. Copy the item **verbatim** from the official text of LC 214/2025 on planalto.gov.br into `texto`. Do not paraphrase.
2. List NCM prefixes in `incluir` / `excluir` exactly as written. The integrity test fails if a prefix is not in the text.
3. If the rule needs interpretation, use `afastadoPorRessalva` or `inclusaoDerivada` with the reasoning written out.
4. If the law imposes a condition the description must confirm, add a `Condicao` in `rules/conditions.ts` and real catalog descriptions to `conditions.test.ts`.
5. Add at least one case to `evals/cases.jsonl` with the legal source in `fonte`. Run `pnpm sources:update` if the case uses an NCM not yet probed against the official API.
6. Update `COBERTURA` in `rules/products.ts` and the README if coverage changed.

## Rules for every PR

- The domain (`packages/domain`) has no I/O and no dependencies. `pnpm architecture` enforces it.
- No severe error in the eval, ever.
- A decision that changes behavior gets an ADR in `docs/adr/`.
- Commits follow Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
