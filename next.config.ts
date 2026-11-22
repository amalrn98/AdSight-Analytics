import type { NextConfig } from "next";

// Static export: the site is plain files with no server code, so there is no
// backend that could receive, log or store anyone's data.
const config: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default config;
