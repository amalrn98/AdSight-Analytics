import { emptyOutput, type ParseOutput, type PlatformId, type Signal } from "../types";
import { domainOf, isObj, prop, str, toMs, uid } from "../text";

export const GOOGLE_KEY_FILES: { test: RegExp; label: string }[] = [
  { test: /myactivity\.json$/i, label: "My Activity (Search, Maps, Shopping, Ads...)" },
  { test: /watch-history\.json$/i, label: "YouTube watch history" },
  { test: /search-history\.json$/i, label: "YouTube search history" },
  { test: /(^|\/)installs\.json$/i, label: "Google Play installs" },
  { test: /(browserhistory|history)\.json$/i, label: "Chrome browsing history" },
];

export function isGoogleRelevant(path: string): boolean {
  const p = path.toLowerCase();
  const name = p.split("/").pop() ?? "";
  if (name === "myactivity.json" || name === "watch-history.json" || name === "search-history.json") return true;
  if (name === "installs.json" && p.includes("play")) return true;
  if ((name === "browserhistory.json" || name === "history.json") && p.includes("chrome")) return true;
  if (name === "subscriptions.csv") return true;
  if (name === "profile.json" && p.includes("profile")) return true;
  if (name === "saved places.json" || name === "purchase history.json") return true;
  return false;
}

const sig = (platform: PlatformId, kind: Signal["kind"], basis: Signal["basis"], text: string, source: string, ts?: number, note?: string): Signal => ({
  id: uid(),
  platform,
  kind,
  basis,
  text,
  ts,
  source,
  note,
});

const PREFIX = /^(searched for|watched|visited|viewed|used|liked|shared|disliked|subscribed to|gesucht nach|angesehen|recherch[eé]|busc[oó]|vio|visit[oó])\s+/i;

function cleanTitle(t: string): string {
  return t.replace(PREFIX, "").trim();
}

