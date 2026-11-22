import type { CategoryNode } from "../lib/types";
import { PLATFORM_LABEL } from "../lib/types";
import { MECHANISM_TEXT, STRENGTH_LABEL, WEEKDAYS, fmtDate, hourLabel, pct } from "../lib/format";
import { Chip } from "./bits";

export function Why({ node, tz, nodes }: { node: CategoryNode; tz: string; nodes: Record<string, CategoryNode> }) {
  const platforms = node.platforms.map((p) => PLATFORM_LABEL[p]);
  const stated = node.evidence.filter((e) => e.basis === "stated");
  const shown = [...stated.slice(0, 3), ...node.evidence.filter((e) => e.basis !== "stated").slice(0, 7 - Math.min(stated.length, 3))];
  const kids = node.children.map((c) => nodes[c]).filter(Boolean).slice(0, 4);
  return (
    <aside className="why" aria-label={`Why ${node.name}`}>
      <div className="row" style={{ gap: 6, marginBottom: 8 }}>
        <Chip kind={node.origin} />
        <span className="chip plat">{STRENGTH_LABEL[node.strength]} ({pct(node.score)})</span>
        {node.sensitive && <Chip kind="sens" label={`Sensitive: ${node.sensitive}`} />}
      </div>
      <h3>{node.name}</h3>
      <div className="path">{node.path.join(" > ")}</div>
      <p>
        {node.origin === "stated"
          ? `${platforms.join(" and ")} lists this about you. ${node.evidenceCount - node.statedCount > 0 ? `${node.evidenceCount - node.statedCount} more signals in your activity point the same way.` : ""}`
          : `No platform lists this in your export. AdSight infers it from ${node.evidenceCount} signals in your own activity.`}
      </p>
      <dl>
        <dt>Why</dt>
        <dd>
          <ul className="ev">
            {shown.map((e) => (
              <li key={e.id}>
                <Chip kind={e.basis} /> {e.text.length > 110 ? `${e.text.slice(0, 109)}…` : e.text}
                <small>
                  {PLATFORM_LABEL[e.platform]}, {fmtDate(e.ts, tz)}. Matched on “{e.matched}”. {e.note ? `${e.note}. ` : ""}File: {e.source}
                </small>
              </li>
            ))}
          </ul>
          {node.evidenceCount > shown.length && <small>{node.evidenceCount - shown.length} more in the Evidence tab.</small>}
        </dd>
        <dt>How</dt>
        <dd>
          {node.mechanisms.map((m) => (
            <div key={m} style={{ marginBottom: 6 }}><b>{MECHANISM_TEXT[m].title}.</b> {MECHANISM_TEXT[m].text}</div>
          ))}
        </dd>
        <dt>Where</dt>
        <dd>{platforms.join(", ")}.{kids.length ? ` Includes ${kids.map((k) => k.name).join(", ")}.` : ""}</dd>
        <dt>When</dt>
        <dd>
          {node.firstSeen ? `First seen ${fmtDate(node.firstSeen, tz)}, latest ${fmtDate(node.lastSeen, tz)}. ` : "Platform statements carry no date. "}
          {node.recent90 ? `${node.recent90} signals in the 90 days before your newest data. ` : ""}
          {node.peakHour !== undefined ? `Most activity on ${WEEKDAYS[node.peakWeekday ?? 0]}s, around ${hourLabel(node.peakHour)} (${tz}).` : ""}
        </dd>
      </dl>
      <p className="how">How this is scored: each signal has a base weight (platform statement 1.0, ad click 0.7, search 0.5, watching 0.2), older behaviour counts for less, repeats within one kind of signal level off, and different kinds of signal reinforce each other. The score is AdSight's confidence that this topic is part of your profile, not a probability.</p>
    </aside>
  );
}
