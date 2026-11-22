import { TAXONOMY_SOURCE } from "./taxonomy.data";
import { normalize } from "./text";

export interface TaxNode {
  id: string;
  name: string;
  path: string[];
  level: 1 | 2 | 3;
  parent?: string;
  children: string[];
  sensitive?: string;
  keywords: string[];
}

export interface Taxonomy {
  nodes: Map<string, TaxNode>;
  roots: string[];
  /** normalised phrase -> leaf ids */
  keywordIndex: Map<string, string[]>;
  /** normalised node name -> node ids */
  nameIndex: Map<string, string[]>;
  maxPhrase: number;
}

const slug = (s: string) => normalize(s).replace(/ /g, "-");

export function buildTaxonomy(source: string = TAXONOMY_SOURCE): Taxonomy {
  const nodes = new Map<string, TaxNode>();
  const roots: string[] = [];
  const keywordIndex = new Map<string, string[]>();
  const nameIndex = new Map<string, string[]>();
  let maxPhrase = 1;
  let top: TaxNode | undefined;
  let sub: TaxNode | undefined;

  const flag = (s: string) => {
    const m = s.match(/\[sensitive:([a-z-]+)\]/i);
    return { name: s.replace(/\s*\[sensitive:[a-z-]+\]\s*/i, "").trim(), sensitive: m?.[1].toLowerCase() };
  };
  const addName = (n: TaxNode) => {
    const k = normalize(n.name);
    nameIndex.set(k, [...(nameIndex.get(k) ?? []), n.id]);
  };

  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("# ")) {
      const { name, sensitive } = flag(line.slice(2));
      const node: TaxNode = { id: slug(name), name, path: [name], level: 1, children: [], sensitive, keywords: [] };
      nodes.set(node.id, node);
      roots.push(node.id);
      addName(node);
      top = node;
      sub = undefined;
    } else if (line.startsWith("## ") && top) {
      const { name, sensitive } = flag(line.slice(3));
      const node: TaxNode = {
        id: `${top.id}/${slug(name)}`,
        name,
        path: [top.name, name],
        level: 2,
        parent: top.id,
        children: [],
        sensitive: sensitive ?? top.sensitive,
        keywords: [],
      };
      nodes.set(node.id, node);
      top.children.push(node.id);
      addName(node);
      sub = node;
    } else if (line.startsWith("- ") && sub) {
      const colon = line.indexOf(":");
      const head = colon === -1 ? line.slice(2) : line.slice(2, colon);
      const { name, sensitive } = flag(head);
      const kws = colon === -1 ? [] : line.slice(colon + 1).split(",").map((k) => normalize(k)).filter(Boolean);
      const node: TaxNode = {
        id: `${sub.id}/${slug(name)}`,
        name,
        path: [...sub.path, name],
        level: 3,
        parent: sub.id,
        children: [],
        sensitive: sensitive ?? sub.sensitive,
        keywords: kws,
      };
      nodes.set(node.id, node);
      sub.children.push(node.id);
      addName(node);
      for (const k of kws) {
        const arr = keywordIndex.get(k) ?? [];
        if (!arr.includes(node.id)) arr.push(node.id);
        keywordIndex.set(k, arr);
        maxPhrase = Math.max(maxPhrase, k.split(" ").length);
      }
    }
  }
  return { nodes, roots, keywordIndex, nameIndex, maxPhrase };
}

export const TAXONOMY = buildTaxonomy();
