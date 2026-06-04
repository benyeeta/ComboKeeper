/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'a.ppy.sh',
        port: '',
        pathname: '/**',
      },
    ],
  },
  cacheComponents: true,
};

module.exports = nextConfig;