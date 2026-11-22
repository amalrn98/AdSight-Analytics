import type { SourceFile } from "../../src/lib/ingest";

const T = 1_730_000_000; // seconds, Oct 2024
const f = (path: string, data: unknown): SourceFile => {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  return { path, size: text.length, text: async () => text };
};

/** Synthetic files that follow the documented shapes of each platform's export. */
export function syntheticExport(): SourceFile[] {
  const ig = "instagram-user-2024-10-01-abc/";
  const fb = "facebook-user-2024-10-01-abc/";
  return [
    f(`${ig}ads_information/instagram_ads_and_businesses/advertisers_using_your_activity_or_information.json`, {
      ig_custom_audiences_all_types: [
        { advertiser_name: "Nike", has_data_file_custom_audience: false, has_remarketing_custom_audience: true, has_in_person_store_visit: false },
        { advertiser_name: "Acme Bank", has_data_file_custom_audience: true, has_remarketing_custom_audience: false, has_in_person_store_visit: false },
      ],
    }),
    f(`${ig}ads_information/instagram_ads_and_businesses/other_categories_used_to_reach_you.json`, {
      label_values: [{ label: "Categories", vec: [{ value: "Pet Supplies" }, { value: "Tennis" }, { value: "Zorblax Futures" }] }],
    }),
    f(`${ig}ads_information/ads_and_topics/ads_viewed.json`, {
      impressions_history_ads_seen: [
        { string_map_data: { Author: { value: "Nike", timestamp: 0 }, Time: { timestamp: T } } },
        { string_map_data: { Author: { value: "Nike", timestamp: 0 }, Time: { timestamp: T + 3600 } } },
        { string_map_data: { Author: { value: "Spotify", timestamp: 0 }, Time: { timestamp: T + 7200 } } },
      ],
    }),
    f(`${ig}ads_information/ads_and_topics/ads_clicked.json`, {
      impressions_history_ads_clicked: [{ string_map_data: { Author: { value: "Spotify", timestamp: 0 }, Time: { timestamp: T + 9000 } } }],
    }),
    f(`${ig}apps_and_websites_off_of_instagram/apps_and_websites/your_activity_off_meta_technologies.json`, {
      apps_and_websites_off_meta_activity: [{ name: "Zalando", events: [{ id: 1, type: "ADD_TO_CART", timestamp: T }, { id: 2, type: "PURCHASE", timestamp: T + 100 }] }],
    }),
    f(`${ig}personal_information/device_information/devices.json`, {
      devices_devices: [{ string_map_data: { "User Agent": { value: "Instagram 300.0 Android (33/13; 420dpi; Pixel 7; Google)", timestamp: 0 }, "Last Login": { timestamp: T } } }],
    }),
    f(`${fb}ads_information/advertisers_using_your_activity_or_information.json`, {
      custom_audiences_all_types_v2: [{ advertiser_name: "Zalando", has_data_file_custom_audience: false, has_remarketing_custom_audience: true, has_in_person_store_visit: false }],
    }),
    f(`${fb}security_and_login_information/login_and_account_creation/account_activity.json`, {
      account_activity_v2: [{ action: "Login", timestamp: T, ip_address: "203.0.113.9", user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) FBAN/FBIOS", city: "Leeds", region: "England", country: "GB" }],
    }),
    f("Takeout/My Activity/Search/MyActivity.json", [
      { header: "Search", title: "Searched for ev charger installation", titleUrl: "https://www.google.com/search?q=ev+charger", time: "2024-10-02T10:00:00.000Z", products: ["Search"] },
      { header: "Search", title: "Searched for ev charger installation", time: "2024-10-03T10:00:00.000Z", products: ["Search"] },
      { header: "Search", title: "Visited Tesla Model 3 review", titleUrl: "https://www.example.com/x", time: "2024-10-04T10:00:00.000Z", details: [{ name: "From Google Ads" }] },
    ]),
    f("Takeout/YouTube and YouTube Music/history/watch-history.json", [
      { header: "YouTube", title: "Watched Sourdough bread for beginners", titleUrl: "https://youtube.com/watch?v=1", subtitles: [{ name: "Baking Channel" }], time: "2024-10-05T20:00:00.000Z" },
    ]),
    f("Takeout/Google Play Store/Installs.json", [
      { install: { doc: { documentType: "Android Apps", title: "Strava: Run, Ride" }, firstInstallationTime: "2023-01-01T00:00:00Z", deviceAttribute: { manufacturer: "Google", deviceDisplayName: "Pixel 7" } } },
    ]),
    f("user_data_tiktok.json", {
      Profile: { "Profile Information": { ProfileMap: { userName: "x" } } },
      Activity: {
        "Login History": { LoginHistoryList: [{ Date: "2024-10-01 10:00:00", IP: "198.51.100.4", DeviceModel: "iPhone14,2", DeviceSystem: "iOS 17.2", NetworkType: "WIFI", Carrier: "" }] },
        "Search History": { SearchList: [{ Date: "2024-10-02 10:00:00", SearchTerm: "vegan recipes" }] },
      },
      "Ads and data": {
        "Ad Interests": { AdInterestCategories: "Apparel & Accessories,Games,Pets" },
        "Off TikTok Activity": { OffTikTokActivityDataList: [{ TimeStamp: "2024-10-03 12:00:00", Source: "Amazon", Event: "ADD_TO_CART" }] },
      },
      "App Settings": {},
    }),
    f("Connections/Ad_Targeting.csv", 'Company Category,Gender,Job Titles,Member Interests,Industries\n"Software","Female","Software Engineer; Team Lead","Machine learning; Marathon running","Information Technology"\n'),
    f("Connections/Ads Clicked.csv", "Ad clicked Date,Ad Title/Id\n2024/10/03 12:00:00 UTC,urn:li:sponsoredCreative:123\n"),
    f("Connections/Inferences_about_you.csv", 'Category Name,Type of Inference,Description,Inference\nWork,Seniority,Level,"Senior"\n'),
    f("Takeout/My Activity/Search/MyActivity.html", "<html></html>"),
    f(`${ig}your_instagram_activity/messages/inbox/thread/message_1.json`, { messages: [{ content: "secret" }] }),
  ];
}
