# Contributing to openIndu Portal

Thank you for contributing. Create a focused branch, keep secrets and local
`.env` files out of Git, and open a pull request against `main`.

Before submitting a pull request, run:

```bash
npm ci
npm run lint
npm run format:check
npm run test:coverage
npm run build
```

`npm run format:check` fails when a file is not formatted the way Prettier writes it;
`npm run format` fixes it. CI runs the same check. `docs/` is not formatted.

Describe the intent, blast radius, test results, and rollback approach in the
pull request. All changes require human review before merge.

## Reporting security issues

Do not open a public issue for a suspected vulnerability. See [SECURITY.md](SECURITY.md).
