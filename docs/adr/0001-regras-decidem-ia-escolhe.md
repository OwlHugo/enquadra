# ADR 0001: Rules decide, the model only chooses among valid candidates

Date: 2026-10-18 · Status: accepted

## Context

Classifying an item into `cClassTrib` is a legal statement. A wrong "resolved" answer either rejects the invoice or, worse, is accepted and becomes a tax liability that no one notices. LLMs are good at reading messy product descriptions (`FRALD PAMP G C/30`) and bad at being accountable.

## Decision

The engine is a deterministic pipeline of layers (manual → operation → annex → description → AI → default). The LLM is called only when rules leave two or more valid hypotheses, or a legal condition the description does not settle. It receives the closed list of candidates and must return one of them or `need_to_ask`. Its quoted citation is checked verbatim against the law text. Its answer becomes `review`, never `resolved`.

## Rejected alternatives

- **LLM over the whole table with RAG.** 161 codes, many differing only by recipient or regime. Retrieval would surface plausible but wrong codes, and every answer would need human review anyway. Measured cost of the chosen design: 8 calls in 80 cases.
- **Pure lookup NCM → cClassTrib** (the approach of existing SQL projects). Cannot tell diaper from sanitary pad on 9619.00.00, or *pão francês* from other bread on 1905.90.90.
- **Numeric confidence from the model.** Not calibrated, not explainable. Replaced by a category computed from which layer decided.

## Consequences

- With AI off the system still works, which is tested in CI.
- Coverage grows by writing rules, not by tuning prompts. Slower to extend, but each extension is reviewable against the text of the law.
