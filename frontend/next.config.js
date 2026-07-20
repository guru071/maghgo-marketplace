/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Merchants paste product/logo/cover image URLs from anywhere (Google
    // results, their old site, Meta catalog imports). A hostname allow-list
    // silently broke every one of those, so any HTTPS image is permitted.
    // Tradeoff accepted knowingly: Next's optimizer will fetch arbitrary
    // hosts. Sizes are capped and non-image responses simply fail to render.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    // Keep payload sane for phone-heavy traffic.
    deviceSizes: [360, 480, 640, 828, 1080, 1200],
  },
};

module.exports = nextConfig;
