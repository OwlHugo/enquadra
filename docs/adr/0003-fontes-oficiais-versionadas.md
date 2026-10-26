# ADR 0003: Official sources frozen per version, API as a second opinion

Date: 2026-10-18 · Status: accepted

## Context

The Receita Federal publishes an open, keyless API for the consumption-tax calculator (`consumo.tributos.gov.br/.../dados-abertos`, OpenAPI at `.../api/api-docs`). The table changes often (version `V0059`, 30 Sep 2026). The SVRS "Conformidade Fácil" API returns 403 without credentials, so it is not a usable open source.

Probing `ncm-aplicavel` showed that only 17 of 161 codes restrict NCM. For the rest, including `200013`, the API accepts any NCM, so an "accepted" answer does not confirm the classification.

## Decision

- `scripts/update-sources.ts` downloads classifications, CST, legal grounds, the NCM nomenclature (Siscomex) and probes which codes restrict NCM, into `data/sources/<version>/`. Each file is validated with `zod` on load.
- The engine classifies offline from that snapshot. The live API is an optional second opinion: `recusado` downgrades to review; `indisponivel` changes nothing; `aceito` on a non-restricted code raises `validacao_oficial_fraca`.
- If the snapshot says the official table accepts an NCM under a benefit the engine does not cover, the engine refuses to state "full tax" and asks for review (`beneficio_nao_mapeado`).
- A daily workflow checks `/versao` and opens a PR with the new folder and the eval result.

## Consequences

Reproducible results (same input, same version, same output), no dependency on a public API being up, and an honest signal when official validation is weaker than it looks. Probing is rate-limited (6 concurrent) to be a good citizen of a public service.