export function parseGoogleJson(path: string, json: unknown): ParseOutput {
  const out = emptyOutput();
  const lp = path.toLowerCase();
  const name = lp.split("/").pop() ?? "";
  const start = () => out.signals.length + out.devices.length + out.places.length + out.profile.length;
  const s0 = start();

  // Activity-style arrays: My Activity, YouTube history
  if (Array.isArray(json) && (name === "myactivity.json" || name === "watch-history.json" || name === "search-history.json")) {
    for (const e of json) {
      if (!isObj(e)) continue;
      const header = (str(prop(e, "header")) ?? "").toLowerCase();
      const title = str(prop(e, "title")) ?? "";
      const url = str(prop(e, "titleUrl"));
      const ts = toMs(prop(e, "time"));
      const details = Array.isArray(prop(e, "details")) ? (prop(e, "details") as unknown[]) : [];
      const fromAds = details.some((d) => isObj(d) && /google ads|ads/i.test(str(prop(d, "name")) ?? ""));
      const isYoutube = header.includes("youtube") || name !== "myactivity.json";
      const platform: PlatformId = isYoutube ? "youtube" : "google";
      const subtitles = Array.isArray(prop(e, "subtitles")) ? (prop(e, "subtitles") as unknown[]) : [];
      const channel = isObj(subtitles[0]) ? str(prop(subtitles[0] as Record<string, unknown>, "name")) : undefined;
      if (!title) continue;
      const text = cleanTitle(title);
      if (!text) continue;
      const searched = /^(searched for|gesucht nach|recherch|busc)/i.test(title) || name === "search-history.json";
      if (fromAds || header === "ads") {
        out.signals.push(sig(platform, "ad-click", "observed", text, path, ts, "Marked as coming from Google Ads"));
      } else if (searched) {
        out.signals.push(sig(platform, "search", "observed", text, path, ts, header || undefined));
      } else if (isYoutube && /^(watched|angesehen|vio)/i.test(title)) {
        out.signals.push(sig(platform, "watch", "observed", channel ? `${text} ${channel}` : text, path, ts, channel ? `Channel: ${channel}` : undefined));
      } else if (header.includes("play")) {
        out.signals.push(sig(platform, "install", "observed", text, path, ts, header));
      } else if (header.includes("shopping")) {
        out.signals.push(sig(platform, "purchase", "observed", text, path, ts, header));
      } else {
        const dom = url ? domainOf(url) : undefined;
        out.signals.push(sig(platform, "visit", "observed", dom ? `${text} ${dom}` : text, path, ts, header || undefined));
      }
    }
  }

  // Chrome browsing history
  if (isObj(json) && (name === "browserhistory.json" || name === "history.json")) {
    const list = prop(json, "Browser History");
    if (Array.isArray(list)) {
      for (const e of list) {
        if (!isObj(e)) continue;
        const title = str(prop(e, "title"));
        const url = str(prop(e, "url"));
        const ts = toMs(prop(e, "time_usec"));
        const dom = url ? domainOf(url) : undefined;
        if (title || dom) out.signals.push(sig("google", "visit", "observed", `${title ?? ""} ${dom ?? ""}`.trim(), path, ts, "Chrome history"));
      }
    }
  }

  // Google Play installs (also tells us which devices the account used)
  if (name === "installs.json" && Array.isArray(json)) {
    const devices = new Map<string, { label: string; count: number; first?: number; last?: number }>();
    for (const e of json) {
      if (!isObj(e)) continue;
      const inst = prop(e, "install");
      if (!isObj(inst)) continue;
      const doc = prop(inst, "doc");
      const title = isObj(doc) ? str(prop(doc, "title")) : undefined;
      const ts = toMs(prop(inst, "firstInstallationTime"));
      if (title) out.signals.push(sig("google", "install", "observed", title, path, ts, "Installed from Google Play"));
      const dev = prop(inst, "deviceAttribute");
      if (isObj(dev)) {
        const label = str(prop(dev, "deviceDisplayName")) ?? [str(prop(dev, "manufacturer")), str(prop(dev, "modelName", "model"))].filter(Boolean).join(" ");
        if (label) {
          const d = devices.get(label) ?? { label, count: 0 };
          d.count += 1;
          if (ts) { d.first = Math.min(d.first ?? ts, ts); d.last = Math.max(d.last ?? ts, ts); }
          devices.set(label, d);
        }
      }
    }
    for (const d of devices.values())
      out.devices.push({ platform: "google", label: d.label, os: "Android", kind: "phone", firstSeen: d.first, lastSeen: d.last, count: d.count, detail: `${d.count} Play Store installs`, source: path });
  }

  // Profile: age and gender are attributes advertisers can target on
  if (name === "profile.json" && isObj(json)) {
    const g = prop(json, "gender");
    const gender = isObj(g) ? str(prop(g, "type")) : undefined;
    if (gender) out.profile.push({ platform: "google", key: "Gender", values: [gender], source: path });
    const b = prop(json, "birthday");
    const bday = isObj(b) ? str(prop(b, "value")) : str(b);
    const y = bday?.match(/(19|20)\d{2}/)?.[0];
    if (y) {
      const age = new Date().getFullYear() - Number(y);
      const band = age < 18 ? "Under 18" : age < 25 ? "18 to 24" : age < 35 ? "25 to 34" : age < 45 ? "35 to 44" : age < 55 ? "45 to 54" : age < 65 ? "55 to 64" : "65 and over";
      out.profile.push({ platform: "google", key: "Age range", values: [band], source: path });
    }
  }

  // Saved places and purchases
  if (name === "saved places.json" && isObj(json)) {
    const feats = prop(json, "features");
    if (Array.isArray(feats)) {
      for (const f of feats) {
        if (!isObj(f)) continue;
        const props = prop(f, "properties");
        if (!isObj(props)) continue;
        const title = str(prop(props, "Title", "name"));
        const loc = prop(props, "Location");
        const biz = isObj(loc) ? str(prop(loc, "Business Name")) : undefined;
        const label = biz ?? title;
        if (label) {
          out.places.push({ platform: "google", label, kind: "saved", ts: toMs(prop(props, "Published", "Updated")), source: path });
          out.signals.push(sig("google", "visit", "observed", label, path, undefined, "Saved place in Google Maps"));
        }
      }
    }
  }
  if (name === "purchase history.json" && Array.isArray(json)) {
    for (const e of json) {
      if (!isObj(e)) continue;
      const p = prop(e, "purchaseHistory");
      const doc = isObj(p) ? prop(p, "doc") : undefined;
      const title = isObj(doc) ? str(prop(doc, "title")) : undefined;
      const ts = isObj(p) ? toMs(prop(p, "purchaseTime")) : undefined;
      if (title) out.signals.push(sig("google", "purchase", "observed", title, path, ts, "Google Play purchase"));
    }
  }

  out.coverage.push({ path, platform: name === "watch-history.json" || name === "search-history.json" ? "youtube" : "google", read: true, records: start() - s0 });
  return out;
}

export function parseGoogleCsv(path: string, rows: string[][]): ParseOutput {
  const out = emptyOutput();
  const name = (path.toLowerCase().split("/").pop() ?? "");
  if (name === "subscriptions.csv" && rows.length > 1) {
    const header = rows[0].map((h) => h.toLowerCase());
    const ti = header.findIndex((h) => /title/.test(h));
    if (ti >= 0)
      for (const r of rows.slice(1)) {
        const t = r[ti]?.trim();
        if (t) out.signals.push(sig("youtube", "follow", "observed", t, path, undefined, "YouTube subscription"));
      }
  }
  out.coverage.push({ path, platform: "youtube", read: true, records: out.signals.length });
  return out;
}
