import type { AnalysisPair, WorkerIn, WorkerOut } from "../workers/analyze.worker";

export interface Progress {
  stage: string;
  done: number;
  total: number;
  current?: string;
}

export interface Job {
  promise: Promise<AnalysisPair>;
  cancel: () => void;
}

/** Runs the analysis in a worker that lives only as long as the job. Nothing leaves the browser. */
export function runAnalysis(files: File[], onProgress: (p: Progress) => void): Job {
  const worker = new Worker(new URL("../workers/analyze.worker.ts", import.meta.url), { type: "module" });
  let settled = false;
  const promise = new Promise<AnalysisPair>((resolve, reject) => {
    worker.onmessage = (ev: MessageEvent<WorkerOut>) => {
      const m = ev.data;
      if (m.type === "progress") onProgress(m);
      else if (m.type === "result") {
        settled = true;
        worker.terminate();
        resolve(m.analysis);
      } else {
        settled = true;
        worker.terminate();
        reject(new Error(m.message));
      }
    };
    worker.onerror = (e) => {
      settled = true;
      worker.terminate();
      reject(new Error(e.message || "The analysis worker stopped unexpectedly."));
    };
    worker.postMessage({ type: "analyze", files } satisfies WorkerIn);
  });
  return {
    promise,
    cancel: () => {
      if (!settled) worker.terminate();
    },
  };
}
