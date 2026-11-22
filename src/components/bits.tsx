import type { ReactNode } from "react";

export function Chip({ kind, label }: { kind: "stated" | "observed" | "inferred" | "sens"; label?: ReactNode }) {
  const text = label ?? (kind === "stated" ? "Platform stated" : kind === "observed" ? "Observed" : kind === "inferred" ? "Inferred" : "Sensitive");
  return <span className={`chip ${kind}`}>{text}</span>;
}

export function Legend() {
  return (
    <div className="legend" aria-label="Colour key">
      <span><i style={{ background: "var(--stated)" }} />Stated by a platform</span>
      <span><i style={{ background: "var(--inferred)" }} />Inferred from your activity</span>
      <span>Stronger colour means stronger evidence</span>
    </div>
  );
}
