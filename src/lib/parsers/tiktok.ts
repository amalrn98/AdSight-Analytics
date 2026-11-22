import { emptyOutput, type ParseOutput, type Signal } from "../types";
import { isObj, normKey, parseUserAgent, str, toMs, uid, walk } from "../text";

/** TikTok's JSON export is one nested file; sections are found by normalised key name. */
export function looksLikeTikTok(json: unknown): boolean {
  if (!isObj(json)) return false;
  const keys = Object.keys(json).map(normKey);
  return keys.includes("activity") && (keys.includes("profile") || keys.includes("appsettings") || keys.includes("adsanddata"));
}

const sig = (kind: Signal["kind"], basis: Signal["basis"], text: string, source: string, ts?: number, note?: string): Signal => ({
  id: uid(),
  platform: "tiktok",
  kind,
  basis,
  text,
  ts,
  source,
  note,
});

function listsUnder(node: unknown): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  walk(node, (n) => {
    if (Array.isArray(n)) for (const x of n) if (isObj(x)) rows.push(x);
  });
  return rows;
}

function field(row: Record<string, unknown>, ...names: string[]): string | undefined {
  const want = names.map(normKey);
  for (const [k, v] of Object.entries(row)) if (want.includes(normKey(k))) return str(v);
  return undefined;
}

export function parseTikTok(path: string, json: unknown): ParseOutput {
  const out = emptyOutput();
  if (!isObj(json)) return out;
  const start = () => out.signals.length + out.devices.length + out.logins.length;
  const s0 = start();
  // "Ad Interests" and its child "AdInterestCategories" both match, so dedupe across the whole file.
  const seen = new Set<string>();

  walk(json, (node, key) => {
    if (!key) return;
    const k = normKey(key);

    if (k === "adinterests" || k === "adinterestcategories") {
      const vals: string[] = [];
      walk(node, (n) => {
        if (typeof n === "string") vals.push(n);
      });
      for (const v of vals)
        for (const part of v.split(/\r?\n|;|,(?=\s*[A-Z])/)) {
          const t = part.trim();
          if (t.length > 1 && t.length < 90 && !seen.has(t.toLowerCase())) {
            seen.add(t.toLowerCase());
            out.signals.push(sig("stated-interest", "stated", t, path, undefined, "Ad interest category"));
          }
        }
    }

    if (k.includes("offtiktok")) {
      for (const r of listsUnder(node)) {
        const source = field(r, "source", "app", "website");
        const event = field(r, "event", "type");
        if (!source && !event) continue;
        out.signals.push(sig("off-platform", "observed", source ?? event ?? "", path, toMs(field(r, "timestamp", "date")), event));
      }
    }

    if (k === "loginhistory" || k === "loginhistorylist") {
      for (const r of listsUnder(node)) {
        const model = field(r, "devicemodel", "model");
        const system = field(r, "devicesystem", "system", "os");
        if (!model && !system) continue;
        const ts = toMs(field(r, "date", "timestamp"));
        const label = [model, system].filter(Boolean).join(", ");
        const carrier = field(r, "carrier");
        const net = field(r, "networktype");
        const ua = parseUserAgent(`${system ?? ""} ${model ?? ""}`);
        out.devices.push({ platform: "tiktok", label: label || "Unknown device", os: system ?? ua.os, kind: ua.kind, lastSeen: ts, firstSeen: ts, count: 1, detail: [carrier, net].filter(Boolean).join(", ") || undefined, source: path });
        out.logins.push({ platform: "tiktok", ts, ip: field(r, "ip", "ipaddress"), device: label, source: path });
      }
    }

    if (k === "searchhistory" || k === "searchlist") {
      for (const r of listsUnder(node)) {
        const term = field(r, "searchterm", "term", "query");
        if (term) out.signals.push(sig("search", "observed", term, path, toMs(field(r, "date", "timestamp"))));
      }
    }

    if (k === "hashtag" || k === "hashtaglist") {
      for (const r of listsUnder(node)) {
        const tag = field(r, "hashtagname", "name");
        if (tag) out.signals.push(sig("follow", "observed", tag.replace(/^#/, ""), path, undefined, "Hashtag you engaged with"));
      }
    }

    if (k === "videobrowsinghistory" || k === "videolist" || k === "watchhistory") {
      for (const r of listsUnder(node)) {
        const link = field(r, "link", "url");
        const ts = toMs(field(r, "date", "timestamp"));
        if (link || ts) out.signals.push(sig("watch", "observed", "tiktok video", path, ts, "Video watched (the export has no caption text)"));
      }
    }

    if (k === "favoritevideos" || k === "likelist" || k === "favoritevideolist") {
      for (const r of listsUnder(node)) {
        const ts = toMs(field(r, "date", "timestamp"));
        if (field(r, "link", "url") || ts) out.signals.push(sig("follow", "observed", "tiktok video", path, ts, "Video liked or favourited (no caption text in export)"));
      }
    }

    if (k.includes("shoppingproduct") || k === "productbrowsinghistory" || k === "producthistory") {
      for (const r of listsUnder(node)) {
        const name = field(r, "productname", "name");
        const shop = field(r, "shopname");
        if (name) out.signals.push(sig("visit", "observed", `${name} ${shop ?? ""}`.trim(), path, toMs(field(r, "date", "timestamp")), "TikTok Shop browsing"));
      }
    }
  });

  out.coverage.push({ path, platform: "tiktok", read: true, records: start() - s0 });
  return out;
}
