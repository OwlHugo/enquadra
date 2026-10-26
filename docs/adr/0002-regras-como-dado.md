# ADR 0002: Law rules as data, with the literal text of the law

Date: 2026-10-18 · Status: accepted

## Context

The annexes of LC 214/2025 list NCM codes at four levels (chapter, heading, subheading, code), with exclusions ("except mushrooms of 0709.5"), cross-annex priority ("except products listed in Annex I") and conditions only the description can confirm ("without added sugar"). Encoding this as `if` statements hides the mapping between code and law.

## Decision

Each annex item is a `ProductRule` record in `packages/domain/src/rules/products.ts`: `include` prefixes, `exclude` prefixes, optional `condition`, `overriddenBy`, and the **verbatim text** of the item copied from the official Planalto publication. Two escape hatches exist for interpretation, and both must carry a written justification: `excludedByProviso` (prefixes removed by a generic clause) and `derivedInclusion` (prefixes derived from a term, e.g. "casca rija" → 08.01, 08.02).

A test parses the codes out of each `text` and fails if a listed prefix is not in the law text. It already caught one oddity: the law writes item 26 of Annex I as `2106.9090`, not `2106.90.90`.

## Rejected alternatives

- **Rules in a database / admin UI.** Useful later for clients' own exceptions; for the law itself, a typed file reviewed in PRs is easier to audit and diff.
- **Generate the rules with an LLM from the law PDF.** Faster, but every rule would still need line-by-line review, and the review is the expensive part.

## Consequences

The citation shown to the user and the one the AI must quote are the same string the rule was built from. Changing a rule without changing its text is visible in the diff.
