import { emptyOutput, type AdvertiserMethod, type ParseOutput, type PlatformId, type Signal } from "../types";
import { collectStrings, fixMojibakeDeep, isObj, parseUserAgent, prop, str, toMs, uid, walk } from "../text";

/** Which Meta export this path belongs to, decided from folder names. */
export function metaPlatformFor(path: string, hints: { instagram: boolean; facebook: boolean }): PlatformId {
  const p = path.toLowerCase();
  if (p.includes("instagram")) return "instagram";
  if (p.includes("facebook")) return "facebook";
  if (hints.instagram && !hints.facebook) return "instagram";
  if (hints.facebook && !hints.instagram) return "facebook";
  return "meta";
}

export const META_KEY_FILES: { test: RegExp; label: string }[] = [
  { test: /advertisers_using_your_activity_or_information\.json$/i, label: "Advertisers using your activity or information" },
  { test: /other_categories_used_to_reach_you\.json$/i, label: "Other categories used to reach you" },
  { test: /ads_viewed\.json$/i, label: "Ads viewed" },
  { test: /ads_clicked\.json$/i, label: "Ads clicked" },
  { test: /your_activity_off_meta_technologies\.json$/i, label: "Activity off Meta technologies" },
  { test: /(interest_categories|recommended_topics|your_topics)\.json$/i, label: "Interest categories and topics" },
];

export function isMetaRelevant(path: string): boolean {
  const p = path.toLowerCase();
  if (!p.endsWith(".json")) return false;
  if (/(^|\/)(messages|photos|videos|stories|reels)(\/|$)/.test(p)) return false;
  return (
    p.includes("ads_information/") ||
    p.includes("advertisers_") ||
    p.includes("off_meta_technologies") ||
    p.includes("off_facebook_activity") ||
    p.includes("ai/interest_categories") ||
    p.includes("your_topics") ||
    p.includes("recommended_topics") ||
    p.includes("ad_preferences") ||
    p.includes("device_information/devices") ||
    p.includes("account_activity") ||
    p.includes("login_and_profile_creation") ||
    p.includes("login_and_account_creation") ||
    p.includes("where_you're_logged_in") ||
    p.includes("where_you've_logged_in") ||
    p.includes("locations_of_interest") ||
    p.includes("profile_based_in") ||
    p.includes("last_known_location") ||
    /search_history|your_search_history|word_or_phrase_searches/.test(p) ||
    /(^|\/)(pages|page_likes|likes_and_reactions|group_membership|your_group_membership_activity)[^/]*\.json$/.test(p)
  );
}

const sig = (platform: PlatformId, kind: Signal["kind"], basis: Signal["basis"], text: string, source: string, ts?: number, note?: string): Signal => ({
  id: uid(),
  platform,
  kind,
  basis,
  text,
  ts,
  source,
  note,
});

/** First entry in a string_map_data object that has text, and the entry that carries a timestamp. */
function readStringMap(item: Record<string, unknown>): { values: string[]; ts?: number; named: Record<string, string> } {
  const sm = prop(item, "string_map_data");
  const values: string[] = [];
  const named: Record<string, string> = {};
  let ts: number | undefined;
  if (isObj(sm)) {
    for (const [k, v] of Object.entries(sm)) {
      if (!isObj(v)) continue;
      const val = str(v.value);
      const t = toMs(v.timestamp);
      if (t && !ts) ts = t;
      if (val) {
        values.push(val);
        named[k] = val;
      }
    }
  }
  return { values, ts, named };
}

