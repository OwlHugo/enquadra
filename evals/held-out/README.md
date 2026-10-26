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

First run, before any rule change (rules only): **72.1%** (238/330), **16 severe errors**. The 16 ids:
`ho-135 ho-136 ho-147 ho-162 ho-189 ho-196 ho-201 ho-202 ho-223 ho-224 ho-248 ho-249 ho-250 off-068
off-070 off-071`. Causes: water-bleach NCM shared by disinfectant and alcohol gel; absorvente for
incontinence read as menstrual; vaccine falling to the default; accessibility NCMs (cane, grab bar,
alarm clock, hand controls) resolved from the NCM plus one word; bird seed and corn grain read as
human food; juices, canned corn and chickpeas taken as "no sugar, no salt"; books with toys and CDs.

The rules were then changed (the cases were not). Rules only: **73.9%** (244/330), **0 severe errors**.
With the Gemini disambiguator, see the main README.

## Limits

- The held-out set is **no longer blind** for the rules changed after the first run. Some of the
  fixes are general (a condition now needs a second signal; accessibility items with a general-use
  NCM become a question; animal use vetoes human food; a rule for art. 146 § 1º III vaccines). Others
  are signals taken from the failing items (`ração`, `calopsita`, `procedimento`, `esteril`,
  `glicemia`, `ultrassom`, `colorir`, `pelucia`, `ao vivo`, ...). Treat the post-fix number as
  contaminated until a new, never-seen batch is written.
- With the AI, `accuracy` counts a `review` that carries the right code as a hit (see
  `evals/run.ts`). The AI does not resolve more items: `resolved` is the same in both modes.
- The expected code is the author's reading of the law, checked against the API where the API has a
  restricted list. A few `needs_info` items are debatable.
- Most remaining misses are conservative: the engine asks or marks `review` where the author expected
  a decision (medicines by active ingredient, animal vaccines, agricultural inputs). They are not wrong codes.
