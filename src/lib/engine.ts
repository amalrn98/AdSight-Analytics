import { matchLabel, matchText, type Match } from "./classify";
import { TAXONOMY } from "./taxonomy";
import { normalize } from "./text";
import type {
  AdvertiserResult,
  Analysis,
  CategoryNode,
  CoverageFile,
  DeviceRecord,
  DeviceResult,
  EvidenceItem,
  Mechanism,
  ParseOutput,
  PlatformId,
  Signal,
  SignalKind,
  Strength,
} from "./types";

const DAY = 86_400_000;

/** Base weight of one piece of evidence, by what kind of signal it is. */
const KIND_WEIGHT: Record<SignalKind, number> = {
  "stated-interest": 1.0,
  "platform-inference": 0.9,
  "profile-attribute": 0.8,
  advertiser: 0.7,
  "off-platform": 0.4,
  "ad-click": 0.7,
  purchase: 0.6,
  install: 0.4,
  follow: 0.5,
  search: 0.5,
  watch: 0.2,
  visit: 0.15,
  "ad-view": 0.1,
};

const MECHANISM: Record<SignalKind, Mechanism> = {
  "stated-interest": "stated-by-platform",
  "platform-inference": "stated-by-platform",
  "profile-attribute": "profile",
  advertiser: "advertiser-data",
  "off-platform": "off-platform-activity",
  "ad-click": "ad-interaction",
  "ad-view": "ad-interaction",
  purchase: "install-or-purchase",
  install: "install-or-purchase",
  follow: "following",
  search: "search",
  watch: "watching",
  visit: "browsing",
};

const HALF_LIFE_DAYS = 180;
const MAX_EVIDENCE_PER_NODE = 60;

export function recencyFactor(ts: number | undefined, newest: number, stated: boolean): number {
  if (stated || !ts) return 1;
  const age = Math.max(0, (newest - ts) / DAY);
  return Math.max(0.25, Math.pow(0.5, age / HALF_LIFE_DAYS));
}

/** Combine evidence: saturate within a mechanism, then combine mechanisms (corroboration). */
export function scoreEvidence(items: Pick<EvidenceItem, "mechanism" | "weight">[]): number {
  const byMech = new Map<Mechanism, number>();
  for (const e of items) byMech.set(e.mechanism, (byMech.get(e.mechanism) ?? 0) + e.weight);
  let miss = 1;
  for (const total of byMech.values()) miss *= Math.exp(-total / 1.5);
  return 1 - miss;
}

export function strengthOf(score: number): Strength {
  return score >= 0.75 ? "strong" : score >= 0.45 ? "moderate" : "weak";
}

interface Raw {
  signal: Signal;
  match: Match;
  unmappedLabel?: string;
}

export interface AnalyzeOptions {
  now?: number;
  timezone?: string;
  /** Leave out health, politics, religion, sexuality, finance-hardship and gambling topics, and platform labels we cannot judge. */
  excludeSensitive?: boolean;
}

