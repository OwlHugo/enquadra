# Security and data handling

## Reporting

Report vulnerabilities privately through GitHub Security Advisories on this repository. Please do not open a public issue.

## What the system handles

- **Invoices (NF-e XML)** contain personal data of the recipient. The parser (`packages/nfe`) keeps only the recipient type (PF, PJ, foreign) and state. Names, CPF/CNPJ, addresses and amounts are dropped at read time, and a test asserts none of them appear in the parsed output.
- **To the LLM** goes only: product description, NCM and its official name, and the candidate rules with their legal text. Never the company, the recipient or values.
- **Prompt injection.** Product descriptions are untrusted input. They are delimited as data, `<` is neutralized so a description cannot close its tag, the model can only answer from a closed enum, and its citation is verified against the law. The eval includes injection cases.
- **Secrets.** The only secret is the model API key, read from the environment (`GEMINI_API_KEY`). Without it, the system runs in rules-only mode.
