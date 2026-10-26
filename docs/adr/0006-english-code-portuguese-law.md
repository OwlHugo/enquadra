# ADR 0006: Code in English, law and user-facing text in Portuguese

Date: 2026-10-25 · Status: accepted · Supersedes [ADR 0005](0005-dominio-em-portugues.md)

## Context

ADR 0005 put domain identifiers in Portuguese (`enquadrar`, `levantarHipoteses`, `Resultado.trilha`) so the code would read like the law. Two things changed:

1. **The project is public and wants outside contributors.** The README, the ADRs and the issue tracker are in English. A developer who is not Brazilian could read the docs and then hit `decidirPorRegra(unica, vivas, r, descartadas)` in the engine. That is where most contributors give up, and the parts people would most like to help with (parsers, the MCP server, the report, CI) have nothing to do with tax law.
2. **The code was mixing languages anyway.** The libraries (`zod`, the AI SDK, Node), the CI and the docs are in English. A Portuguese domain sitting between them made every file bilingual, with no rule for which word went where.

The concern behind ADR 0005 still holds. Translating legal terms invents meaning: *isenção*, *imunidade* and *alíquota zero* are three different legal concepts, and none of them is "exemption".

## Decision

Draw the line by **what the word is**, not by which file it is in:

- **English:** identifiers (types, functions, variables, files, folders, packages), enum values (`resolved`, `needs_info`, `need_to_ask`), alert and error codes, JSON keys the repo writes itself, eval case fields, and log or developer error messages.
- **Portuguese, kept verbatim:** terms from the law and the NF-e layout with no faithful translation (`cClassTrib`, `CST`, `NCM`, `NBS`, `CFOP`, `IBS`, `CBS`, *Simples Nacional*, *Cesta Básica Nacional*, annex names), every quotation of LC 214/2025, field names of files copied from the official API, and **all text the user sees** in the CLI, the HTML report and the questions, because the users are Brazilian. CLI flags (`--sem-ia`, `--ignorar-invalidos`) are user interface and stay in Portuguese too.
- The CLI translates domain values into Portuguese labels in one place (`apps/cli/src/labels.ts`).
- [`docs/glossary.md`](../glossary.md) maps each English identifier to the Portuguese legal term it stands for, so the translation is written down once and can be reviewed.

## Rejected alternatives

- **Keep ADR 0005.** It protects legal meaning, but the glossary does that too, and it costs the outside contributors the project is trying to attract.
- **Translate the legal terms too** (`taxClassCode` for `cClassTrib`, `exemption` for *isenção*). That is the translation-layer bug ADR 0005 warned about. The code would stop matching the NF-e layout, the official API and the law.

## Consequences

- The rename was done with `git mv` and AST-based renaming in commits separate from any logic change, so `git log --follow` and blame still work.
- The eval cases and reports were rewritten with English keys and enum values; results did not change (80/80, 0 severe errors).
- The LLM prompt stays in Portuguese: the model reads Portuguese law text and descriptions, and its justification is shown to a Brazilian reviewer. Only the enum it returns (`need_to_ask`) changed.
- Code comments and test titles are still in Portuguese. They explain the law next to the code and are translated as files are touched, not in a bulk rewrite.