export function analyze(parsed: ParseOutput, opts: AnalyzeOptions = {}): Analysis {
  const signals = parsed.signals;
  const times = signals.map((s) => s.ts).filter((t): t is number => !!t && t < Date.now() + 7 * DAY);
  const newest = times.length ? Math.max(...times) : opts.now ?? Date.now();
  const oldest = times.length ? Math.min(...times) : undefined;
  const tz = opts.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  /* ---- 1. place each signal in the taxonomy ---- */
  const raws: Raw[] = [];
  const unmappedRoots = new Map<string, string>(); // id -> label
  for (const s of signals) {
    if (s.kind === "ad-view" && !s.text) continue;
    const labelBased = s.kind === "stated-interest" || s.kind === "platform-inference" || s.kind === "profile-attribute";
    let matches: Match[] = labelBased ? matchLabel(s.text) : matchText(s.text);
    if (labelBased && !matches.length) matches = matchText(s.text);
    if (opts.excludeSensitive) matches = matches.filter((m) => !TAXONOMY.nodes.get(m.id)?.sensitive);
    if (matches.length) {
      for (const m of matches) raws.push({ signal: s, match: m });
    } else if ((s.kind === "stated-interest" || s.kind === "platform-inference") && !opts.excludeSensitive && !(matchLabel(s.text).length || matchText(s.text).length)) {
      const id = `platform-labelled/${normalize(s.text).replace(/ /g, "-").slice(0, 60)}`;
      unmappedRoots.set(id, s.text);
      raws.push({ signal: s, match: { id, matched: s.text }, unmappedLabel: s.text });
    }
  }

  /* ---- 2. build nodes ---- */
  const nodes: Record<string, CategoryNode> = {};
  const ensure = (id: string): CategoryNode => {
    if (nodes[id]) return nodes[id];
    const t = TAXONOMY.nodes.get(id);
    if (t) {
      nodes[id] = { id, name: t.name, path: t.path, level: t.level, parent: t.parent, children: [], sensitive: t.sensitive, score: 0, strength: "weak", origin: "inferred", evidenceCount: 0, statedCount: 0, platforms: [], mechanisms: [], recent90: 0, evidence: [] };
      if (t.parent) ensure(t.parent);
    } else {
      const label = unmappedRoots.get(id) ?? id;
      nodes["platform-labelled"] ??= { id: "platform-labelled", name: "Platform-labelled, not in AdSight's list", path: ["Platform-labelled, not in AdSight's list"], level: 1, children: [], score: 0, strength: "weak", origin: "stated", evidenceCount: 0, statedCount: 0, platforms: [], mechanisms: [], recent90: 0, evidence: [] };
      nodes[id] = { id, name: label, path: [nodes["platform-labelled"].name, label], level: 2, parent: "platform-labelled", children: [], score: 0, strength: "weak", origin: "stated", evidenceCount: 0, statedCount: 0, platforms: [], mechanisms: [], recent90: 0, evidence: [], unmapped: true };
    }
    return nodes[id];
  };

  const direct = new Map<string, EvidenceItem[]>();
  for (const r of raws) {
    const s = r.signal;
    ensure(r.match.id);
    const stated = s.basis === "stated";
    const weight = KIND_WEIGHT[s.kind] * recencyFactor(s.ts, newest, stated);
    const item: EvidenceItem = {
      id: `${s.id}:${r.match.id}`,
      platform: s.platform,
      kind: s.kind,
      mechanism: MECHANISM[s.kind],
      basis: s.basis,
      text: s.text,
      matched: r.match.matched,
      weight,
      ts: s.ts,
      source: s.source,
      note: s.note,
    };
    const arr = direct.get(r.match.id) ?? [];
    arr.push(item);
    direct.set(r.match.id, arr);
  }
  for (const n of Object.values(nodes)) if (n.parent && !nodes[n.parent].children.includes(n.id)) nodes[n.parent].children.push(n.id);

  const evidenceOf = (id: string, acc: Map<string, EvidenceItem> = new Map()): Map<string, EvidenceItem> => {
    for (const e of direct.get(id) ?? []) acc.set(e.id, e);
    for (const c of nodes[id].children) evidenceOf(c, acc);
    return acc;
  };

  const heat = (items: EvidenceItem[]) => {
    const hours = new Array(24).fill(0);
    const days = new Array(7).fill(0);
    for (const e of items) {
      if (!e.ts) continue;
      const d = new Date(e.ts);
      const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", hour12: false, weekday: "short" }).formatToParts(d);
      const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
      const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find((p) => p.type === "weekday")?.value ?? "");
      hours[h] += 1;
      if (wd >= 0) days[wd] += 1;
    }
    const total = hours.reduce((a, b) => a + b, 0);
    if (!total) return {};
    return { peakHour: hours.indexOf(Math.max(...hours)), peakWeekday: days.indexOf(Math.max(...days)) };
  };

  for (const id of Object.keys(nodes)) {
    const n = nodes[id];
    const items = [...evidenceOf(id).values()];
    n.evidenceCount = items.length;
    n.statedCount = items.filter((e) => e.basis === "stated").length;
    n.score = items.length ? scoreEvidence(items) : 0;
    n.strength = strengthOf(n.score);
    n.origin = n.statedCount > 0 || n.unmapped ? "stated" : "inferred";
    n.platforms = [...new Set(items.map((e) => e.platform))];
    n.mechanisms = [...new Set(items.map((e) => e.mechanism))];
    const ts = items.map((e) => e.ts).filter((t): t is number => !!t);
    n.firstSeen = ts.length ? Math.min(...ts) : undefined;
    n.lastSeen = ts.length ? Math.max(...ts) : undefined;
    n.recent90 = items.filter((e) => e.ts && newest - e.ts <= 90 * DAY).length;
    Object.assign(n, heat(items));
    n.evidence = items.sort((a, b) => b.weight - a.weight || (b.ts ?? 0) - (a.ts ?? 0)).slice(0, MAX_EVIDENCE_PER_NODE);
  }
  // drop nodes with no evidence (ensure() created ancestors only for evidenced leaves, so this keeps the tree tight)
  for (const id of Object.keys(nodes)) if (!nodes[id].evidenceCount) delete nodes[id];
  for (const n of Object.values(nodes)) n.children = n.children.filter((c) => nodes[c]).sort((a, b) => nodes[b].score - nodes[a].score);
  const roots = Object.values(nodes).filter((n) => !n.parent).sort((a, b) => b.score - a.score).map((n) => n.id);

  /* ---- 3. advertisers: who holds your data, and what you saw from them ---- */
  const advMap = new Map<string, AdvertiserResult>();
  const keyOf = (name: string) => normalize(name);
  const getAdv = (name: string): AdvertiserResult => {
    const k = keyOf(name);
    let a = advMap.get(k);
    if (!a) {
      a = { name, platforms: [], methods: [], impressions: 0, clicks: 0, categories: [], reason: "", sources: [] };
      advMap.set(k, a);
    }
    return a;
  };
  for (const a of parsed.advertisers) {
    const r = getAdv(a.name);
    if (!r.platforms.includes(a.platform)) r.platforms.push(a.platform);
    for (const m of a.methods) if (!r.methods.includes(m)) r.methods.push(m);
    if (!r.sources.includes(a.source)) r.sources.push(a.source);
  }
  for (const s of signals) {
    if (s.kind !== "ad-view" && s.kind !== "ad-click") continue;
    const r = getAdv(s.text);
    if (!r.platforms.includes(s.platform)) r.platforms.push(s.platform);
    if (s.kind === "ad-view") r.impressions += 1;
    else r.clicks += 1;
    if (s.ts) {
      r.firstSeen = Math.min(r.firstSeen ?? s.ts, s.ts);
      r.lastSeen = Math.max(r.lastSeen ?? s.ts, s.ts);
    }
    if (!r.sources.includes(s.source)) r.sources.push(s.source);
  }
  const advertisers: AdvertiserResult[] = [];
  for (const r of advMap.values()) {
    const cats = matchText(r.name, TAXONOMY, 3).filter((c) => !(opts.excludeSensitive && TAXONOMY.nodes.get(c.id)?.sensitive));
    r.categories = cats.map((c) => ({ id: c.id, path: TAXONOMY.nodes.get(c.id)?.path ?? [] }));
    r.reason = explainAdvertiser(r);
    advertisers.push(r);
  }
  advertisers.sort((a, b) => b.clicks * 5 + b.impressions + b.methods.length * 3 - (a.clicks * 5 + a.impressions + a.methods.length * 3));

  /* ---- 4. devices ---- */
  const devMap = new Map<string, DeviceRecord>();
  for (const d of parsed.devices) {
    const k = `${d.platform}|${d.label}`;
    const e = devMap.get(k);
    if (!e) devMap.set(k, { ...d });
    else {
      e.count += d.count;
      if (d.lastSeen) e.lastSeen = Math.max(e.lastSeen ?? 0, d.lastSeen);
      if (d.firstSeen) e.firstSeen = Math.min(e.firstSeen ?? Infinity, d.firstSeen);
    }
  }
  const devices: DeviceResult[] = [...devMap.values()].sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0));

  /* ---- 5. timeline and heatmap ---- */
  const byMonth = new Map<string, Partial<Record<PlatformId, number>>>();
  const heatmap: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "numeric", hour12: false, weekday: "short" });
  for (const s of signals) {
    if (!s.ts || s.ts > Date.now() + 7 * DAY) continue;
    const d = new Date(s.ts);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const row = byMonth.get(key) ?? {};
    row[s.platform] = (row[s.platform] ?? 0) + 1;
    byMonth.set(key, row);
    const parts = fmt.formatToParts(d);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
    const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find((p) => p.type === "weekday")?.value ?? "");
    if (wd >= 0) heatmap[wd][h] += 1;
  }
  const timeline = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, byPlatform]) => ({ month, byPlatform, total: Object.values(byPlatform).reduce((a, b) => a + (b ?? 0), 0) }));

  /* ---- 6. platform summary, coverage, gaps ---- */
  const platformIds = new Set<PlatformId>();
  signals.forEach((s) => platformIds.add(s.platform));
  parsed.devices.forEach((d) => platformIds.add(d.platform));
  parsed.advertisers.forEach((a) => platformIds.add(a.platform));
  parsed.profile.forEach((p) => platformIds.add(p.platform));
  const platforms = [...platformIds].map((id) => {
    const mine = signals.filter((s) => s.platform === id);
    const ts = mine.map((s) => s.ts).filter((t): t is number => !!t);
    return { id, signals: mine.length, stated: mine.filter((s) => s.basis === "stated").length, observed: mine.filter((s) => s.basis === "observed").length, first: ts.length ? Math.min(...ts) : undefined, last: ts.length ? Math.max(...ts) : undefined };
  });

  const signalsByKind: Record<string, number> = {};
  for (const s of signals) signalsByKind[s.kind] = (signalsByKind[s.kind] ?? 0) + 1;

  const coverage: CoverageFile[] = parsed.coverage;
  const missing = findMissing(parsed, platformIds);

  const cats = Object.values(nodes).filter((n) => n.level === 3 || n.unmapped);
  return {
    generatedAt: opts.now ?? Date.now(),
    timezone: tz,
    counts: {
      signals: signals.length,
      files: coverage.length,
      filesRead: coverage.filter((c) => c.read).length,
      advertisers: advertisers.length,
      devices: devices.length,
      categories: cats.length,
      statedCategories: cats.filter((n) => n.origin === "stated").length,
    },
    platforms,
    span: { first: oldest, last: times.length ? newest : undefined },
    nodes,
    roots,
    advertisers,
    devices,
    logins: parsed.logins,
    places: parsed.places,
    profile: parsed.profile,
    timeline,
    heatmap,
    coverage,
    missing,
    warnings: parsed.warnings,
    signalsByKind,
  };
}

