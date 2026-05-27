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
- the client-specific private logic
- Client-specific account numbers
- Portal session cookies
- Downloaded production artifacts

If a real scraper is converted into a provider plugin, it must be rewritten or sanitized so the public plugin contains only generic portal logic and safe fixtures.

