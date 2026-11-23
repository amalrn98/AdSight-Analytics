import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Heatmap, MonthBars, Sunburst } from "../components/charts";
import { MECHANISM_TEXT, STRENGTH_LABEL, WEEKDAYS, fmtDate, hourLabel, pct } from "./format";
import { PLATFORM_LABEL, type Analysis, type CategoryNode, type PlatformId } from "./types";

export interface ReportOptions {
  includeSensitive: boolean;
  includePlaces: boolean;
  includeEvidenceText: boolean;
}

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Render a React SVG chart to a string without leaving the browser. */
function svgOf(el: React.ReactElement): string {
  const host = document.createElement("div");
  const root = createRoot(host);
  flushSync(() => root.render(el));
  const html = host.innerHTML;
  root.unmount();
  return html;
}

export function redactForReport(a: Analysis, o: ReportOptions): Analysis {
  const c: Analysis = JSON.parse(JSON.stringify(a));
  if (!o.includePlaces) {
    c.places = [];
    c.logins = [];
  } else {
    c.logins = c.logins.map((l) => ({ ...l, ip: undefined }));
  }
  if (!o.includeEvidenceText) {
    // Everything on an evidence item that comes from the user's own searches, videos or ads:
    // the text, the keyword that matched it (which is usually a phrase from that text), and the extra detail line.
    for (const n of Object.values(c.nodes)) {
      for (const e of n.evidence) {
        e.text = "(hidden)";
        e.matched = "(hidden)";
        delete e.note;
      }
    }

    // An advertiser with no targeting method in the export is only known from the text of ads you saw or clicked,
    // so its name (and the topics guessed from that name) is evidence text. Advertisers the platform itself lists keep their names.
    c.advertisers = c.advertisers.map((r) => (r.methods.length ? r : { ...r, name: "(hidden)", categories: [] }));

    // A platform label AdSight could not classify is its own topic name, but it is also the evidence text.
    // Replace the label in the node's name, path and id (the id is also embedded in evidence ids).
    const alias = new Map<string, string>();
    for (const n of Object.values(c.nodes)) if (n.unmapped) alias.set(n.id, `platform-labelled/label-${alias.size + 1}`);
    if (alias.size) {
      const nodes: Record<string, CategoryNode> = {};
      for (const [id, n] of Object.entries(c.nodes)) {
        const to = alias.get(id);
        if (to) {
          n.id = to;
          n.name = `Platform label ${to.slice(to.lastIndexOf("-") + 1)}`;
          n.path = [...n.path.slice(0, -1), n.name];
        }
        n.children = n.children.map((ch) => alias.get(ch) ?? ch);
        nodes[to ?? id] = n;
      }
      c.nodes = nodes;
      const tag = ":platform-labelled/";
      for (const n of Object.values(c.nodes)) {
        for (const e of n.evidence) {
          const at = e.id.indexOf(tag);
          if (at >= 0) e.id = `${e.id.slice(0, at + 1)}${alias.get(e.id.slice(at + 1)) ?? e.id.slice(at + 1)}`;
        }
      }
    }
  }
  return c;
}

const CSS = `
:root{--ink:#17262b;--ink2:#4b5d62;--rule:#cbd3cf;--stated:#2742e6;--inf:#b86e00;--obs:#0c8a78}
*{box-sizing:border-box}body{margin:0;background:#f2f4f0;color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:980px;margin:0 auto;padding:32px 20px 80px}h1{font-size:2.4rem;line-height:1.05;margin:0 0 8px}h2{font-size:1.5rem;margin:40px 0 10px;border-top:2px solid var(--ink);padding-top:14px}h3{font-size:1.1rem;margin:0 0 4px}
p{max-width:70ch}.muted{color:var(--ink2)}table{border-collapse:collapse;width:100%;font-size:.92rem}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--rule);vertical-align:top}th{border-bottom:2px solid var(--ink)}
.chip{display:inline-block;font-size:.75rem;font-weight:600;padding:1px 7px;border-radius:99px;border:1.5px solid currentColor}.stated{color:var(--stated)}.observed{color:var(--obs)}.inferred{color:var(--inf);border-style:dashed}
.stats{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--rule);border-left:1px solid var(--rule)}.stat{padding:12px;border-right:1px solid var(--rule);border-bottom:1px solid var(--rule)}.stat b{display:block;font-size:1.8rem}
.topic{border-top:1px solid var(--rule);padding:12px 0;break-inside:avoid}.topic small{color:var(--ink2);display:block}.note{border-left:4px solid var(--inf);background:#fff;padding:8px 14px;margin:14px 0}
@media(max-width:700px){.stats{grid-template-columns:repeat(2,1fr)}}@media print{body{background:#fff}main{padding:0}}
`;

