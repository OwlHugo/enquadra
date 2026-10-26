# Held-out eval

330 items written **without looking at the rules**. The development set (`evals/cases.jsonl`) was
written together with the rules, so it only shows that the rules match the law as transcribed. This
set is the check that they generalize to messy catalog descriptions.

## Who wrote it

| File | Items | Author |
|---|---|---|
| `cases.jsonl`, ids `ho-*` | 258 | A Claude Opus session in a separate folder |
| `cases.jsonl`, ids `off-*` | 72 | A Claude Sonnet session in a separate folder |

Both sessions had access only to: the text of LC 214/2025 and its annexes (Planalto), the official
`cClassTrib` table (version V0059), the official Receita API, and (Sonnet) the Open Food Facts API.
Read and write access to `~/personal/**` was denied, so neither could read the rules, the
development cases or this repository. The only text they received was a task brief with the output
format; it is not kept here.

## How the items were made

- `ho-*`: a synthetic retail catalog written by hand from the annexes: abbreviations (`BEB SOJA ADES`),
  typos, brands, weights, kits, giveaways, and traps (an item that looks like an annex item but has
  another NCM). 87 expect the normal `000001`, 16 expect a question.
- `off-*`: product names from [Open Food Facts](https://world.openfoodfacts.org) (Brazil), data under
  the Open Database License (ODbL, content under CC BY-SA 3.0). The name is `product_name` + brand +
  quantity, as in a register. The EAN is in `offCode` so each item can be traced. No customer data.
- NCM for the `off-*` items was matched by name against the official NCM table. The expected code
  comes from the annex text.
- Every pair with a restricted NCM list was checked on the Receita API (`apiChecked: true`). Pairs
  the API refused were dropped by the author, never stored as `resolved`.
- When the law does not decide alone (sugar or salt content, destination, brazilian author), the
  expected result is `needs_info` with the codes the law allows in `options`.
- Default scenario: retail sale to an individual, CFOP 5102.

## How it runs

`pnpm eval:sem-ia` and `pnpm eval` run both sets and report them separately ("conjunto de
desenvolvimento" and "held-out"). In CI the development set must stay at 100% without AI; the
held-out set fails the build only on a **severe error** (marked `resolved` with the wrong code).
Its accuracy is reported, with no target.

## What it caught

First run, before any rule change (rules only): **72.1%** (238/330), **16 severe errors**. After
fixing the rules (not the cases): **75.2%** (248/330), **0 severe errors**; with the Gemini
disambiguator, 84.2% (278/330), 0 severe. The held-out set caught 16 severe errors and a larger
group of silent gaps, listed in the main README.

## Limits

- After the first run I read the failing items to fix the rules, so this set is no longer fully blind
  for the rules that were changed. The fixes were written as general rules (a whole condition, not a
  string match), but treat the post-fix numbers as an upper bound. A new, never-seen batch is the next step.
- The expected code is the author's reading of the law, checked against the API where the API has a
  restricted list. A few `needs_info` items are debatable.
- Most remaining misses are conservative: the engine asks or marks `review` where the author expected
  a decision (medicines, vaccines for animals, agricultural inputs). They are not wrong codes.
