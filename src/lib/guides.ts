export interface Guide {
  id: string;
  name: string;
  summary: string;
  link?: { href: string; label: string };
  steps: string[];
  gives: string;
  limits?: string;
}

export const GUIDES: Guide[] = [
  {
    id: "meta",
    name: "Facebook and Instagram",
    summary: "Meta's Accounts Center export",
    link: { href: "https://accountscenter.facebook.com/info_and_permissions/dyi", label: "Open Meta's Download your information" },
    steps: [
      "Choose Export to device, then pick the Facebook or Instagram account.",
      "Under What to export, tick Ads information, Personal information, Security and login information and Preferences. Everything else is optional.",
      "Set Date range to All time and Format to JSON (not HTML).",
      "Meta emails you when the file is ready. Download the ZIP and drop it here without unzipping.",
    ],
    gives: "Advertisers using your activity or information (and how), interest categories, ads shown and clicked, activity reported by other sites and apps, devices and logins.",
    limits: "Meta does not say why one specific ad was shown. AdSight joins its advertiser list to the ads you saw and labels everything else as inference.",
  },
  {
    id: "google",
    name: "Google and YouTube",
    summary: "Google Takeout",
    link: { href: "https://takeout.google.com", label: "Open Google Takeout" },
    steps: [
      "Click Deselect all, then tick My Activity, YouTube and YouTube Music, Chrome, Google Play Store, Profile and Maps (your places).",
      "Under My Activity and YouTube, set the format to JSON. The default is HTML, which AdSight cannot read.",
      "Create the export and download every ZIP Google gives you. Drop them all here.",
    ],
    gives: "Searches, watched videos, Chrome history, app installs and the devices they came from, ads you interacted with, and your profile's age and gender.",
    limits: "Takeout does not include the interests in Google's My Ad Center, so Google's topics are inferred from your activity, not read.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    summary: "In-app data download",
    steps: [
      "In the TikTok app: Profile, menu, Settings and privacy, Account, Download your data.",
      "Choose the JSON file format and request the data.",
      "When it is ready, download the ZIP (it contains user_data_tiktok.json) and drop it here.",
    ],
    gives: "Ad interest categories, off-TikTok activity reported by other apps and sites, login history with device models, searches and hashtags.",
    limits: "Video history has links and dates but no captions, so it is used for timing only.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    summary: "LinkedIn data archive",
    link: { href: "https://www.linkedin.com/mypreferences/d/download-my-data", label: "Open LinkedIn's Get a copy of your data" },
    steps: [
      "Choose the larger data archive, or pick the items covering ads, search, logins and your profile.",
      "LinkedIn emails a link when it is ready. Download the ZIP and drop it here.",
    ],
    gives: "Ad Targeting (how LinkedIn classifies you for advertisers), ads clicked, inferences about you, search queries, logins and company follows.",
  },
];
