# Changelog

Versions of the `enquadra` CLI on npm. `enquadra-mcp` follows the same engine.

## enquadra 0.1.3 · enquadra-mcp 0.1.0 (2026-11-04)

- Condom (Annex IV, item 91, NCM 4014.10.00) resolves by name: no hospital word needed.
- Medicines (NCM 30.03 and 30.04) ask between `200032` (art. 133, 60%) and `200009` (art. 146, zero). The zero list of art. 146, § 3º has not been published, so the engine never picks one. Veterinary descriptions rule out both.
- Dried fruit (0813) asks whether sugar was added before giving the Annex VII reduction. Raisins (0806.20) stay in Annex XV.
- New warning `ncm_description_mismatch` when the first word of the description (arroz, feijao, fralda, preservativo...) does not belong to the NCM chapter. It does not change the code.
- CFOPs for remessas (5.901, 5.908/5.909, 5.911, 5.912/5.913, 5.915/5.916, 5.917 to 5.919) stay out of scope, each with its own reason.
- MCP server published as `enquadra-mcp` (`npx -y enquadra-mcp`), with the official table inside the package.
- `pnpm sources:update` validates every API response with zod before writing to `data/sources/`.
- A reduced or zero rate is never decided when the description contradicts the NCM ("CAMISETA" with the rice NCM) or says nothing: it goes to review with the code as a candidate. New alert `blank_description`.
- Antisera (antitetânico, antiofídico...; NCM 3002.12.1) get art. 146, § 1º, III (`200053`), except for veterinary use.
- Second blind held-out batch (`evals/held-out/batch-2.jsonl`, 120 items): first run 75.0% with 2 severe errors, after fixes 79.2% with 0.

## enquadra 0.1.2

Staged on npm without the README and never released. Skipped.

## enquadra 0.1.1 (2026-11-04)

- Default official table `V0066` (170 codes).
- `--versao` / `-v`, and a friendly error for unknown options.

## enquadra 0.1.0 (2026-11-04), deprecated

Failed on first run: it looked for table `V0059`, which was not in the package. Use 0.1.1 or newer.

## Breaking changes before the first npm release

The rename to English in `c6f7d1e` (`refactor!:`) changed contracts that existed only in the repository:

- `--json` output of the CLI and the MCP `Result`: keys and enum values in English (`resolved`, `needs_info`, `need_to_ask`, alert and error codes).
- MCP tools renamed to `classify_item`, `covered_rules` and `table_version`.
- MCP input parameters renamed: `descricao` → `description`, `data` → `date`, `origem` → `origin`.
- Table snapshots on disk (`version.json`, `ncm.json`, `ncm-applicable.json`) use English keys. A snapshot written by the older script does not load: run `pnpm sources:update` again.
- Law text, labels and the questions shown to the user stay in Portuguese.
