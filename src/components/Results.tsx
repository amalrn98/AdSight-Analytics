"use client";

import { useMemo, useState } from "react";
import type { AnalysisPair } from "../workers/analyze.worker";
import type { Analysis, CategoryNode, PlatformId } from "../lib/types";
import { PLATFORM_LABEL } from "../lib/types";
import { ORIGIN_COLOR, PLATFORM_COLOR, STRENGTH_LABEL, fmtDate, pct, plural } from "../lib/format";
import { Heatmap, MonthBars, Sunburst } from "./charts";
import { Why } from "./Why";
import { Chip, Legend } from "./bits";
import { ReportDialog } from "./ReportDialog";

type Tab = "overview" | "interests" | "advertisers" | "timeline" | "devices" | "evidence";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "interests", label: "Interests" },
  { id: "advertisers", label: "Advertisers" },
  { id: "timeline", label: "When" },
  { id: "devices", label: "Devices and places" },
  { id: "evidence", label: "Evidence and gaps" },
];

export function Results({ data, onErase }: { data: AnalysisPair; onErase: () => void }) {
  const a = data.full;
  const [tab, setTab] = useState<Tab>("overview");
  const [selected, setSelected] = useState<string | undefined>(() => topLeaf(a));
  const [report, setReport] = useState(false);
  const node = selected ? a.nodes[selected] : undefined;

  return (
    <main>
      <div className="head">
        <div>
          <h1 style={{ fontSize: "clamp(2rem,4.5vw,3.2rem)" }}>Your targeting profile</h1>
          <p>
            {plural(a.counts.signals, "signal")} from {a.platforms.map((p) => PLATFORM_LABEL[p.id]).join(", ")}
            {a.span.first && a.span.last ? `, ${fmtDate(a.span.first, a.timezone)} to ${fmtDate(a.span.last, a.timezone)}` : ""}.
          </p>
        </div>
        <div className="row noprint">
          <button className="btn cobalt" onClick={() => setReport(true)}>Download report</button>
          <button className="btn secondary" onClick={onErase}>Erase and start over</button>
        </div>
      </div>

      {a.warnings.length > 0 && <div className="note" role="status">{a.warnings.map((w, i) => <div key={i}>{w}</div>)}</div>}

      <div className="tabs noprint" role="tablist" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div className="panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "overview" && <Overview a={a} selected={selected} setSelected={setSelected} node={node} go={setTab} />}
        {tab === "interests" && <Interests a={a} selected={selected} setSelected={setSelected} node={node} />}
        {tab === "advertisers" && <Advertisers a={a} />}
        {tab === "timeline" && <When a={a} />}
        {tab === "devices" && <Devices a={a} />}
        {tab === "evidence" && <Evidence a={a} />}
      </div>

      {report && <ReportDialog data={data} onClose={() => setReport(false)} />}
    </main>
  );
}

function topLeaf(a: Analysis): string | undefined {
  return Object.values(a.nodes).filter((n) => n.level === 3 || n.unmapped).sort((x, y) => y.score - x.score)[0]?.id;
}

function Overview({ a, selected, setSelected, node, go }: { a: Analysis; selected?: string; setSelected: (s: string) => void; node?: CategoryNode; go: (t: Tab) => void }) {
  const top = Object.values(a.nodes).filter((n) => n.level === 3 || n.unmapped).sort((x, y) => y.score - x.score).slice(0, 8);
  const stated = a.counts.statedCategories;
  return (
    <>
      <div className="stats">
        <div className="stat"><b>{a.counts.categories}</b><span>topics found, {stated} stated by platforms</span></div>
        <div className="stat"><b>{a.counts.advertisers}</b><span>advertisers in your data</span></div>
        <div className="stat"><b>{a.counts.devices}</b><span>devices seen</span></div>
        <div className="stat"><b>{a.counts.signals.toLocaleString("en-GB")}</b><span>signals read</span></div>
      </div>
      <div className="split">
        <div>
          <Sunburst nodes={a.nodes} roots={a.roots} selected={selected} onSelect={setSelected} />
          <Legend />
          <p style={{ marginTop: 12, color: "var(--ink-2)" }}>Inner ring: category. Middle: sub-category. Outer: topic. Select any segment.</p>
        </div>
        {node ? <Why node={node} tz={a.timezone} nodes={a.nodes} /> : <p>Select a segment to see why it is there.</p>}
      </div>
      <h2 style={{ margin: "40px 0 14px" }}>Strongest topics</h2>
      <ol className="tree" style={{ maxWidth: 720 }}>
        {top.map((n) => (
          <li key={n.id} className={`tnode${n.id === selected ? " sel" : ""}`} style={{ gridTemplateColumns: "minmax(0,1fr) 70px" }}>
            <button className="name" onClick={() => setSelected(n.id)}>
              {n.name} <Chip kind={n.origin} /> {n.sensitive && <Chip kind="sens" />} <span className="chip plat">{n.platforms.map((p) => PLATFORM_LABEL[p]).join(", ")}</span>
            </button>
            <Meter n={n} />
          </li>
        ))}
      </ol>
      <p style={{ marginTop: 18 }}><button className="link-btn" onClick={() => go("interests")}>Browse every category</button> or <button className="link-btn" onClick={() => go("advertisers")}>see who advertised to you</button>.</p>
    </>
  );
}

