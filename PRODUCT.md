# AdSight Product Direction

AdSight is an open source web app that shows people how and why ads are
targeted at them, using the data exports they already have from social and
search platforms.

## Direction

- Real analysis of real exports (Google, Meta, TikTok, LinkedIn, more to
  come). No simulated ads.
- Voluntary and permissioned. The user chooses what to upload and consents
  first. No background capture, scraping, or credential collection.
- Nothing is stored. Analysis runs in the browser, and everything is gone
  when the session ends or the user erases it.
- Mostly frontend. A static site with no backend, deployed on Vercel.
- Every finding shows its evidence and is labelled stated, observed or
  inferred, so the app never claims more than the export supports.

## What the user gets

- A detailed breakdown of advertisers, interests and audiences found in
  their data, with categories, sub-categories and sub-sub-categories.
- The how, why, when and where behind each finding, as far as the exports
  allow.
- A full dashboard and a downloadable report.

## Next

1. Deploy the current build to Vercel.
2. Add parsers for more platforms (Amazon first).
3. Expand test fixtures for each parser.
4. Cross-platform view: the same advertiser or interest seen across
   several exports.
5. Plain-language explanations of what each export type can and cannot show.

## Boundaries

AdSight does not scrape other apps, intercept network traffic, or use
private advertising APIs. It reports what is in the data the user provides
and labels anything it infers.

This is a direction document, not a claim that every item above is done.
