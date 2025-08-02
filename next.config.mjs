import withPWA from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Add experimental features to improve performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Optimize Fast Refresh to prevent constant rebuilding
  ...(process.env.NODE_ENV === 'development' && {
    fastRefresh: {
      // Reduce the frequency of Fast Refresh checks
      refreshInterval: 1000,
    },
  }),
  // Optimize webpack for development
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Reduce the number of files watched in development
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: [
          '**/node_modules', 
          '**/.git', 
          '**/.next',
          '**/public/favicon.ico', // Ignore favicon changes
          '**/*.DS_Store',
          '**/*.swp',
          '**/*.tmp'
        ],
      };
    }
    return config;
  },
  // Add headers to prevent unnecessary requests
  async headers() {
    return [
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

const pwaConfig = withPWA({
  dest: 'public',
  register: process.env.NODE_ENV === 'production',
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  sw: 'sw.js',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

export default pwaConfig(nextConfig);
