import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "www.notion.so",
            },
            {
                protocol: "https",
                hostname: "notion.so",
            },
            {
                protocol: "https",
                hostname: "secure.notion-static.com",
            },
            {
                protocol: "https",
                hostname: "prod-files-secure.s3.us-west-2.amazonaws.com",
            },
            {
                protocol: "https",
                hostname: "s3.us-west-2.amazonaws.com",
            },
        ],
    },
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