function Meter({ n }: { n: CategoryNode }) {
  return (
    <div className="meter" role="img" aria-label={`${STRENGTH_LABEL[n.strength]}, ${pct(n.score)}`} title={`${STRENGTH_LABEL[n.strength]} (${pct(n.score)})`}>
      <i style={{ width: `${Math.max(4, n.score * 100)}%`, background: n.origin === "stated" ? ORIGIN_COLOR.stated : ORIGIN_COLOR.inferred }} />
    </div>
  );
}

function Interests({ a, selected, setSelected, node }: { a: Analysis; selected?: string; setSelected: (s: string) => void; node?: CategoryNode }) {
  const [q, setQ] = useState("");
  const [onlyStated, setOnlyStated] = useState(false);
  const [open, setOpen] = useState<Set<string>>(() => new Set(a.roots.slice(0, 3)));
  const query = q.trim().toLowerCase();

  const visible = useMemo(() => {
    const ok = (id: string): boolean => {
      const n = a.nodes[id];
      if (!n) return false;
      if (onlyStated && n.origin !== "stated") return false;
      const self = !query || n.name.toLowerCase().includes(query) || n.evidence.some((e) => e.text.toLowerCase().includes(query));
      return self || n.children.some(ok);
    };
    return ok;
  }, [a.nodes, query, onlyStated]);

  const toggle = (id: string) => setOpen((s) => { const x = new Set(s); x.has(id) ? x.delete(id) : x.add(id); return x; });

  const render = (ids: string[]) => (
    <ul className="tree">
      {ids.filter(visible).map((id) => {
        const n = a.nodes[id];
        const kids = n.children.filter(visible);
        const isOpen = open.has(id) || !!query;
        return (
          <li key={id}>
            <div className={`tnode${id === selected ? " sel" : ""}`}>
              {kids.length ? <button className="tog" aria-expanded={isOpen} aria-label={`${isOpen ? "Collapse" : "Expand"} ${n.name}`} onClick={() => toggle(id)}>{isOpen ? "▾" : "▸"}</button> : <span />}
              <button className="name" onClick={() => setSelected(id)} aria-pressed={id === selected}>
                {n.name} <Chip kind={n.origin} /> {n.sensitive && <Chip kind="sens" />} <span style={{ color: "var(--ink-2)", fontWeight: 400, fontSize: "0.85rem" }}>{plural(n.evidenceCount, "signal")}</span>
              </button>
              <Meter n={n} />
            </div>
            {kids.length > 0 && isOpen && render(kids)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <div className="tools">
        <input type="search" placeholder="Search topics or evidence" aria-label="Search topics or evidence" value={q} onChange={(e) => setQ(e.target.value)} />
        <label><input type="checkbox" checked={onlyStated} onChange={(e) => setOnlyStated(e.target.checked)} /> Only topics a platform stated</label>
      </div>
      <div className="split" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
        <div>{render(a.roots)}</div>
        <div>{node ? <Why node={node} tz={a.timezone} nodes={a.nodes} /> : <p>Select a topic.</p>}</div>
      </div>
    </>
  );
}

function Advertisers({ a }: { a: Analysis }) {
  const [method, setMethod] = useState<"all" | "targeting" | "seen">("all");
  const rows = a.advertisers.filter((r) => (method === "all" ? true : method === "targeting" ? r.methods.length > 0 : r.impressions + r.clicks > 0));
  if (!a.advertisers.length) return <p className="lead">No advertiser data in these files. Meta's “Advertisers using your activity or information” and the ads viewed and clicked files are the main sources.</p>;
  return (
    <>
      <p className="lead">The reasons below come only from fields in your export. Where the export is silent, the row says so.</p>
      <div className="tools">
        <label><input type="radio" name="am" checked={method === "all"} onChange={() => setMethod("all")} /> All ({a.advertisers.length})</label>
        <label><input type="radio" name="am" checked={method === "targeting"} onChange={() => setMethod("targeting")} /> Platform says they target you</label>
        <label><input type="radio" name="am" checked={method === "seen"} onChange={() => setMethod("seen")} /> Ads you saw or clicked</label>
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Advertiser</th><th>Why, from your export</th><th>Seen / clicked</th><th>Last seen</th><th>Likely topics (inferred)</th></tr></thead>
          <tbody>
            {rows.slice(0, 300).map((r) => (
              <tr key={r.name}>
                <td><b>{r.name}</b><br />{r.platforms.map((p) => <span key={p} className="chip plat" style={{ marginRight: 4 }}>{PLATFORM_LABEL[p]}</span>)}</td>
                <td style={{ maxWidth: 420 }}>{r.methods.length > 0 && <Chip kind="stated" />} {r.reason}</td>
                <td>{r.impressions} / {r.clicks}</td>
                <td>{fmtDate(r.lastSeen, a.timezone)}</td>
                <td>{r.categories.length ? r.categories.map((c) => c.path[c.path.length - 1]).join(", ") : "Not recognised"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function When({ a }: { a: Analysis }) {
  const ids = a.platforms.map((p) => p.id);
  const total = a.heatmap.flat().reduce((x, y) => x + y, 0);
  return (
    <>
      <h2 style={{ marginBottom: 12 }}>Signals per month</h2>
      {a.timeline.length ? <MonthBars timeline={a.timeline} platforms={ids as PlatformId[]} /> : <p>No dated signals in these files.</p>}
      <div className="legend">{ids.map((p) => <span key={p}><i style={{ background: PLATFORM_COLOR[p] }} />{PLATFORM_LABEL[p]}</span>)}</div>
      <h2 style={{ margin: "40px 0 12px" }}>Hours when you are most reachable</h2>
      <p>Times are shown in your browser's time zone ({a.timezone}). Based on {plural(total, "dated signal")}: your searches, clicks and views, and ads shown to you.</p>
      <div style={{ maxWidth: 760 }}><Heatmap grid={a.heatmap} /></div>
      <h2 style={{ margin: "40px 0 12px" }}>By platform</h2>
      <div className="tablewrap"><table>
        <thead><tr><th>Platform</th><th>Signals</th><th>Stated by platform</th><th>Observed</th><th>Earliest</th><th>Latest</th></tr></thead>
        <tbody>{a.platforms.map((p) => <tr key={p.id}><td>{PLATFORM_LABEL[p.id]}</td><td>{p.signals}</td><td>{p.stated}</td><td>{p.observed}</td><td>{fmtDate(p.first, a.timezone)}</td><td>{fmtDate(p.last, a.timezone)}</td></tr>)}</tbody>
      </table></div>
    </>
  );
}

function Devices({ a }: { a: Analysis }) {
  const [showIp, setShowIp] = useState(false);
  const accounts = [...new Set(a.devices.map((d) => d.platform))];
  return (
    <div className="cols">
      <section>
        <h2 style={{ marginBottom: 12 }}>Devices</h2>
        {a.devices.length ? (
          <>
            <p>{plural(a.devices.length, "device")} appear across {accounts.map((p) => PLATFORM_LABEL[p]).join(", ")}. Platforms tie these devices to your account, so interests learned on one can be used for ads on the others.</p>
            <div className="tablewrap"><table>
              <thead><tr><th>Device</th><th>Platform</th><th>Last seen</th><th>Detail</th></tr></thead>
              <tbody>{a.devices.map((d, i) => <tr key={i}><td>{d.label}</td><td>{PLATFORM_LABEL[d.platform]}</td><td>{fmtDate(d.lastSeen, a.timezone)}</td><td>{d.detail ?? (d.count > 1 ? `${d.count} records` : "")}</td></tr>)}</tbody>
            </table></div>
          </>
        ) : <p>No device records in these files.</p>}
      </section>
      <section>
        <h2 style={{ marginBottom: 12 }}>Places</h2>
        {a.places.length ? (
          <ul>{dedupe(a.places.map((p) => `${p.label} (${p.kind.replace("-", " ")}, ${PLATFORM_LABEL[p.platform]})`)).slice(0, 40).map((t) => <li key={t}>{t}</li>)}</ul>
        ) : <p>No places in these files.</p>}
        <h2 style={{ margin: "28px 0 12px" }}>Recent logins</h2>
        <label className="tools"><input type="checkbox" checked={showIp} onChange={(e) => setShowIp(e.target.checked)} /> Show IP addresses</label>
        {a.logins.length ? (
          <div className="tablewrap"><table>
            <thead><tr><th>When</th><th>Platform</th><th>Device</th><th>{showIp ? "IP" : "Place"}</th></tr></thead>
            <tbody>{[...a.logins].sort((x, y) => (y.ts ?? 0) - (x.ts ?? 0)).slice(0, 40).map((l, i) => <tr key={i}><td>{fmtDate(l.ts, a.timezone)}</td><td>{PLATFORM_LABEL[l.platform]}</td><td>{l.device ?? ""}</td><td>{showIp ? l.ip ?? "" : l.place ?? ""}</td></tr>)}</tbody>
          </table></div>
        ) : <p>No logins in these files.</p>}
      </section>
      {a.profile.length > 0 && (
        <section style={{ gridColumn: "1 / -1" }}>
          <h2 style={{ marginBottom: 12 }}>Attributes platforms can target you on</h2>
          <div className="tablewrap"><table>
            <thead><tr><th>Platform</th><th>Attribute</th><th>Values</th></tr></thead>
            <tbody>{a.profile.map((p, i) => <tr key={i}><td>{PLATFORM_LABEL[p.platform]}</td><td>{p.key}</td><td>{p.values.join("; ")}</td></tr>)}</tbody>
          </table></div>
        </section>
      )}
    </div>
  );
}

const dedupe = (xs: string[]) => [...new Set(xs)];

function Evidence({ a }: { a: Analysis }) {
  const [q, setQ] = useState("");
  const [basis, setBasis] = useState<"all" | "stated" | "observed">("all");
  const rows = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; path: string; e: CategoryNode["evidence"][number] }[] = [];
    for (const n of Object.values(a.nodes))
      if (n.level === 3 || n.unmapped)
        for (const e of n.evidence) if (!seen.has(e.id)) { seen.add(e.id); out.push({ id: e.id, path: n.path.join(" > "), e }); }
    return out.sort((x, y) => (y.e.ts ?? 0) - (x.e.ts ?? 0));
  }, [a.nodes]);
  const f = rows.filter((r) => (basis === "all" || r.e.basis === basis) && (!q || (r.e.text + r.path + r.e.source).toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <h2 style={{ marginBottom: 12 }}>What was not in your files</h2>
      {a.missing.length ? (
        <ul>{a.missing.map((m, i) => <li key={i}><b>{PLATFORM_LABEL[m.platform]}: {m.what}.</b> {m.why} {m.how}</li>)}</ul>
      ) : <p>Every key file we look for was present.</p>}

      <h2 style={{ margin: "32px 0 12px" }}>Files read</h2>
      <ul className="coverage">{a.coverage.map((c, i) => <li key={i}>{c.read ? "Read" : "Not read"}: {c.path} ({PLATFORM_LABEL[c.platform]}{c.read ? `, ${c.records} records` : c.note ? `, ${c.note}` : ""})</li>)}</ul>

      <h2 style={{ margin: "32px 0 12px" }}>Evidence ledger</h2>
      <p>Each row is one signal that supports a topic. The list shows up to 60 of the strongest signals per topic.</p>
      <div className="tools">
        <input type="search" placeholder="Filter evidence" aria-label="Filter evidence" value={q} onChange={(e) => setQ(e.target.value)} />
        <label><input type="radio" name="b" checked={basis === "all"} onChange={() => setBasis("all")} /> All</label>
        <label><input type="radio" name="b" checked={basis === "stated"} onChange={() => setBasis("stated")} /> Platform stated</label>
        <label><input type="radio" name="b" checked={basis === "observed"} onChange={() => setBasis("observed")} /> Observed</label>
      </div>
      <div className="tablewrap"><table>
        <thead><tr><th>Evidence</th><th>Topic</th><th>Type</th><th>Platform</th><th>Date</th><th>File</th></tr></thead>
        <tbody>{f.slice(0, 400).map((r) => (
          <tr key={r.id}>
            <td style={{ maxWidth: 320, overflowWrap: "anywhere" }}>{r.e.text}</td>
            <td>{r.path}<br /><small>matched on “{r.e.matched}”</small></td>
            <td><Chip kind={r.e.basis} /></td>
            <td>{PLATFORM_LABEL[r.e.platform]}</td>
            <td>{fmtDate(r.e.ts, a.timezone)}</td>
            <td style={{ maxWidth: 260, overflowWrap: "anywhere" }}>{r.e.source}</td>
          </tr>
        ))}</tbody>
      </table></div>
      {f.length > 400 && <p>Showing 400 of {f.length}. Use the filter to narrow.</p>}
    </>
  );
}
