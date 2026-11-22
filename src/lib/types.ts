export type PlatformId = "facebook" | "instagram" | "meta" | "google" | "youtube" | "tiktok" | "linkedin";

export const PLATFORM_LABEL: Record<PlatformId, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  meta: "Meta (Facebook or Instagram)",
  google: "Google",
  youtube: "YouTube",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
};

/** Whether the platform itself said something, or whether we saw an action in the data. */
export type Basis = "stated" | "observed";

export type SignalKind =
  | "stated-interest" // platform lists this as an ad interest or topic
  | "profile-attribute" // an attribute the platform can target on (job title, gender, locale...)
  | "platform-inference" // platform-made inference (e.g. LinkedIn inferences)
  | "advertiser" // advertiser that holds your data
  | "off-platform" // activity on another site or app reported to the platform
  | "ad-view"
  | "ad-click"
  | "search"
  | "watch"
  | "visit"
  | "follow"
  | "install"
  | "purchase";

export interface Signal {
  id: string;
  platform: PlatformId;
  kind: SignalKind;
  basis: Basis;
  /** Text used for classification and shown as evidence. */
  text: string;
  ts?: number;
  /** Path of the file the signal came from. */
  source: string;
  /** Extra structured detail shown in the evidence ledger. */
  note?: string;
}

export type AdvertiserMethod = "data-file" | "remarketing" | "in-person" | "listed";

export interface AdvertiserRecord {
  platform: PlatformId;
  name: string;
  methods: AdvertiserMethod[];
  source: string;
}

export interface DeviceRecord {
  platform: PlatformId;
  label: string; // "iPhone (Instagram app)"
  os?: string;
  kind: "phone" | "tablet" | "computer" | "unknown";
  lastSeen?: number;
  firstSeen?: number;
  count: number;
  detail?: string;
  source: string;
}

export interface LoginRecord {
  platform: PlatformId;
  ts?: number;
  ip?: string;
  device?: string;
  place?: string;
  source: string;
}

export interface PlaceRecord {
  platform: PlatformId;
  label: string;
  kind: "home-area" | "login" | "interest" | "saved" | "last-known";
  ts?: number;
  source: string;
}

export interface ProfileAttr {
  platform: PlatformId;
  key: string;
  values: string[];
  source: string;
}

export interface CoverageFile {
  path: string;
  platform: PlatformId;
  read: boolean;
  records: number;
  note?: string;
}

export interface ParseOutput {
  signals: Signal[];
  advertisers: AdvertiserRecord[];
  devices: DeviceRecord[];
  logins: LoginRecord[];
  places: PlaceRecord[];
  profile: ProfileAttr[];
  coverage: CoverageFile[];
  warnings: string[];
}

export const emptyOutput = (): ParseOutput => ({
  signals: [],
  advertisers: [],
  devices: [],
  logins: [],
  places: [],
  profile: [],
  coverage: [],
  warnings: [],
});

export function mergeOutput(into: ParseOutput, from: ParseOutput): void {
  into.signals.push(...from.signals);
  into.advertisers.push(...from.advertisers);
  into.devices.push(...from.devices);
  into.logins.push(...from.logins);
  into.places.push(...from.places);
  into.profile.push(...from.profile);
  into.coverage.push(...from.coverage);
  into.warnings.push(...from.warnings);
}

/* ------------------------------ analysis result ------------------------------ */

export type Mechanism =
  | "stated-by-platform"
  | "advertiser-data"
  | "off-platform-activity"
  | "ad-interaction"
  | "search"
  | "watching"
  | "following"
  | "install-or-purchase"
  | "browsing"
  | "profile";

export interface EvidenceItem {
  id: string;
  platform: PlatformId;
  kind: SignalKind;
  mechanism: Mechanism;
  basis: Basis;
  text: string;
  matched: string; // taxonomy keyword or label that matched
  weight: number; // after recency decay
  ts?: number;
  source: string;
  note?: string;
}

export type Strength = "strong" | "moderate" | "weak";

export interface CategoryNode {
  id: string;
  name: string;
  path: string[]; // names from the top
  level: 1 | 2 | 3;
  parent?: string;
  children: string[];
  sensitive?: string; // "health", "politics"...
  score: number; // 0..1
  strength: Strength;
  /** "stated" if the platform itself named it, otherwise "inferred". */
  origin: "stated" | "inferred";
  evidenceCount: number;
  statedCount: number;
  platforms: PlatformId[];
  mechanisms: Mechanism[];
  firstSeen?: number;
  lastSeen?: number;
  /** Hour of day (0-23) and weekday (0-6, Sunday = 0) with most evidence. */
  peakHour?: number;
  peakWeekday?: number;
  recent90: number; // evidence in the 90 days before the newest data point
  evidence: EvidenceItem[]; // capped, strongest first
  unmapped?: boolean; // platform label we could not place in our taxonomy
}

export interface AdvertiserResult {
  name: string;
  platforms: PlatformId[];
  methods: AdvertiserMethod[];
  impressions: number;
  clicks: number;
  firstSeen?: number;
  lastSeen?: number;
  categories: { id: string; path: string[] }[];
  /** Plain-language reason built only from fields present in the export. */
  reason: string;
  sources: string[];
}

export interface DeviceResult extends DeviceRecord {}

export interface Analysis {
  generatedAt: number;
  timezone: string;
  counts: {
    signals: number;
    files: number;
    filesRead: number;
    advertisers: number;
    devices: number;
    categories: number;
    statedCategories: number;
  };
  platforms: { id: PlatformId; signals: number; stated: number; observed: number; first?: number; last?: number }[];
  span: { first?: number; last?: number };
  nodes: Record<string, CategoryNode>;
  roots: string[];
  advertisers: AdvertiserResult[];
  devices: DeviceResult[];
  logins: LoginRecord[];
  places: PlaceRecord[];
  profile: ProfileAttr[];
  timeline: { month: string; byPlatform: Partial<Record<PlatformId, number>>; total: number }[];
  heatmap: number[][]; // [weekday][hour]
  coverage: CoverageFile[];
  missing: { platform: PlatformId; what: string; why: string; how: string }[];
  warnings: string[];
  signalsByKind: Record<string, number>;
}
