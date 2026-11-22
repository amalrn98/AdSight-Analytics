import { describe, expect, it } from "vitest";
import { matchLabel, matchText } from "../src/lib/classify";
import { TAXONOMY } from "../src/lib/taxonomy";
import { fixMojibake, parseUserAgent, toMs } from "../src/lib/text";
import { ingest, isCandidate, parseCsv } from "../src/lib/ingest";
import { analyze, recencyFactor, scoreEvidence } from "../src/lib/engine";
import { syntheticExport } from "./fixtures/build";

describe("text helpers", () => {
  it("repairs Meta's double-encoded UTF-8 and leaves clean text alone", () => {
    expect(fixMojibake("caf\u00c3\u00a9")).toBe("café");
    expect(fixMojibake("café")).toBe("café");
    expect(fixMojibake("plain")).toBe("plain");
  });
  it("normalises timestamps in seconds, ms and strings", () => {
    expect(toMs(1730000000)).toBe(1730000000000);
    expect(toMs(1730000000000)).toBe(1730000000000);
    expect(toMs("2024-10-03 12:00:00")).toBe(Date.parse("2024-10-03T12:00:00Z"));
    expect(toMs("2024/10/03 12:00:00 UTC")).toBe(Date.parse("2024-10-03T12:00:00Z"));
    expect(toMs("nope")).toBeUndefined();
  });
  it("parses user agents", () => {
    expect(parseUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) FBAN/FBIOS").label).toBe("iPhone (Facebook app)");
    expect(parseUserAgent("Instagram 300 Android (33/13; 420dpi; Pixel 7; Google)").os).toBe("Android");
  });
});

describe("taxonomy", () => {
  it("has three levels, unique ids and inherited sensitivity", () => {
    expect(TAXONOMY.roots.length).toBeGreaterThan(20);
    const leaves = [...TAXONOMY.nodes.values()].filter((n) => n.level === 3);
    expect(leaves.length).toBeGreaterThan(150);
    expect(new Set(TAXONOMY.nodes.keys()).size).toBe(TAXONOMY.nodes.size);
    expect(TAXONOMY.nodes.get("health-and-wellness/medical-and-conditions/mental-health")?.sensitive).toBe("health");
    expect(TAXONOMY.nodes.get("automotive/cars-and-trucks/electric-vehicles")?.sensitive).toBeUndefined();
  });
  it("matches the longest phrase and does not double count", () => {
    const m = matchText("Uber Eats near me");
    expect(m.map((x) => x.matched)).toContain("uber eats");
    expect(m.map((x) => x.matched)).not.toContain("uber");
  });
  it("places platform labels by name, keyword and word overlap, or reports nothing", () => {
    expect(matchLabel("Pet Supplies").length).toBeGreaterThan(0);
    expect(matchLabel("Tennis")[0].id).toContain("tennis");
    expect(matchLabel("Zorblax Futures")).toHaveLength(0);
  });
});

describe("scoring", () => {
  it("rewards corroboration across mechanisms more than repetition inside one", () => {
    const one = scoreEvidence([{ mechanism: "search", weight: 0.5 }, { mechanism: "search", weight: 0.5 }, { mechanism: "search", weight: 0.5 }]);
    const two = scoreEvidence([{ mechanism: "search", weight: 0.5 }, { mechanism: "ad-interaction", weight: 0.7 }]);
    expect(two).toBeGreaterThan(0.5);
    expect(one).toBeLessThan(0.8);
    expect(scoreEvidence([])).toBe(0);
  });
  it("decays old behaviour but never old platform statements", () => {
    const now = Date.now();
    expect(recencyFactor(now - 1000 * 86400000 * 3, now, false)).toBe(0.25);
    expect(recencyFactor(now - 1000 * 86400000 * 3, now, true)).toBe(1);
  });
});

