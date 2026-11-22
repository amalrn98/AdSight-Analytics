import type { CategoryNode, PlatformId } from "../lib/types";
import { ORIGIN_COLOR, PLATFORM_COLOR, fmtMonth } from "../lib/format";
import { PLATFORM_LABEL } from "../lib/types";

/* All charts use inline attributes only, so the same components render in the app and in the downloaded report. */

interface Arc {
  id: string;
  name: string;
  level: 1 | 2 | 3;
  a0: number;
  a1: number;
  node: CategoryNode;
}

function layout(nodes: Record<string, CategoryNode>, roots: string[], maxLeaves: number): Arc[] {
  const arcs: Arc[] = [];
  const weight = (n: CategoryNode) => Math.pow(Math.max(n.evidenceCount, 1), 0.55) * (0.4 + n.score);
  const keep = (id: string): boolean => {
    const n = nodes[id];
    return !!n && n.level < 3 ? true : !!n;
  };
  // limit total leaves shown by dropping the weakest ones
  const leaves = Object.values(nodes).filter((n) => n.level === 3 || (n.level === 2 && !n.children.length && n.unmapped));
  const allowed = new Set(leaves.sort((a, b) => b.score - a.score).slice(0, maxLeaves).map((n) => n.id));
  const shown = (id: string): boolean => {
    const n = nodes[id];
    if (!n) return false;
    if (!n.children.length) return allowed.has(id);
    return n.children.some(shown);
  };
  const place = (ids: string[], a0: number, a1: number) => {
    const visible = ids.filter((id) => keep(id) && shown(id));
    const total = visible.reduce((s, id) => s + weight(nodes[id]), 0) || 1;
    let a = a0;
    for (const id of visible) {
      const n = nodes[id];
      const span = ((a1 - a0) * weight(n)) / total;
      arcs.push({ id, name: n.name, level: n.level, a0: a, a1: a + span, node: n });
      if (n.children.length) place(n.children, a, a + span);
      a += span;
    }
  };
  place(roots, -Math.PI / 2, (3 * Math.PI) / 2);
  return arcs;
}

const pt = (r: number, a: number): [number, number] => [r * Math.cos(a), r * Math.sin(a)];