export function parseMetaFile(path: string, rawJson: unknown, platform: PlatformId): ParseOutput {
  const out = emptyOutput();
  const json = fixMojibakeDeep(rawJson);
  const lp = path.toLowerCase();
  const before = () => out.signals.length + out.advertisers.length + out.devices.length + out.logins.length + out.places.length;
  const start = before();

  // Advertisers that hold your data or activity
  if (lp.includes("advertisers_using_your_activity_or_information")) {
    walk(json, (n) => {
      if (!isObj(n)) return;
      const name = str(prop(n, "advertiser_name", "advertisername"));
      if (!name) return;
      const methods: AdvertiserMethod[] = [];
      if (prop(n, "has_data_file_custom_audience") === true) methods.push("data-file");
      if (prop(n, "has_remarketing_custom_audience") === true) methods.push("remarketing");
      if (prop(n, "has_in_person_store_visit") === true) methods.push("in-person");
      if (!methods.length) methods.push("listed");
      out.advertisers.push({ platform, name, methods, source: path });
      out.signals.push(sig(platform, "advertiser", "stated", name, path, undefined, methods.join(", ")));
    });
  }

  // Advertisers you interacted with (FB)
  if (lp.includes("advertisers_you") && lp.includes("interacted")) {
    walk(json, (n) => {
      if (!isObj(n)) return;
      const title = str(prop(n, "title"));
      const ts = toMs(prop(n, "timestamp"));
      if (!title || !ts) return;
      const action = str(prop(n, "action")) ?? "";
      const clicked = /click|tap|clic|klick/i.test(action) || action === "";
      out.signals.push(sig(platform, clicked ? "ad-click" : "ad-view", "observed", title, path, ts, action || undefined));
    });
  }

  // Ad impressions and clicks (Instagram and newer Facebook files)
  if (/ads_viewed\.json$|ads_clicked\.json$/.test(lp)) {
    const clicked = lp.endsWith("ads_clicked.json");
    walk(json, (n) => {
      if (!isObj(n)) return;
      if (!("string_map_data" in n) && !("string_list_data" in n)) return;
      const { values, ts } = readStringMap(n);
      let text = values[0];
      if (!text) {
        const sl = prop(n, "string_list_data");
        if (Array.isArray(sl) && isObj(sl[0])) text = str(sl[0].value) ?? "";
      }
      const title = str(prop(n, "title"));
      const label = text || title;
      if (!label) return;
      out.signals.push(sig(platform, clicked ? "ad-click" : "ad-view", "observed", label, path, ts));
    });
  }

  // Topic / interest lists that Meta states about you
  if (/other_categories_used_to_reach_you|interest_categories|recommended_topics|your_topics|ad_preferences|ads_about_meta|see_less_topics|ads_interests/.test(lp)) {
    const seen = new Set<string>();
    const noise = /^(yes|no|true|false|ads|topics|categories|other categories used to reach you)$/i;
    for (const s of collectStrings(json)) {
      const t = s.trim();
      if (t.length < 2 || t.length > 90 || noise.test(t) || seen.has(t.toLowerCase())) continue;
      seen.add(t.toLowerCase());
      out.signals.push(sig(platform, "stated-interest", "stated", t, path));
    }
  }

  // Activity on other sites and apps that was reported to Meta
  if (lp.includes("off_meta_technologies") || lp.includes("off_facebook_activity")) {
    walk(json, (n) => {
      if (!isObj(n)) return;
      const name = str(prop(n, "name"));
      const events = prop(n, "events");
      if (!name || !Array.isArray(events)) return;
      for (const e of events) {
        if (!isObj(e)) continue;
        const type = str(prop(e, "type")) ?? "EVENT";
        out.signals.push(sig(platform, "off-platform", "observed", name, path, toMs(prop(e, "timestamp")), type));
      }
      if (!events.length) out.signals.push(sig(platform, "off-platform", "observed", name, path));
    });
  }

  // Devices and logins
  if (lp.includes("device_information/devices")) {
    walk(json, (n) => {
      if (!isObj(n) || !("string_map_data" in n)) return;
      const { named, ts } = readStringMap(n);
      const ua = Object.entries(named).find(([k]) => /user.?agent|device|gerat|dispositivo/i.test(k))?.[1] ?? Object.values(named)[0];
      if (!ua) return;
      const p = parseUserAgent(ua);
      out.devices.push({ platform, label: p.label, os: p.os, kind: p.kind, lastSeen: ts, count: 1, detail: ua.length > 80 ? undefined : ua, source: path });
    });
  }
  walk(json, (n) => {
    if (!isObj(n)) return;
    const ua = str(prop(n, "user_agent", "useragent"));
    if (!ua) return;
    const ts = toMs(prop(n, "timestamp"));
    const p = parseUserAgent(ua);
    const city = str(prop(n, "city"));
    const region = str(prop(n, "region"));
    const country = str(prop(n, "country"));
    const place = [city, region, country].filter(Boolean).join(", ") || undefined;
    out.devices.push({ platform, label: p.label, os: p.os, kind: p.kind, lastSeen: ts, firstSeen: ts, count: 1, source: path });
    out.logins.push({ platform, ts, ip: str(prop(n, "ip_address", "ip")), device: p.label, place, source: path });
    if (place) out.places.push({ platform, label: place, kind: "login", ts, source: path });
  });

  // Places
  if (/locations_of_interest|profile_based_in|last_known_location/.test(lp)) {
    walk(json, (n) => {
      if (!isObj(n) || !("string_map_data" in n)) return;
      const { values, ts } = readStringMap(n);
      for (const v of values) {
        if (v.length < 80) out.places.push({ platform, label: v, kind: lp.includes("last_known") ? "last-known" : lp.includes("profile_based_in") ? "home-area" : "interest", ts, source: path });
      }
    });
  }

  // Searches
  if (/search_history|your_search_history|word_or_phrase_searches/.test(lp)) {
    walk(json, (n) => {
      if (!isObj(n)) return;
      const ts = toMs(prop(n, "timestamp"));
      const data = prop(n, "data");
      if (Array.isArray(data)) {
        for (const d of data) if (isObj(d)) {
          const t = str(prop(d, "text"));
          if (t) out.signals.push(sig(platform, "search", "observed", t, path, ts));
        }
      }
      if ("string_map_data" in n) {
        const { values, ts: t2 } = readStringMap(n);
        if (values[0]) out.signals.push(sig(platform, "search", "observed", values[0], path, t2 ?? ts));
      }
    });
  }

  // Pages liked and groups joined
  if (/(^|\/)(pages|page_likes|likes_and_reactions|group_membership|your_group_membership_activity)[^/]*\.json$/.test(lp)) {
    walk(json, (n) => {
      if (!isObj(n)) return;
      const ts = toMs(prop(n, "timestamp"));
      const data = prop(n, "data");
      const names: string[] = [];
      if (Array.isArray(data)) for (const d of data) if (isObj(d)) { const nm = str(prop(d, "name")); if (nm) names.push(nm); }
      const direct = str(prop(n, "name"));
      if (direct && !Array.isArray(prop(n, "events"))) names.push(direct);
      for (const nm of names) out.signals.push(sig(platform, "follow", "observed", nm, path, ts));
    });
  }

  out.coverage.push({ path, platform, read: true, records: before() - start });
  return out;
}