describe("end to end on synthetic exports", () => {
  it("only reads files it recognises and skips messages", () => {
    const files = syntheticExport();
    const read = files.filter((f) => isCandidate(f.path)).map((f) => f.path);
    expect(read.some((p) => p.includes("messages"))).toBe(false);
    expect(read.some((p) => p.endsWith(".html"))).toBe(false);
    expect(read.length).toBeGreaterThan(10);
  });

  it("parses every platform and joins advertisers to impressions", async () => {
    const parsed = await ingest(syntheticExport());
    expect(parsed.warnings.join(" ")).toMatch(/HTML/);
    const platforms = new Set(parsed.signals.map((s) => s.platform));
    for (const p of ["instagram", "facebook", "google", "youtube", "tiktok", "linkedin"]) expect(platforms.has(p as never)).toBe(true);

    const a = analyze(parsed, { timezone: "UTC", now: 1_731_000_000_000 });
    const nike = a.advertisers.find((x) => x.name === "Nike")!;
    expect(nike.methods).toEqual(["remarketing"]);
    expect(nike.impressions).toBe(2);
    expect(nike.reason).toMatch(/remarketing/);
    expect(nike.reason).toMatch(/2 ads shown/);
    expect(a.advertisers.find((x) => x.name === "Acme Bank")!.reason).toMatch(/customer list/);
    const spotify = a.advertisers.find((x) => x.name === "Spotify")!;
    expect(spotify.clicks).toBe(1);
    expect(spotify.reason).toMatch(/does not say why/);

    // stated interest with no taxonomy fit stays visible under the platform's own label
    expect(Object.values(a.nodes).some((n) => n.unmapped && n.name === "Zorblax Futures")).toBe(true);
    // TikTok comma-separated categories were split
    expect(parsed.signals.filter((s) => s.platform === "tiktok" && s.kind === "stated-interest").map((s) => s.text)).toEqual(["Apparel & Accessories", "Games", "Pets"]);
    // repeated EV searches plus an ad click corroborate across mechanisms
    const ev = a.nodes["automotive/cars-and-trucks/electric-vehicles"];
    expect(ev.mechanisms).toEqual(expect.arrayContaining(["search", "ad-interaction"]));
    expect(ev.origin).toBe("inferred");
    expect(ev.score).toBeGreaterThan(0.5);
    // a platform-stated interest is labelled as stated
    expect(a.nodes["sports-and-fitness/individual-and-racing-sports/tennis-and-golf"].origin).toBe("stated");
    // parents roll up their children
    expect(a.nodes["automotive"].evidenceCount).toBeGreaterThanOrEqual(ev.evidenceCount);
    // devices from several platforms and a login place
    expect(a.devices.map((d) => d.platform)).toEqual(expect.arrayContaining(["instagram", "facebook", "tiktok", "google"]));
    expect(a.places.some((p) => p.label.includes("Leeds"))).toBe(true);
    // LinkedIn attributes kept verbatim for the profile view
    expect(a.profile.find((p) => p.platform === "linkedin" && p.key === "Job Titles")?.values).toEqual(["Software Engineer", "Team Lead"]);
    // the "From Google Ads" activity became an ad interaction
    expect(parsed.signals.some((s) => s.kind === "ad-click" && s.platform === "google")).toBe(true);
    expect(a.counts.signals).toBe(parsed.signals.length);
  });

  it("handles LinkedIn CSV preambles", () => {
    expect(parseCsv('Notes:\n"x"\nFirst Name,Last Name\nA,B\n').length).toBeGreaterThan(2);
  });
});

describe("sensitive topics", () => {
  it("can be left out entirely, including from parent scores and advertiser categories", async () => {
    const files = syntheticExport();
    files.push({ path: "Takeout/My Activity/Search/MyActivity.json", size: 1, text: async () => JSON.stringify([{ header: "Search", title: "Searched for anxiety therapy near me", time: "2024-10-02T10:00:00.000Z" }]) });
    const parsed = await ingest(files);
    const full = analyze(parsed, { timezone: "UTC" });
    const safe = analyze(parsed, { timezone: "UTC", excludeSensitive: true });
    expect(Object.keys(full.nodes).some((id) => id.startsWith("health-and-wellness"))).toBe(true);
    expect(Object.keys(safe.nodes).some((id) => id.startsWith("health-and-wellness"))).toBe(false);
    expect(Object.values(safe.nodes).some((n) => n.sensitive)).toBe(false);
    expect(Object.values(safe.nodes).some((n) => n.unmapped)).toBe(false);
  });
});