function arcPath(r0: number, r1: number, a0: number, a1: number): string {
  const gap = Math.min(0.004, (a1 - a0) / 4);
  const s = a0 + gap;
  const e = a1 - gap;
  const large = e - s > Math.PI ? 1 : 0;
  const [x0, y0] = pt(r1, s);
  const [x1, y1] = pt(r1, e);
  const [x2, y2] = pt(r0, e);
  const [x3, y3] = pt(r0, s);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r1} ${r1} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}A${r0} ${r0} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)}Z`;
}

export function Sunburst(props: {
  nodes: Record<string, CategoryNode>;
  roots: string[];
  selected?: string;
  onSelect?: (id: string) => void;
  size?: number;
  maxLeaves?: number;
  title?: string;
}) {
  const { nodes, roots, selected, onSelect, size = 560, maxLeaves = 70 } = props;
  const arcs = layout(nodes, roots, maxLeaves);
  const R = [52, 128, 196, 258];
  const sel = selected ? nodes[selected] : undefined;
  const chain = new Set<string>();
  for (let n = sel; n; n = n.parent ? nodes[n.parent] : undefined) chain.add(n.id);
  return (
    <svg viewBox="-270 -270 540 540" width={size} height={size} role="img" aria-label={props.title ?? "Targeting map: categories, sub-categories and topics"} style={{ maxWidth: "100%", height: "auto" }}>
      <title>{props.title ?? "Targeting map"}</title>
      {arcs.map((a) => {
        const r0 = R[a.level - 1];
        const r1 = R[a.level];
        const color = a.node.origin === "stated" ? ORIGIN_COLOR.stated : ORIGIN_COLOR.inferred;
        const dim = selected && !chain.has(a.id) && !(a.node.parent && chain.has(a.node.parent)) ? 0.35 : 1;
        const opacity = (0.28 + a.node.score * 0.72) * dim;
        const label = `${a.node.path.join(" > ")}: ${a.node.strength}, ${a.node.origin === "stated" ? "stated by the platform" : "inferred"}`;
        const mid = (a.a0 + a.a1) / 2;
        const showText = a.level === 1 && a.a1 - a.a0 > 0.24;
        const [tx, ty] = pt((r0 + r1) / 2, mid);
        return (
          <g key={a.id}>
            <path
              d={arcPath(r0, r1, a.a0, a.a1)}
              fill={color}
              fillOpacity={opacity}
              stroke={chain.has(a.id) ? "#17262b" : "#f2f4f0"}
              strokeWidth={chain.has(a.id) ? 2 : 1}
              tabIndex={onSelect ? 0 : undefined}
              role={onSelect ? "button" : undefined}
              aria-label={label}
              style={{ cursor: onSelect ? "pointer" : "default", outline: "none" }}
              onClick={onSelect ? () => onSelect(a.id) : undefined}
              onKeyDown={onSelect ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(a.id)) : undefined}
              data-arc={a.id}
            >
              <title>{label}</title>
            </path>
            {showText && (
              <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fontSize="9.5" fill={opacity > 0.55 ? "#fff" : "#17262b"} pointerEvents="none" transform={`rotate(${(((mid * 180) / Math.PI + 90 + 360) % 360) > 180 ? (mid * 180) / Math.PI - 90 : (mid * 180) / Math.PI + 90} ${tx} ${ty})`}>
                {a.name.length > 18 ? `${a.name.slice(0, 17)}…` : a.name}
              </text>
            )}
          </g>
        );
      })}
      <circle r={R[0] - 6} fill="#f2f4f0" />
      <text textAnchor="middle" y="-4" fontSize="13" fontWeight="600" fill="#17262b">{sel ? (sel.name.length > 20 ? `${sel.name.slice(0, 19)}…` : sel.name) : "You"}</text>
      <text textAnchor="middle" y="14" fontSize="10" fill="#4b5d62">{sel ? `${sel.strength}, ${sel.evidenceCount} signals` : "as advertisers see you"}</text>
    </svg>
  );
}

export function MonthBars(props: { timeline: { month: string; byPlatform: Partial<Record<PlatformId, number>>; total: number }[]; platforms: PlatformId[]; width?: number }) {
  const { timeline, platforms } = props;
  const W = props.width ?? 720;
  const H = 220;
  const pad = { l: 36, r: 8, t: 8, b: 28 };
  const max = Math.max(1, ...timeline.map((t) => t.total));
  const bw = Math.max(2, (W - pad.l - pad.r) / Math.max(timeline.length, 1) - 3);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const every = Math.ceil(timeline.length / 12);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Signals per month by platform">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} stroke="#cbd3cf" strokeWidth="1" />
          <text x={pad.l - 6} y={y(max * f) + 3} textAnchor="end" fontSize="10" fill="#4b5d62">{Math.round(max * f).toLocaleString("en-GB")}</text>
        </g>
      ))}
      {timeline.map((t, i) => {
        let acc = 0;
        const x = pad.l + i * (bw + 3);
        return (
          <g key={t.month}>
            {platforms.map((p) => {
              const v = t.byPlatform[p] ?? 0;
              if (!v) return null;
              const y1 = y(acc + v);
              const h = y(acc) - y1;
              acc += v;
              return (
                <rect key={p} x={x} y={y1} width={bw} height={Math.max(h, 0.5)} fill={PLATFORM_COLOR[p]}>
                  <title>{`${fmtMonth(t.month)}: ${v} from ${PLATFORM_LABEL[p]}`}</title>
                </rect>
              );
            })}
            {i % every === 0 && (
              <text x={x + bw / 2} y={H - 10} textAnchor="middle" fontSize="10" fill="#4b5d62">{fmtMonth(t.month)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function Heatmap(props: { grid: number[][] }) {
  const { grid } = props;
  const max = Math.max(1, ...grid.flat());
  const cw = 26;
  const ch = 22;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <svg viewBox={`0 0 ${40 + 24 * cw} ${20 + 7 * ch}`} width="100%" role="img" aria-label="When your activity happens, by weekday and hour">
      {[0, 6, 12, 18, 23].map((h) => (
        <text key={h} x={40 + h * cw + cw / 2} y={12} textAnchor="middle" fontSize="10" fill="#4b5d62">{String(h).padStart(2, "0")}</text>
      ))}
      {order.map((d, row) => (
        <g key={d}>
          <text x={34} y={20 + row * ch + ch / 2 + 3} textAnchor="end" fontSize="10" fill="#4b5d62">{days[d]}</text>
          {grid[d].map((v, h) => (
            <rect key={h} x={40 + h * cw} y={20 + row * ch} width={cw - 2} height={ch - 2} rx="2" fill="#0c8a78" fillOpacity={v ? 0.12 + 0.88 * (v / max) : 0.04}>
              <title>{`${days[d]} ${String(h).padStart(2, "0")}:00, ${v} signals`}</title>
            </rect>
          ))}
        </g>
      ))}
    </svg>
  );
}
