# Public / Private Boundary

Utility Watch is intended to be public open-source infrastructure.

The public repository may include:

- Core framework code
- Provider contract definitions
- Example plugins
- Sanitized fixtures
- Documentation
- Demo-only artifacts
- Test data generated for this repository

The public repository must not include:

- Customer credentials
- Real utility bills
- Real customer screenshots
- OAuth tokens
- Bright Data API keys
- QuickBooks tokens
- Client-specific private logic
- Client-specific account numbers
- Portal session cookies
- Downloaded production artifacts

If a real scraper is converted into a provider plugin, it must be rewritten or sanitized so the public plugin contains only generic portal logic and safe fixtures.

## Sanitization Rules

When existing operational knowledge informs a public plugin:

1. Rewrite code instead of copying private implementation.
2. Replace real bills with synthetic fixtures.
3. Replace real account numbers with generated examples.
4. Replace customer names, addresses, balances, and meter IDs.
5. Replace screenshots with synthetic screenshots or text fixtures.
6. Remove portal session data, cookies, and trace files.
7. Remove private accounting workflow assumptions.
8. Document limitations honestly.

## Private Deployment Boundary

Private deployments may contain customer account configuration, secret references, real bills and artifacts, private provider plugins, accounting exports, run histories, and adapter credentials.

Those deployment assets should not be copied back into the public repository.
