import Papa from "papaparse";
import { emptyOutput, mergeOutput, type CoverageFile, type ParseOutput, type PlatformId } from "./types";
import { isMetaRelevant, metaPlatformFor, parseMetaFile } from "./parsers/meta";
import { isGoogleRelevant, parseGoogleCsv, parseGoogleJson } from "./parsers/google";
import { looksLikeTikTok, parseTikTok } from "./parsers/tiktok";
import { isLinkedInRelevant, parseLinkedInCsv } from "./parsers/linkedin";

/** A file the worker can read lazily, so big archives never sit fully in memory. */
export interface SourceFile {
  /** Path inside the archive or folder, using forward slashes. */
  path: string;
  size: number;
  text(): Promise<string>;
}

const MAX_TEXT_BYTES = 400 * 1024 * 1024;

export function isCandidate(path: string): boolean {
  const p = path.toLowerCase();
  if (p.includes("__macosx/") || p.endsWith(".ds_store")) return false;
  const ext = p.split(".").pop() ?? "";
  if (ext === "csv") return isLinkedInRelevant(p) || isGoogleRelevant(p);
  if (ext === "json") return isMetaRelevant(p) || isGoogleRelevant(p) || /user_data[^/]*\.json$/.test(p) || /tiktok/.test(p);
  return false;
}

/** HTML or TXT versions of exports we can only read as JSON or CSV. */
export function unreadableFormat(path: string): string | undefined {
  const p = path.toLowerCase();
  if (p.endsWith(".html") || p.endsWith(".htm")) {
    if (/ads_information|advertisers|off_meta|interest|topics|myactivity|watch-history|search-history/.test(p)) return "html";
  }
  if (/user_data[^/]*\.txt$/.test(p)) return "txt";
  return undefined;
}

export function detectMetaHints(paths: string[]): { instagram: boolean; facebook: boolean } {
  let instagram = false;
  let facebook = false;
  for (const raw of paths) {
    const p = raw.toLowerCase();
    if (p.includes("your_instagram_activity") || p.includes("instagram_ads_and_businesses") || p.includes("apps_and_websites_off_of_instagram")) instagram = true;
    if (p.includes("your_facebook_activity") || p.includes("apps_and_websites_off_of_facebook") || p.includes("facebook_")) facebook = true;
  }
  return { instagram, facebook };
}

export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const res = Papa.parse<string[]>(clean, { skipEmptyLines: "greedy" });
  return res.data as string[][];
}

export interface IngestProgress {
  stage: "scanning" | "reading" | "classifying" | "done";
  done: number;
  total: number;
  current?: string;
}

/**
 * Read every recognised file from the given sources and parse it.
 * Files we do not recognise are skipped without being read.
 */
export async function ingest(files: SourceFile[], onProgress?: (p: IngestProgress) => void): Promise<ParseOutput> {
  const out = emptyOutput();
  const hints = detectMetaHints(files.map((f) => f.path));
  const todo = files.filter((f) => isCandidate(f.path));
  const unreadable = files.filter((f) => unreadableFormat(f.path));

  if (unreadable.length) {
    const kinds = new Set(unreadable.map((f) => unreadableFormat(f.path)));
    out.warnings.push(
      `Found ${unreadable.length} ${[...kinds].join("/").toUpperCase()} file(s) that AdSight cannot read. Ask the platform for the JSON version of the export (CSV for LinkedIn) and upload that.`,
    );
  }

  let n = 0;
  for (const f of todo) {
    n += 1;
    onProgress?.({ stage: "reading", done: n, total: todo.length, current: f.path });
    if (f.size > MAX_TEXT_BYTES) {
      out.warnings.push(`Skipped ${f.path}: file is larger than ${Math.round(MAX_TEXT_BYTES / 1e6)} MB.`);
      continue;
    }
    try {
      const text = await f.text();
      mergeOutput(out, parseOne(f.path, text, hints));
    } catch (err) {
      out.warnings.push(`Could not read ${f.path}: ${(err as Error).message}`);
      out.coverage.push({ path: f.path, platform: guessPlatform(f.path, hints), read: false, records: 0, note: "Parse error" });
    }
  }
  return out;
}

function guessPlatform(path: string, hints: { instagram: boolean; facebook: boolean }): PlatformId {
  const p = path.toLowerCase();
  if (isLinkedInRelevant(p) && p.endsWith(".csv")) return "linkedin";
  if (/user_data|tiktok/.test(p)) return "tiktok";
  if (isGoogleRelevant(p)) return /youtube|watch-history|search-history/.test(p) ? "youtube" : "google";
  return metaPlatformFor(p, hints);
}

export function parseOne(path: string, text: string, hints: { instagram: boolean; facebook: boolean }): ParseOutput {
  const lp = path.toLowerCase();
  if (lp.endsWith(".csv")) {
    const rows = parseCsv(text);
    if (isLinkedInRelevant(lp)) return parseLinkedInCsv(path, rows);
    return parseGoogleCsv(path, rows);
  }
  const json = JSON.parse(text.replace(/^\uFEFF/, ""));
  if (/user_data[^/]*\.json$/.test(lp) || looksLikeTikTok(json)) {
    if (looksLikeTikTok(json)) return parseTikTok(path, json);
  }
  if (isGoogleRelevant(lp) && !isMetaRelevant(lp)) return parseGoogleJson(path, json);
  if (isMetaRelevant(lp)) return parseMetaFile(path, json, metaPlatformFor(lp, hints));
  if (isGoogleRelevant(lp)) return parseGoogleJson(path, json);
  const out = emptyOutput();
  const cov: CoverageFile = { path, platform: guessPlatform(path, hints), read: false, records: 0, note: "Not a recognised file" };
  out.coverage.push(cov);
  return out;
}
