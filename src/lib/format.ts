import type { Mechanism, PlatformId, Strength } from "./types";

export const fmtDate = (ts?: number, tz?: string) =>
  ts ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: tz }).format(ts) : "date not in export";

export const fmtMonth = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }).format(Date.UTC(y, m - 1, 1));
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

export const STRENGTH_LABEL: Record<Strength, string> = { strong: "Strong", moderate: "Moderate", weak: "Weak" };

export const MECHANISM_TEXT: Record<Mechanism, { title: string; text: string }> = {
  "stated-by-platform": { title: "The platform says so", text: "The platform lists this interest or inference about you in your export." },
  "advertiser-data": { title: "An advertiser holds your data", text: "An advertiser in this area uploaded your details or tracked your activity, per the platform's own list." },
  "off-platform-activity": { title: "Other sites and apps reported you", text: "A site or app outside the platform reported your activity to it." },
  "ad-interaction": { title: "Ads you saw or clicked", text: "Ads from related advertisers were shown to you or clicked." },
  search: { title: "Things you searched for", text: "Your own searches mention this topic." },
  watching: { title: "Things you watched", text: "Videos you watched relate to this topic." },
  following: { title: "Things you follow or like", text: "Accounts, pages, channels or hashtags you follow relate to this topic." },
  "install-or-purchase": { title: "Apps and purchases", text: "Apps you installed or things you bought relate to this topic." },
  browsing: { title: "Pages you visited", text: "Pages or places you visited relate to this topic." },
  profile: { title: "Your profile details", text: "Details on your own profile (job, industry, skills) relate to this topic." },
};

export const PLATFORM_COLOR: Record<PlatformId, string> = {
  facebook: "#3b5ba9",
  instagram: "#b0357a",
  meta: "#5b6fb5",
  google: "#c98a1d",
  youtube: "#c3372c",
  tiktok: "#2b2f33",
  linkedin: "#0a6bb8",
};

export const ORIGIN_COLOR = { stated: "#2742e6", inferred: "#b86e00" } as const;

export const pct = (n: number) => `${Math.round(n * 100)}%`;
export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-GB")} ${n === 1 ? one : many}`;

export function describeOrigin(origin: "stated" | "inferred", platforms: string[]): string {
  return origin === "stated" ? `Stated by ${platforms.join(", ")}` : "Inferred by AdSight from your activity";
}
