/** Shared text helpers. Nothing here touches the network or storage. */

/** Meta writes UTF-8 bytes as separate \u00XX escapes. Undo that, strictly. */
export function fixMojibake(s: string): string {
  if (!/[\u0080-\u00ff]/.test(s)) return s;
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 0xff) return s;
  try {
    const bytes = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return s;
  }
}

export function fixMojibakeDeep<T>(v: T): T {
  if (typeof v === "string") return fixMojibake(v) as unknown as T;
  if (Array.isArray(v)) return v.map(fixMojibakeDeep) as unknown as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[fixMojibake(k)] = fixMojibakeDeep(val);
    return out as T;
  }
  return v;
}

export function normalize(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();
}

export function normKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Normalised seconds or milliseconds to ms. Returns undefined for junk. */
export function toMs(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number") {
    if (!Number.isFinite(v) || v <= 0) return undefined;
    if (v < 1e11) return v * 1000;
    if (v > 1e14) return Math.round(v / 1000); // microseconds
    return v;
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (/^\d{9,16}$/.test(t)) return toMs(Number(t));
    let s = t.replace(/\//g, "-");
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) s = s.replace(" ", "T") + "Z";
    s = s.replace(/ UTC$/, "Z").replace(/Z+$/, "Z");
    const ms = Date.parse(s);
    return Number.isFinite(ms) && ms > 0 ? ms : undefined;
  }
  return undefined;
}

export function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

export function domainOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

let counter = 0;
export function uid(prefix = "s"): string {
  counter += 1;
  return `${prefix}${counter.toString(36)}`;
}

/** Depth-first walk over parsed JSON, calling cb for every object and array. */
export function walk(node: unknown, cb: (n: unknown, key: string | undefined, parent: unknown) => void, key?: string, parent?: unknown): void {
  cb(node, key, parent);
  if (Array.isArray(node)) {
    for (const x of node) walk(x, cb, key, node);
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) walk(v, cb, k, node);
  }
}

export function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Case-insensitive, punctuation-insensitive property read. */
export function prop(o: Record<string, unknown>, ...names: string[]): unknown {
  const want = names.map(normKey);
  for (const k of Object.keys(o)) if (want.includes(normKey(k))) return o[k];
  return undefined;
}

export function str(v: unknown): string | undefined {
  if (typeof v === "string") {
    const t = v.trim();
    return t ? t : undefined;
  }
  if (typeof v === "number") return String(v);
  return undefined;
}

/** All meaningful string leaves under a node, skipping urls and noise keys. */
export function collectStrings(node: unknown, skipKeys: string[] = ["href", "uri", "url", "timestamp", "fbid", "id", "media"]): string[] {
  const out: string[] = [];
  const skip = new Set(skipKeys.map(normKey));
  const visit = (n: unknown, k?: string) => {
    if (typeof n === "string") {
      const t = n.trim();
      if (t && !isUrl(t) && !/^\d+$/.test(t) && !(k && skip.has(normKey(k)))) out.push(t);
    } else if (Array.isArray(n)) n.forEach((x) => visit(x, k));
    else if (isObj(n)) for (const [kk, v] of Object.entries(n)) if (!skip.has(normKey(kk))) visit(v, kk);
  };
  visit(node);
  return out;
}

/* ------------------------------ user agent parsing ------------------------------ */

export interface UA {
  label: string;
  os?: string;
  kind: "phone" | "tablet" | "computer" | "unknown";
}

export function parseUserAgent(ua: string): UA {
  const s = ua || "";
  let os: string | undefined;
  let kind: UA["kind"] = "unknown";
  let device = "";
  if (/iPhone/i.test(s)) { os = "iOS"; kind = "phone"; device = "iPhone"; }
  else if (/iPad/i.test(s)) { os = "iPadOS"; kind = "tablet"; device = "iPad"; }
  else if (/Android/i.test(s)) {
    os = "Android";
    kind = /Mobile/i.test(s) ? "phone" : "tablet";
    const m = s.match(/;\s*([^;()]+?)\s+Build\//) || s.match(/Android[^;]*;\s*([^;)]+)/);
    device = m && !/^(wv|U|en|Linux)/i.test(m[1]) ? m[1].trim() : "Android device";
  } else if (/Windows/i.test(s)) { os = "Windows"; kind = "computer"; device = "Windows computer"; }
  else if (/Macintosh|Mac OS X/i.test(s)) { os = "macOS"; kind = "computer"; device = "Mac"; }
  else if (/CrOS/i.test(s)) { os = "ChromeOS"; kind = "computer"; device = "Chromebook"; }
  else if (/Linux|X11/i.test(s)) { os = "Linux"; kind = "computer"; device = "Linux computer"; }
  let app = "";
  if (/Instagram/i.test(s)) app = "Instagram app";
  else if (/FBAN|FBAV|FB_IAB/i.test(s)) app = "Facebook app";
  else if (/musical_ly|TikTok|BytedanceWebview/i.test(s)) app = "TikTok app";
  else if (/LinkedInApp/i.test(s)) app = "LinkedIn app";
  else if (/Edg\//i.test(s)) app = "Edge";
  else if (/OPR\//i.test(s)) app = "Opera";
  else if (/Firefox|FxiOS/i.test(s)) app = "Firefox";
  else if (/Chrome|CriOS/i.test(s)) app = "Chrome";
  else if (/Safari/i.test(s)) app = "Safari";
  if (!device) return { label: s.slice(0, 60) || "Unknown device", kind };
  return { label: app ? `${device} (${app})` : device, os, kind };
}
