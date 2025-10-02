import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use Vercel's powerful redirect system to bypass Next.js routing
  // and load the static index.html file in the public folder.
  async redirects() {
    return [
      {
        // When a user hits the root path (yoursite.vercel.app/)
        source: '/',
        // Redirect them to the static index.html file found in the /public folder
        // Note: Files in /public are accessed at the root of the site, so we use /index.html
        destination: '/index.html',
        permanent: true, // Use permanent: true for browsers to cache the redirect
      },
    ];
  },
  // If you have other configuration options, they should be added here.
};

export default nextConfig;
