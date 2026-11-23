# AdSight

**Understand what your advertising data says about how advertisers can target you.**

AdSight is an open-source, local-first web app for analysing personal data exports from Google, Meta (Facebook and Instagram), TikTok, and LinkedIn. It processes files in your browser and shows the advertising interests, audience categories, advertisers, and activity patterns present in those exports.

AdSight works from the data you provide. It does not simulate findings or claim that an export proves why a specific ad was shown.

## Privacy by design

- The app is a static site with no application backend or database.
- Analysis runs locally in a browser Web Worker.
- The Content Security Policy in `vercel.json` blocks outbound network connections from the app.
- You choose which exports to upload through an explicit consent step.
- There is no background collection, scraping, or credential collection.
- Closing the session or using the erase control clears the session data.

These are implementation details, not a legal certification. You can inspect the source and verify network behaviour yourself.

## What AdSight shows

- Advertisers and ad topics found in your exports, with counts and dates.
- Interest and audience categories, including their taxonomy hierarchy.
- Devices, platforms, and timing patterns when the export contains them.
- Evidence behind findings, including where each signal came from.
- A downloadable HTML or JSON report.

### Evidence labels

| Label | Meaning |
| --- | --- |
| **Stated** | The platform export states this directly. |
| **Observed** | The information appears in your data, such as an advertiser that uploaded your details. |
| **Inferred** | AdSight derives this from observed signals. |

An export does not explain why one particular ad appeared. AdSight labels inferences and does not present them as platform-confirmed explanations.

## Supported exports

Parsers are available for Google (including YouTube), Meta (Facebook and Instagram), TikTok, and LinkedIn. Amazon and other platforms are not currently supported. Export instructions are maintained in `src/lib/guides.ts`.

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
git clone https://github.com/amalrn98/AdSight-Analytics.git
cd AdSight-Analytics
npm ci
npm run dev
```

Available checks:

```bash
npm run typecheck
npm test
npm run build
```

The production build is a static Next.js export in `out/` and can be deployed to a static host.

## Project structure

```text
src/
  app/          Next.js app shell and global styles
  components/   Upload flow, results, charts, and report dialog
  lib/          Parsers, classification, taxonomy, analysis engine, and reports
  workers/      Web Worker for browser-side analysis
tests/          Engine tests and fixtures
```

## Contributing

Contributions are welcome, especially parsers for additional platform exports, representative fixtures, and tests. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

Please follow the [Code of Conduct](CODE_OF_CONDUCT.md). To report a security issue, see [SECURITY.md](SECURITY.md).

## Maintainer

AdSight is created and maintained by [Amal Nair](https://github.com/amalrn98).

## License

Apache License 2.0. See [LICENSE](LICENSE).
