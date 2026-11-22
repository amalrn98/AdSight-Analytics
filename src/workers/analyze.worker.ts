/// <reference lib="webworker" />
import { BlobReader, TextWriter, ZipReader, configure } from "@zip.js/zip.js";
import { ingest, isCandidate, type SourceFile } from "../lib/ingest";
import { analyze } from "../lib/engine";
import type { Analysis } from "../lib/types";

export interface AnalysisPair {
  full: Analysis;
  /** Same analysis with sensitive topics left out, for sharing. */
  safe: Analysis;
}

configure({ useWebWorkers: false });

export type WorkerIn = { type: "analyze"; files: File[] };
export type WorkerOut =
  | { type: "progress"; stage: string; done: number; total: number; current?: string }
  | { type: "result"; analysis: AnalysisPair }
  | { type: "error"; message: string };

const post = (m: WorkerOut) => (self as unknown as Worker).postMessage(m);

async function expand(files: File[], warnings: string[]): Promise<SourceFile[]> {
  const out: SourceFile[] = [];
  let i = 0;
  for (const file of files) {
    i += 1;
    post({ type: "progress", stage: "Opening files", done: i, total: files.length, current: file.name });
    if (/\.zip$/i.test(file.name)) {
      try {
        const reader = new ZipReader(new BlobReader(file));
        const entries = await reader.getEntries();
        for (const e of entries) {
          if (e.directory) continue;
          const path = e.filename.replace(/\\/g, "/");
          if (!isCandidate(path) && !/\.(html?|txt)$/i.test(path)) continue;
          out.push({ path, size: e.uncompressedSize, text: () => (e as unknown as { getData: (w: TextWriter) => Promise<string> }).getData(new TextWriter()) });
        }
      } catch (err) {
        warnings.push(`Could not open ${file.name}: ${(err as Error).message}. If it is password protected or damaged, download it again.`);
      }
    } else {
      const path = ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name).replace(/\\/g, "/");
      out.push({ path, size: file.size, text: () => file.text() });
    }
  }
  return out;
}

self.onmessage = async (ev: MessageEvent<WorkerIn>) => {
  if (ev.data.type !== "analyze") return;
  try {
    const warnings: string[] = [];
    const sources = await expand(ev.data.files, warnings);
    const parsed = await ingest(sources, (p) => post({ type: "progress", stage: "Reading your data", done: p.done, total: p.total, current: p.current }));
    parsed.warnings.unshift(...warnings);
    post({ type: "progress", stage: "Working out why", done: 1, total: 1 });
    const analysis = { full: analyze(parsed), safe: analyze(parsed, { excludeSensitive: true }) };
    post({ type: "result", analysis });
  } catch (err) {
    post({ type: "error", message: (err as Error).message || "Something went wrong while reading the files." });
  }
};
