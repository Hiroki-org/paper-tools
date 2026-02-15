import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /** workspace パッケージをトランスパイル対象にする */
    transpilePackages: [
        "@paper-tools/core",
        "@paper-tools/drilldown",
        "@paper-tools/visualizer",
        "@paper-tools/recommender",
        "@paper-tools/scraper",
    ],
};

export default nextConfig;
