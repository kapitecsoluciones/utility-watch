# Project: Utility Watch

- Language: TypeScript/Node.js planned; current repo is documentation-first until contracts are stable.
- Goal: open-source plugin platform for utility bill retrieval, normalization, review, and export.
- Public language: English.
- Public repo must not mention private client names, private bot names, internal automation names, or private deployment details.
- Do not copy private scraper code into this repo. Extract patterns only and rewrite cleanly.
- Do not commit secrets, real bills, real screenshots, account numbers, cookies, tokens, or production artifacts.
- Keep Bright Data as an optional adapter boundary, disabled by default.
- Keep AI as an optional diagnosis and maintenance layer, not as the authority for retrieval, security, approval, or export.
- Before coding, prefer updating contract docs when behavior is unclear.
- Before implementing broad provider coverage, read `docs/perspective-review.md` and satisfy the installation, operator, security, plugin developer, registry, Bright Data, AI, open-source, hackathon, and maintenance gates.
- Build in this order: installation/setup, first admin, plugin contract, registry validation, mock provider lifecycle, run records/artifacts, review/export, adapters, AI diagnosis, then additional providers.
- Before commit, run grep for prohibited private terms, JSON validation for manifests and registry, and git diff --check.