/** Plain-language reason, built only from fields present in the export. */
export function explainAdvertiser(a: AdvertiserResult): string {
  const parts: string[] = [];
  if (a.methods.includes("data-file")) parts.push("this advertiser uploaded a customer list that includes you (Meta's \"data file custom audience\")");
  if (a.methods.includes("remarketing")) parts.push("you were added to a remarketing audience, usually after visiting their site or app");
  if (a.methods.includes("in-person")) parts.push("they reported an in-person store visit linked to you");
  if (!parts.length && a.methods.includes("listed")) parts.push("the platform lists them as using your activity or information, without saying how");
  let s = parts.length ? `The platform's own list says ${parts.join("; ")}.` : "";
  if (a.impressions || a.clicks) {
    const seen = `${a.impressions ? `${a.impressions} ad${a.impressions === 1 ? "" : "s"} shown` : ""}${a.impressions && a.clicks ? " and " : ""}${a.clicks ? `${a.clicks} click${a.clicks === 1 ? "" : "s"}` : ""}`;
    s += `${s ? " " : ""}Your export records ${seen} from them.`;
  }
  if (!s) s = "Appears in your export, with no targeting method stated.";
  if (!a.methods.length && (a.impressions || a.clicks)) s += " The export does not say why this ad was shown to you.";
  return s;
}

