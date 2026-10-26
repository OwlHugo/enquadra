# Glossary

Code is in English. The law, the NF-e layout and everything the user reads stay in Portuguese ([ADR 0006](adr/0006-english-code-portuguese-law.md)). This page says which English name stands for which legal term, so the translation lives in one place.

## Kept in Portuguese (no faithful translation)

| Term | What it is |
|---|---|
| `cClassTrib` | *Código de Classificação Tributária* of IBS/CBS, 6 digits. Field name in the NF-e layout. |
| `CST` | *Código de Situação Tributária*, the first 3 digits of the `cClassTrib`. |
| `NCM` | *Nomenclatura Comum do Mercosul*, 8-digit product code. |
| `NBS` | *Nomenclatura Brasileira de Serviços*, the services counterpart of NCM. |
| `CFOP` | *Código Fiscal de Operações e Prestações*, says what kind of operation the invoice line is (sale, transfer, return...). |
| `IBS`, `CBS` | The two new consumption taxes (state/municipal and federal). |
| NF-e, NFC-e | Electronic invoice (model 55) and consumer electronic invoice (model 65). |
| LC 214/2025 | *Lei Complementar* 214, the law that regulates IBS/CBS. Quotes from it are always verbatim. |
| *Simples Nacional* | Simplified tax regime for small businesses. |
| *Cesta Básica Nacional* | National basic food basket, Annex I. |
| Anexo I ... XVII | Annexes of LC 214/2025, by their Roman numeral (`origin: 'I'`, `'VII'`...). |
| Calculadora RTC | The Receita Federal's consumption-tax calculator, whose open API is the official source. |

## English identifier → legal term

| Code | Portuguese term | Notes |
|---|---|---|
| `classify` | *enquadrar* | Assign `CST` + `cClassTrib` to an item. |
| `ProductRule` | *regra de produto* / item de anexo | One annex item or article, with the literal text. |
| `include` / `exclude` | NCM listed / *exceto* | Prefixes as written in the law. |
| `excludedByProviso` | *afastado por ressalva* | Prefixes removed by a generic clause (*"ressalvados..."*), with the reasoning. |
| `overriddenBy` | *ressalvado por* | Annexes that take priority if they also match. |
| `derivedInclusion` | *inclusão derivada* | Prefixes derived from a term of the law (e.g. *casca rija*). |
| `Condition` | *condição da lei* | A fact the law requires that only the description can confirm. |
| `Hypothesis` | *hipótese* | A rule that may apply to the item. |
| `LegalBasis` (`provision`, `text`) | *fundamento* (*dispositivo*, *texto literal*) | `provision` is e.g. "LC 214/2025, art. 135 e Anexo VII, item 12". |
| `Operation` / `operationByCfop` | *operação* | What the CFOP says the line is. |
| `FULL_TAX` (`000001`) | *tributação integral* | Default when no benefit applies. |
| `Layer` | *camada* | `manual`, `operation`, `annex`, `description`, `ai`, `default`. |
| `Confidence` | *confiança* | `high` / `medium` / `low`, computed by rule (shown as alta / média / baixa). |
| `Status` | *estado* | `resolved` (resolvido), `review` (revisar), `needs_info` (falta informação). |
| `Question` | *pergunta* | What the person must answer when the law does not decide alone. |
| `trail` | *trilha* | Step-by-step explanation of the decision. |
| `ManualDecision` | *decisão manual* | Always wins, never overwritten. |
| `OfficialTable` | *tabela oficial* | Frozen snapshot of the official classifications. |
| `OfficialValidation` | *validação oficial* | `accepted` (aceito), `rejected` (recusado), `unavailable` (indisponível), `not_checked`. |
| `restrictedNcmList` | *lista restrita de NCM* | The official API only accepts some NCMs for this code. |
| `Disambiguator` / `need_to_ask` | *desambiguador* / *preciso perguntar* | The LLM step; `need_to_ask` is its abstention. |
| `cbsReduction`, `ibsReduction` | *percentual de redução* da CBS / do IBS | 60 = 60% reduction, 100 = zero rate. |
| `issueDate` | *data de emissão* (`dhEmi`) | Used as the taxable event date of an XML item. |
| `recipientType` | *tipo de destinatário* | `pf` (individual), `pj` (company), `foreign`, `no_recipient`. |
| `severeError` | *erro grave* | Marked `resolved` with the wrong code. The metric that blocks CI. |

## Alert codes

| Code | Meaning |
|---|---|
| `unknown_ncm` | NCM not in the current nomenclature. |
| `multiple_hypotheses` | The NCM fits more than one hypothesis of the law. |
| `description_condition` | The law sets a condition the description does not settle. |
| `annex_priority` | The NCM is in two annexes; the law's own proviso picked one. |
| `official_mismatch` | The official API rejects the NCM for the chosen code. |
| `unmapped_benefit` | The official table accepts the NCM under a benefit the engine does not cover. |
| `ncm_not_probed` | The NCM was not probed in the official table snapshot. |
| `other_official_hypotheses` | The official table also accepts the NCM under another restricted code. |
| `weak_official_validation` | The official API accepts any NCM for this code, so "accepted" proves little. |
| `operation_out_of_scope` | The CFOP is an operation the engine does not classify (inbound, return...). |
| `missing_cfop` | No CFOP: treated as a sale. |
| `ai_discarded` | The LLM answer failed the citation check. |
| `manual_decision_invalidated` | The manual code no longer exists in the current table. |
