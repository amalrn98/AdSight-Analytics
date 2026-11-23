# Contributing to AdSight

Thanks for considering a contribution. AdSight is maintained as an open-source, local-first tool for analysing personal advertising-data exports.

## Where contributions help

Useful contributions include:

- Parsers for additional platforms or export formats.
- Small, representative test fixtures for real export structures.
- Regression tests for parsing, classification, privacy, and report generation.
- Clear documentation for obtaining and understanding platform exports.
- Reproducible bug reports with the relevant platform and export format.

Avoid submitting personal data exports. If a fixture is needed, remove names, email addresses, phone numbers, account identifiers, URLs containing personal tokens, and other identifying content. Prefer synthetic or carefully anonymised examples.

## Development setup

Requirements: Node.js 22 or newer and npm.

```bash
git clone https://github.com/amalrn98/AdSight-Analytics.git
cd AdSight-Analytics
npm ci
npm run dev
```

Before submitting a change, run:

```bash
npm run typecheck
npm test
npm run build
```

## Parser contributions

Parsers should convert platform-specific export structures into AdSight's normalised signals. Before adding a parser:

1. Inspect the existing parsers in `src/lib/parsers/`.
2. Keep platform-specific parsing separate from the shared analysis engine.
3. Preserve source provenance, including platform, source file, signal kind, and timestamp where available.
4. Do not turn missing or ambiguous source data into asserted facts.
5. Add focused fixtures and regression tests under `tests/`.
6. Document unsupported formats or known coverage limitations.

AdSight distinguishes platform-stated, observed, and inferred evidence. Changes should preserve that distinction and must not imply that an export proves why a particular ad was shown.

## Pull requests

- Open an issue first for substantial changes so the scope can be discussed.
- Create a focused branch from `main`.
- Keep pull requests limited to one logical change.
- Explain the problem, the approach, and any limitations.
- Include tests for bug fixes and new parsing behaviour.
- Confirm typecheck, tests, and production build pass.
- Do not include private exports, credentials, API keys, or personal information.

By submitting a contribution, you agree that it is provided under the project's Apache License 2.0, subject to its terms.