export function buildReportHtml(a: Analysis, o: ReportOptions): string {
  const tz = a.timezone;
  const platforms = a.platforms.map((p) => p.id) as PlatformId[];
  const topics = Object.values(a.nodes)
    .filter((n) => n.level === 3 || n.unmapped)
    .sort((x, y) => y.score - x.score)
    .slice(0, 60);
  const map = svgOf(createElement(Sunburst, { nodes: a.nodes, roots: a.roots, size: 620 }));
  const bars = a.timeline.length ? svgOf(createElement(MonthBars, { timeline: a.timeline, platforms })) : "";
  const heat = svgOf(createElement(Heatmap, { grid: a.heatmap }));

  const topicHtml = topics
    .map((n) => {
      const ev = n.evidence.slice(0, 4).map((e) => `<li><span class="chip ${e.basis}">${e.basis === "stated" ? "Platform stated" : "Observed"}</span> ${esc(e.text.slice(0, 120))} <small>${esc(PLATFORM_LABEL[e.platform])}, ${esc(fmtDate(e.ts, tz))}${o.includeEvidenceText ? `, matched on "${esc(e.matched)}"` : ""}</small></li>`).join("");
      return `<div class="topic"><h3>${esc(n.name)} <span class="chip ${n.origin}">${n.origin === "stated" ? "Platform stated" : "Inferred"}</span> <span class="muted">${esc(STRENGTH_LABEL[n.strength])}, ${pct(n.score)}</span></h3>
<small>${esc(n.path.join(" > "))}${n.sensitive ? ` (sensitive: ${esc(n.sensitive)})` : ""}</small>
<p><b>How:</b> ${n.mechanisms.map((m) => esc(MECHANISM_TEXT[m].title)).join("; ")}. <b>Where:</b> ${esc(n.platforms.map((p) => PLATFORM_LABEL[p]).join(", "))}. <b>When:</b> ${n.firstSeen ? `${esc(fmtDate(n.firstSeen, tz))} to ${esc(fmtDate(n.lastSeen, tz))}` : "platform statements are undated"}${n.peakHour !== undefined ? `; most active ${esc(WEEKDAYS[n.peakWeekday ?? 0])}s around ${hourLabel(n.peakHour)}` : ""}.</p>
<ul>${ev}</ul></div>`;
    })
    .join("");

  const advRows = a.advertisers
    .slice(0, 80)
    .map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.reason)}</td><td>${r.impressions} / ${r.clicks}</td><td>${esc(r.categories.map((c) => c.path[c.path.length - 1]).join(", ") || "not recognised")}</td></tr>`)
    .join("");

  const devRows = a.devices.map((d) => `<tr><td>${esc(d.label)}</td><td>${esc(PLATFORM_LABEL[d.platform])}</td><td>${esc(fmtDate(d.lastSeen, tz))}</td><td>${esc(d.detail ?? "")}</td></tr>`).join("");
  const profRows = a.profile.map((p) => `<tr><td>${esc(PLATFORM_LABEL[p.platform])}</td><td>${esc(p.key)}</td><td>${esc(p.values.join("; "))}</td></tr>`).join("");
  const places = [...new Set(a.places.map((p) => `${p.label} (${p.kind.replace("-", " ")}, ${PLATFORM_LABEL[p.platform]})`))].slice(0, 40);

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AdSight report</title><style>${CSS}</style></head><body><main>
<h1>Your AdSight report</h1>
<p class="muted">Generated ${esc(new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: tz }).format(a.generatedAt))} (${esc(tz)}) from ${esc(a.platforms.map((p) => PLATFORM_LABEL[p.id]).join(", "))}. Data covers ${esc(fmtDate(a.span.first, tz))} to ${esc(fmtDate(a.span.last, tz))}.</p>
<div class="note"><b>Handle with care.</b> This file describes your interests and activity. AdSight did not store it or send it anywhere. ${o.includeSensitive ? "It includes sensitive topics." : "Sensitive topics (health, politics, religion, sexuality, hardship, gambling) and platform labels AdSight could not classify were left out."} ${o.includePlaces ? "" : "Places, logins and IP addresses were left out."}</div>
<div class="stats"><div class="stat"><b>${a.counts.categories}</b>topics, ${a.counts.statedCategories} stated by platforms</div><div class="stat"><b>${a.counts.advertisers}</b>advertisers</div><div class="stat"><b>${a.counts.devices}</b>devices</div><div class="stat"><b>${a.counts.signals.toLocaleString("en-GB")}</b>signals read</div></div>
<h2>Targeting map</h2><p class="muted">Inner ring: category. Middle: sub-category. Outer: topic. Blue is stated by a platform, amber is inferred by AdSight. Stronger colour means stronger evidence.</p>${map}
<h2>Topics, with why, how, where and when</h2>${topicHtml || "<p>No topics found.</p>"}
<h2>Advertisers</h2><p class="muted">Reasons come only from fields in your export. Where the export is silent, it says so.</p><table><thead><tr><th>Advertiser</th><th>Why, from your export</th><th>Seen / clicked</th><th>Likely topics (inferred)</th></tr></thead><tbody>${advRows}</tbody></table>
<h2>When</h2>${bars}<p class="muted">Times in ${esc(tz)}.</p>${heat}
<h2>Devices</h2><table><thead><tr><th>Device</th><th>Platform</th><th>Last seen</th><th>Detail</th></tr></thead><tbody>${devRows || '<tr><td colspan="4">None in these files.</td></tr>'}</tbody></table>
${places.length ? `<h2>Places</h2><ul>${places.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
${profRows ? `<h2>Attributes platforms can target you on</h2><table><thead><tr><th>Platform</th><th>Attribute</th><th>Values</th></tr></thead><tbody>${profRows}</tbody></table>` : ""}
<h2>What was not in your files</h2><ul>${a.missing.map((m) => `<li><b>${esc(PLATFORM_LABEL[m.platform])}: ${esc(m.what)}.</b> ${esc(m.why)} ${esc(m.how)}</li>`).join("") || "<li>Nothing we look for was missing.</li>"}</ul>
<h2>How to read this</h2><p>Each signal comes from a file in your export. "Platform stated" means the platform's own file names the topic. "Observed" means an action in your data. Topics marked "Inferred" are AdSight's conclusion from your activity: signals are weighted by kind (platform statement 1.0, ad click 0.7, search 0.5, watching 0.2), older behaviour counts for less, repeats within one kind of signal level off, and different kinds of signal reinforce each other. A score is confidence that a topic is in your profile, not a probability. No export explains why one specific ad appeared.</p>
</main></body></html>`;
}
