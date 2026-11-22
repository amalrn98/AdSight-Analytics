import { TAXONOMY, type Taxonomy } from "./taxonomy";
import { normalize } from "./text";

export interface Match {
  id: string;
  matched: string;
}

const STOP = new Set(["and", "the", "of", "for", "a", "an", "in", "to", "on", "with", "s"]);
const stem = (t: string) => (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t);
const tokensOf = (s: string) => normalize(s).split(" ").filter((t) => t && !STOP.has(t)).map(stem);

/** Longest-phrase-first, left-to-right keyword matching over free text. */
export function matchText(text: string, tax: Taxonomy = TAXONOMY, limit = 4): Match[] {
  const toks = normalize(text).split(" ").filter(Boolean);
  const found = new Map<string, string>();
  let i = 0;
  while (i < toks.length) {
    let hit = 0;
    for (let n = Math.min(tax.maxPhrase, toks.length - i); n >= 1; n--) {
      const phrase = toks.slice(i, i + n).join(" ");
      const ids = tax.keywordIndex.get(phrase);
      if (ids) {
        for (const id of ids) if (!found.has(id)) found.set(id, phrase);
        hit = n;
        break;
      }
    }
    i += hit || 1;
  }
  return [...found].slice(0, limit).map(([id, matched]) => ({ id, matched }));
}

/**
 * Place a platform-supplied label (an ad interest, topic, industry...) in the
 * taxonomy. Order: exact name, keyword match, then word overlap with a node name.
 * Returns [] when nothing fits; the caller keeps the platform's own label.
 */
export function matchLabel(label: string, tax: Taxonomy = TAXONOMY): Match[] {
  const parts = label.split(/\s*(?:>|›|»|\/|\||;)\s*/).map((p) => p.trim()).filter(Boolean);
  const out = new Map<string, string>();
  for (const part of parts.length ? parts : [label]) {
    const n = normalize(part);
    if (!n) continue;
    const exact = tax.nameIndex.get(n);
    if (exact) {
      for (const id of exact) out.set(id, part);
      continue;
    }
    const kw = matchText(part, tax, 3);
    if (kw.length) {
      for (const m of kw) out.set(m.id, m.matched);
      continue;
    }
    const want = new Set(tokensOf(part));
    if (!want.size) continue;
    let best: { id: string; score: number } | undefined;
    for (const node of tax.nodes.values()) {
      const have = new Set(tokensOf(node.name));
      if (!have.size) continue;
      let inter = 0;
      for (const t of want) if (have.has(t)) inter++;
      const score = inter / (want.size + have.size - inter);
      if (score >= 0.6 && (!best || score > best.score)) best = { id: node.id, score };
    }
    if (best) out.set(best.id, part);
  }
  return [...out].map(([id, matched]) => ({ id, matched }));
}
