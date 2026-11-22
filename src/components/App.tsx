"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runAnalysis, type Job, type Progress } from "../lib/client";
import { isCandidate } from "../lib/ingest";
import type { AnalysisPair } from "../workers/analyze.worker";
import { GUIDES } from "../lib/guides";
import { Results } from "./Results";

type Stage = "home" | "working" | "results";

const Mark = () => (
  <svg width="28" height="28" viewBox="-14 -14 28 28" aria-hidden="true">
    <circle r="12.5" fill="none" stroke="#17262b" strokeWidth="2" />
    <path d="M0 -12.5A12.5 12.5 0 0 1 12.5 0L0 0Z" fill="#2742e6" />
    <path d="M0 0L-12.5 0A12.5 12.5 0 0 0 0 12.5Z" fill="#b86e00" />
    <circle r="3.2" fill="#17262b" />
  </svg>
);

const Tick = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9" fill="none" stroke="#0c8a78" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

interface Picked {
  file: File;
  label: string;
}

/** Walk a dropped folder, keeping only files AdSight can use so huge media folders cost nothing. */
async function readEntry(entry: FileSystemEntry, out: Picked[], prefix = ""): Promise<void> {
  if (entry.isFile) {
    const file: File = await new Promise((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
    const path = `${prefix}${entry.name}`;
    if (/\.zip$/i.test(file.name) || isCandidate(path) || /\.(html?|txt)$/i.test(path)) {
      Object.defineProperty(file, "webkitRelativePath", { value: path });
      out.push({ file, label: path });
    }
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    for (;;) {
      const batch: FileSystemEntry[] = await new Promise((res, rej) => reader.readEntries(res, rej));
      if (!batch.length) break;
      for (const e of batch) await readEntry(e, out, `${prefix}${entry.name}/`);
    }
  }
}

export function App() {
  const [stage, setStage] = useState<Stage>("home");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [consent, setConsent] = useState(false);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<Progress>({ stage: "Starting", done: 0, total: 1 });
  const [result, setResult] = useState<AnalysisPair | null>(null);
  const [error, setError] = useState<string | null>(null);
  const job = useRef<Job | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dirInput = useRef<HTMLInputElement>(null);

  const add = useCallback((list: Picked[]) => {
    setPicked((prev) => {
      const seen = new Set(prev.map((p) => `${p.label}:${p.file.size}`));
      return [...prev, ...list.filter((p) => !seen.has(`${p.label}:${p.file.size}`))];
    });
  }, []);

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!consent) return;
    const items = Array.from(e.dataTransfer.items ?? []);
    const entries = items.map((i) => i.webkitGetAsEntry?.()).filter((x): x is FileSystemEntry => !!x);
    if (entries.length) {
      const out: Picked[] = [];
      for (const en of entries) await readEntry(en, out);
      add(out);
    } else add(Array.from(e.dataTransfer.files).map((f) => ({ file: f, label: f.name })));
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    add(files.filter((f) => /\.zip$/i.test(f.name) || isCandidate((f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name) || /\.(html?|txt)$/i.test(f.name)).map((f) => ({ file: f, label: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name })));
    e.target.value = "";
  };

  const start = () => {
    setError(null);
    setStage("working");
    setProgress({ stage: "Starting", done: 0, total: 1 });
    const j = runAnalysis(picked.map((p) => p.file), setProgress);
    job.current = j;
    j.promise
      .then((r) => {
        if (!r.full.counts.signals && !r.full.advertisers.length && !r.full.devices.length) {
          setError(r.full.warnings.join(" ") || "None of these files were recognised. Check the export instructions below and make sure you chose JSON (or CSV for LinkedIn).");
          setStage("home");
        } else {
          setResult(r);
          setStage("results");
        }
      })
      .catch((err: Error) => {
        setError(err.message);
        setStage("home");
      })
      .finally(() => (job.current = null));
  };

  const cancel = () => {
    job.current?.cancel();
    job.current = null;
    setStage("home");
  };

  /** Drop everything held in this tab. */
  const erase = () => {
    job.current?.cancel();
    setResult(null);
    setPicked([]);
    setConsent(false);
    setError(null);
    setStage("home");
  };

  useEffect(() => {
    if (stage !== "results") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [stage]);

  const pct = Math.round((progress.done / Math.max(progress.total, 1)) * 100);

  return (
    <div className="shell">
      <header className="top noprint">
        <div className="brand"><Mark /> AdSight</div>
        <div className="local-note"><span className="dot" /> Runs in this tab. Files are not uploaded.</div>
      </header>

      {stage === "results" && result ? (
        <Results data={result} onErase={erase} />
      ) : stage === "working" ? (
        <main className="working" aria-live="polite">
          <h2>{progress.stage}</h2>
          <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
          <p>{progress.done} of {progress.total}</p>
          {progress.current && <p className="mono-path">{progress.current}</p>}
          <button className="btn secondary" onClick={cancel}>Cancel</button>
        </main>
      ) : (
        <main>
          <section className="hero">
            <div>
              <h1>Find out why those ads found you.</h1>
              <p className="lede">Bring the data your platforms already let you download. AdSight reads it here and shows which topics, advertisers and activity put you in front of their ads.</p>
              <ul className="promises">
                <li><Tick /><span><b>Read in this tab.</b> Parsing happens in your browser. The page is set to block any connection except to itself.</span></li>
                <li><Tick /><span><b>Nothing is kept.</b> No account, no database. Close the tab and it is gone.</span></li>
                <li><Tick /><span><b>Only your real data.</b> Every finding names the file it came from, and is marked as stated by the platform, observed, or inferred.</span></li>
              </ul>
            </div>

            <div>
              <div
                className={`drop${over ? " over" : ""}${consent ? "" : " locked"}`}
                onDragOver={(e) => { e.preventDefault(); if (consent) setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={onDrop}
              >
                <h2>Add your exports</h2>
                <label className="consent">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  <span>I am choosing to analyse data from my own accounts. I understand AdSight reads these files in this tab and does not send them anywhere.</span>
                </label>
                <div className="row">
                  <button className="btn cobalt" disabled={!consent} onClick={() => fileInput.current?.click()}>Choose ZIP or files</button>
                  <button className="btn secondary" disabled={!consent} onClick={() => dirInput.current?.click()}>Choose a folder</button>
                </div>
                <p style={{ marginTop: 12, color: "var(--ink-2)" }}>or drop ZIPs, files or folders here. ZIPs stay zipped.</p>
                <input ref={fileInput} type="file" multiple accept=".zip,.json,.csv,.html,.txt" hidden onChange={onPick} />
                <input ref={dirInput} type="file" hidden onChange={onPick} {...({ webkitdirectory: "", directory: "" } as Record<string, string>)} />

                {picked.length > 0 && (
                  <>
                    <ul className="picked" aria-label="Selected files">
                      {picked.map((p, i) => (
                        <li key={`${p.label}-${i}`}>
                          <span title={p.label}>{p.label}</span>
                          <button className="link-btn" onClick={() => setPicked((x) => x.filter((_, j) => j !== i))} aria-label={`Remove ${p.label}`}>Remove</button>
                        </li>
                      ))}
                    </ul>
                    <div className="row" style={{ marginTop: 16 }}>
                      <button className="btn" onClick={start}>Analyse {picked.length} {picked.length === 1 ? "file" : "files"}</button>
                      <button className="btn secondary" onClick={() => setPicked([])}>Clear</button>
                    </div>
                  </>
                )}
              </div>
              {error && <div className="err" role="alert">{error}</div>}
            </div>
          </section>

          <section className="guides" aria-labelledby="guides-h">
            <h2 id="guides-h" style={{ padding: "22px 0 14px" }}>Get your exports</h2>
            {GUIDES.map((g) => (
              <details key={g.id}>
                <summary>{g.name} <small>{g.summary}</small></summary>
                <ol>{g.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                {g.link && <p><a href={g.link.href} target="_blank" rel="noopener noreferrer">{g.link.label}</a> (opens the platform, not AdSight)</p>}
                <p><b>What it contains:</b> {g.gives}</p>
                {g.limits && <div className="note"><b>Limit:</b> {g.limits}</div>}
              </details>
            ))}
          </section>

          <section className="two">
            <div>
              <h2>What this can tell you</h2>
              <p style={{ marginTop: 14 }}>Which advertisers hold your data and how, the interest categories platforms say they use, what you searched, watched and clicked that points to the same topics, where it happened and when, and which devices were involved.</p>
            </div>
            <div>
              <h2>What it cannot</h2>
              <p style={{ marginTop: 14 }}>No export explains why one particular ad appeared. Platforms also keep some targeting data to themselves. Where AdSight draws a conclusion beyond the file, it says so and shows the evidence it used.</p>
              <p>Sign-in import is not available yet: Google, TikTok and LinkedIn only offer it to approved apps, and mostly to users in Europe.</p>
            </div>
          </section>
        </main>
      )}
      <footer className="noprint">
        AdSight is open source. Only upload data from accounts you own. Your files are never sent to AdSight or to anyone else.
      </footer>
    </div>
  );
}
