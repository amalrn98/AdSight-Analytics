import { beforeAll, describe, expect, it, vi } from "vitest";
import { analyze } from "../src/lib/engine";
import { emptyOutput } from "../src/lib/types";
import { buildReportHtml, redactForReport, type ReportOptions } from "../src/lib/report";

// The report renders charts to SVG through the DOM. The tests run in node, so stand in a minimal DOM.
// Chart output is irrelevant here; only the evidence-derived text is under test.
vi.mock("react-dom/client", () => ({ createRoot: () => ({ render: () => {}, unmount: () => {} }) }));
vi.mock("react-dom", () => ({ flushSync: (fn: () => void) => fn() }));

const SECRET_TEXT = "ZQ7SECRETSEARCH order dinner from uber eats tonight";
const SECRET_MATCHED = "uber eats"; // taxonomy keyword that matches the text above
const SECRET_NOTE = "ZQ7SECRETNOTE";

const analysis = () => {
  const parsed = emptyOutput();
  parsed.signals.push({
    id: "s-1",
    platform: "google",
    kind: "search",
    basis: "observed",
    text: SECRET_TEXT,
    ts: Date.UTC(2024, 9, 2, 10),
    source: "Takeout/My Activity/Search/MyActivity.json",
    note: SECRET_NOTE,
  });
  return analyze(parsed, { timezone: "UTC", now: Date.UTC(2024, 10, 1) });
};

const opts = (over: Partial<ReportOptions> = {}): ReportOptions => ({ includeSensitive: true, includePlaces: true, includeEvidenceText: true, ...over });

beforeAll(() => {
  vi.stubGlobal("document", { createElement: () => ({ innerHTML: "<svg></svg>" }) });
});

describe("report evidence redaction", () => {
  it("test data really matches on the keyword (guards against a vacuous test)", () => {
    const items = Object.values(analysis().nodes).flatMap((n) => n.evidence);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((e) => e.matched === SECRET_MATCHED && e.note === SECRET_NOTE)).toBe(true);
  });

  it("removes text, matched keyword and note from the JSON export when evidence text is off", () => {
    const json = JSON.stringify(redactForReport(analysis(), opts({ includeEvidenceText: false })));
    expect(json).not.toContain("ZQ7SECRETSEARCH");
    expect(json).not.toContain(SECRET_MATCHED);
    expect(json).not.toContain(SECRET_NOTE);
    expect(json).toContain("(hidden)");
  });

  it("removes them from the HTML report when evidence text is off", () => {
    const html = buildReportHtml(redactForReport(analysis(), opts({ includeEvidenceText: false })), opts({ includeEvidenceText: false }));
    expect(html).not.toContain("ZQ7SECRETSEARCH");
    expect(html).not.toContain(SECRET_MATCHED);
    expect(html).not.toContain(SECRET_NOTE);
    expect(html).not.toContain("matched on");
  });

  it("keeps everything when evidence text is on", () => {
    const o = opts({ includeEvidenceText: true });
    const json = JSON.stringify(redactForReport(analysis(), o));
    expect(json).toContain("ZQ7SECRETSEARCH");
    expect(json).toContain(SECRET_MATCHED);
    expect(json).toContain(SECRET_NOTE);
    const html = buildReportHtml(redactForReport(analysis(), o), o);
    expect(html).toContain("ZQ7SECRETSEARCH");
    expect(html).toContain(`matched on "${SECRET_MATCHED}"`);
  });

  it("does not mutate the analysis it was given", () => {
    const a = analysis();
    redactForReport(a, opts({ includeEvidenceText: false }));
    expect(JSON.stringify(a)).toContain(SECRET_MATCHED);
  });
});