const EXPECTED: { platform: PlatformId; test: (cov: CoverageFile[]) => boolean; what: string; why: string; how: string }[] = [];

function findMissing(parsed: ParseOutput, platforms: Set<PlatformId>): Analysis["missing"] {
  const out: Analysis["missing"] = [];
  const has = (re: RegExp) => parsed.coverage.some((c) => re.test(c.path.toLowerCase()) && c.read);
  const meta = ["facebook", "instagram", "meta"].filter((p) => platforms.has(p as PlatformId)) as PlatformId[];
  for (const p of meta) {
    if (!has(/advertisers_using_your_activity/)) out.push({ platform: p, what: "Advertisers using your activity or information", why: "This list is how Meta says advertisers got you into their audiences.", how: "Request the export again with Ads information included, in JSON." });
    if (!has(/other_categories_used_to_reach_you|interest_categories|your_topics|recommended_topics/)) out.push({ platform: p, what: "Interest categories", why: "These are the topics Meta says it uses to reach you.", how: "Include Ads information and Preferences in the export." });
    if (!has(/ads_viewed/)) out.push({ platform: p, what: "Ads viewed", why: "Needed to show which advertisers you actually saw.", how: "Include Ads information in the export." });
  }
  if (platforms.has("tiktok") && !parsed.signals.some((s) => s.platform === "tiktok" && s.kind === "stated-interest")) out.push({ platform: "tiktok", what: "Ad interest categories", why: "TikTok's own list of interests used for ads.", how: "Request the full data file as JSON; some accounts have no ad interest section." });
  if (platforms.has("linkedin") && !has(/ad[_ ]?targeting/)) out.push({ platform: "linkedin", what: "Ad Targeting.csv", why: "Shows how LinkedIn classifies you for advertisers.", how: "Choose Ad Targeting when requesting your LinkedIn data archive." });
  if (platforms.has("google") || platforms.has("youtube")) out.push({ platform: "google", what: "Google ad personalisation topics", why: "Takeout does not include the interests in My Ad Center, so Google's own topics are inferred here from your activity, not read.", how: "Compare with myadcenter.google.com while signed in." });
  void EXPECTED;
  return out;
}
