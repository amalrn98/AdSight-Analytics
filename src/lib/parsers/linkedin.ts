import { emptyOutput, type ParseOutput, type Signal } from "../types";
import { normKey, parseUserAgent, toMs, uid } from "../text";

export const LINKEDIN_KEY_FILES: { test: RegExp; label: string }[] = [
  { test: /ad[_ ]?targeting\.csv$/i, label: "Ad Targeting" },
  { test: /ads[_ ]?clicked\.csv$/i, label: "Ads Clicked" },
  { test: /inferences[_ ]?about[_ ]?you\.csv$/i, label: "Inferences about you" },
];

const NAMES = /(^|\/)(ad[_ ]?targeting|ads[_ ]?clicked|inferences[_ ]?about[_ ]?you|search ?queries|logins|company[_ ]?follows|skills|positions|profile|member[_ ]?follows|learning|registration)\.csv$/i;

export function isLinkedInRelevant(path: string): boolean {
  return NAMES.test(path.toLowerCase().replace(/ /g, " "));
}

/** Some LinkedIn files have note lines above the header. Find the real header row. */
export function tableFromRows(rows: string[][]): { header: string[]; body: string[][] } {
  let h = 0;
  for (let i = 0; i < Math.min(rows.length - 1, 8); i++) {
    const w = rows[i].filter((c) => c.trim()).length;
    if (w >= 2 && rows[i + 1].length >= rows[i].length - 1) {
      h = i;
      break;
    }
  }
  return { header: (rows[h] ?? []).map((c) => c.trim()), body: rows.slice(h + 1).filter((r) => r.some((c) => c.trim())) };
}

const sig = (kind: Signal["kind"], basis: Signal["basis"], text: string, source: string, ts?: number, note?: string): Signal => ({
  id: uid(),
  platform: "linkedin",
  kind,
  basis,
  text,
  ts,
  source,
  note,
});

const splitCell = (c: string) =>
  c
    .split(/;|\n|\|/)
    .map((x) => x.trim())
    .filter((x) => x && x.length < 120);

export function parseLinkedInCsv(path: string, rows: string[][]): ParseOutput {
  const out = emptyOutput();
  const name = normKey(path.split("/").pop() ?? "").replace(/csv$/, "");
  const { header, body } = tableFromRows(rows);
  const col = (re: RegExp) => header.findIndex((h) => re.test(h));
  const s0 = () => out.signals.length + out.devices.length + out.logins.length + out.profile.length;
  const before = s0();

  if (name === "adtargeting") {
    // One row of attributes LinkedIn can use to target ads at you.
    for (const r of body)
      header.forEach((h, i) => {
        const values = splitCell(r[i] ?? "");
        if (!h || !values.length) return;
        out.profile.push({ platform: "linkedin", key: h, values, source: path });
        const classify = !/gender|locale|graduation|years|growth|size|degree/i.test(h);
        if (classify) for (const v of values) out.signals.push(sig("profile-attribute", "stated", v, path, undefined, `LinkedIn targeting attribute: ${h}`));
      });
  } else if (name === "adsclicked") {
    const di = col(/date/i);
    const ai = col(/ad|title|id/i);
    for (const r of body) out.signals.push(sig("ad-click", "observed", (r[ai] ?? "LinkedIn ad").trim(), path, toMs(r[di]), "Ad clicked (LinkedIn exports only the ad id)"));
  } else if (name === "inferencesaboutyou") {
    const ci = col(/category/i);
    const ti = col(/type/i);
    const ii = col(/inference/i);
    const di = col(/description/i);
    for (const r of body) {
      const text = [r[ii], r[ci], r[di]].filter(Boolean).join(" ").trim();
      if (text) out.signals.push(sig("platform-inference", "stated", text, path, undefined, `LinkedIn inference${r[ti] ? ` (${r[ti]})` : ""}`));
    }
  } else if (name === "searchqueries") {
    const di = col(/date|time/i);
    const qi = col(/query|search/i);
    for (const r of body) if (r[qi]) out.signals.push(sig("search", "observed", r[qi].trim(), path, toMs(r[di])));
  } else if (name === "logins") {
    const di = col(/date|time/i);
    const ipi = col(/ip/i);
    const uai = col(/agent/i);
    for (const r of body) {
      const ua = r[uai] ?? "";
      const p = ua ? parseUserAgent(ua) : undefined;
      const ts = toMs(r[di]);
      if (p) out.devices.push({ platform: "linkedin", label: p.label, os: p.os, kind: p.kind, lastSeen: ts, firstSeen: ts, count: 1, source: path });
      out.logins.push({ platform: "linkedin", ts, ip: r[ipi]?.trim() || undefined, device: p?.label, source: path });
    }
  } else if (name === "companyfollows") {
    const oi = col(/organi|company/i);
    const di = col(/follow|date/i);
    for (const r of body) if (r[oi]) out.signals.push(sig("follow", "observed", r[oi].trim(), path, toMs(r[di]), "Company followed"));
  } else if (name === "skills") {
    for (const r of body) if (r[0]) out.signals.push(sig("profile-attribute", "observed", r[0].trim(), path, undefined, "Skill on your profile"));
  } else if (name === "positions") {
    const ti = col(/title/i);
    const ci = col(/company/i);
    for (const r of body) {
      const t = [r[ti], r[ci]].filter(Boolean).join(" ").trim();
      if (t) out.signals.push(sig("profile-attribute", "observed", t, path, undefined, "Position on your profile"));
    }
  } else if (name === "profile") {
    const ii = col(/industry/i);
    const hi = col(/headline/i);
    for (const r of body) {
      if (r[ii]) out.signals.push(sig("profile-attribute", "observed", r[ii].trim(), path, undefined, "Industry on your profile"));
      if (r[hi]) out.signals.push(sig("profile-attribute", "observed", r[hi].trim(), path, undefined, "Headline on your profile"));
    }
  }

  out.coverage.push({ path, platform: "linkedin", read: true, records: s0() - before });
  return out;
}
