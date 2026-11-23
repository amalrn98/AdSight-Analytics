# AdSight

**See how advertisers can target you, and why.**

AdSight is an open source web app. You upload the data exports you already
have from Google, Meta (Facebook and Instagram), TikTok, LinkedIn and others,
and it analyses them in your browser to show how, why, when and where ads
reach you. It works on your real data. Nothing is simulated.

## Privacy

- Static site. There is no backend, so there is nothing that could receive,
  log or store your data.
- Analysis runs in a web worker in your browser tab.
- A strict Content Security Policy (see `vercel.json`) blocks all outside
  network connections from the page.
- You choose what to upload, behind an explicit consent step. There is no
  background capture, scraping, or credential collection.
- Closing the session, or using the erase control, clears everything.

These describe how the app is built, not a legal certification. Check the
network tab yourself; the code is here to read.

## What it shows

- Advertisers and ad topics found in your exports, with counts and dates.
- Interest and audience categories (category, sub-category, sub-sub-category).
- Devices, platforms and timing patterns where the export contains them.
- The evidence behind each finding, so you can see what it came from.
- A downloadable report of the full analysis.

### What counts as evidence

AdSight separates three kinds of statements:

| Label | Meaning |
| --- | --- |
| **Stated** | The platform export says it directly. |
| **Observed** | Seen in your data, such as an advertiser that uploaded your details. |
| **Inferred** | Calculated by AdSight from observed signals. |

No export explains why one specific ad appeared. Where a "why" is an
inference, it is labelled as one.

## Supported exports

Parsers exist for Google (including YouTube), Meta (Facebook and Instagram),
TikTok and LinkedIn. Amazon and other platforms are not parsed yet.
Step-by-step instructions for requesting each export are in
`src/lib/guides.ts`.

## Development

Requirements: Node.js 22 or newer, npm.

```bash
git clone https://github.com/amalrn98/AdSight-Android-App.git
cd AdSight-Android-App
npm install
npm run dev
```

Scripts:

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # static export to out/
```

Deploys to Vercel as a static Next.js site (`output: "export"`).

## Structure

```text
src/
  app/          Next.js app shell and global styles
  components/   UI: upload flow, results, charts, report dialog
  lib/          Parsers, classification, taxonomy, analysis engine, report
  workers/      Web worker that runs the analysis off the main thread
tests/          Engine tests and fixtures
```

## Contributing

Parsers for more platforms are the most useful contribution. A parser reads
one export format and returns normalised signals; see `src/lib/parsers/` and
add a fixture in `tests/fixtures/`.

## License

Apache License 2.0. See `LICENSE`.
