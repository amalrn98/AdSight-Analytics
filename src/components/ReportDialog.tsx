"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisPair } from "../workers/analyze.worker";
import { buildReportHtml, redactForReport, type ReportOptions } from "../lib/report";

function save(name: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ReportDialog({ data, onClose }: { data: AnalysisPair; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [o, setO] = useState<ReportOptions>({ includeSensitive: false, includePlaces: false, includeEvidenceText: true });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);

  const stamp = new Date().toISOString().slice(0, 10);
  const pick = () => redactForReport(o.includeSensitive ? data.full : data.safe, o);

  const html = () => {
    setBusy(true);
    try {
      save(`adsight-report-${stamp}.html`, "text/html", buildReportHtml(pick(), o));
    } finally {
      setBusy(false);
    }
  };
  const json = () => save(`adsight-data-${stamp}.json`, "application/json", JSON.stringify(pick(), null, 2));

  const set = (k: keyof ReportOptions) => (e: React.ChangeEvent<HTMLInputElement>) => setO((x) => ({ ...x, [k]: e.target.checked }));

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="rep-h">
      <h2 id="rep-h" style={{ marginBottom: 10 }}>Download your report</h2>
      <p>The file is made in this tab and saved to your device. It is not uploaded. Choose what goes in it.</p>
      <label className="consent"><input type="checkbox" checked={o.includeSensitive} onChange={set("includeSensitive")} /><span>Include sensitive topics (health, politics, religion, sexuality, hardship, gambling) and platform labels AdSight cannot classify</span></label>
      <label className="consent"><input type="checkbox" checked={o.includePlaces} onChange={set("includePlaces")} /><span>Include places and logins (IP addresses are never included)</span></label>
      <label className="consent"><input type="checkbox" checked={o.includeEvidenceText} onChange={set("includeEvidenceText")} /><span>Include the text of searches, videos and ads used as evidence</span></label>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn cobalt" onClick={html} disabled={busy}>Download report (HTML)</button>
        <button className="btn secondary" onClick={json}>Download data (JSON)</button>
        <button className="btn secondary" onClick={() => ref.current?.close()}>Close</button>
      </div>
      <p style={{ marginTop: 14, color: "var(--ink-2)", fontSize: "0.9rem" }}>To make a PDF, open the HTML report and use your browser's Print, then Save as PDF.</p>
    </dialog>
  );
}
