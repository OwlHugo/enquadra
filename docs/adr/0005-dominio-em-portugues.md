# ADR 0005: Domain code in Portuguese

Date: 2026-10-18 · Status: superseded by [ADR 0006](0006-english-code-portuguese-law.md)

## Context

The domain is Brazilian tax law. Its terms (`cClassTrib`, `CST`, `CFOP`, *ressalva*, *diferimento*, *imunidade*) have no faithful English translation, and the users who read the explanations and the people who would review the rules (accountants, tax analysts) work in Portuguese.

## Decision

Domain types, functions, messages and rule ids are in Portuguese (`enquadrar`, `levantarHipoteses`, `Resultado.trilha`). The README and ADRs are in English for a broader technical audience. Code comments are in Portuguese, close to the code they explain.

## Rejected alternative

English identifiers with Portuguese in comments. It creates a translation layer between the law text and the code (`exemption` vs *isenção* vs *imunidade* are three different legal concepts), which is exactly where tax software bugs come from.
