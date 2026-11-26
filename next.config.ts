import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

export default function createNextConfig(phase: string): NextConfig {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    /* Isolate dev artifacts from production builds so concurrent `next build` never corrupts `next dev` */
    distDir: isDev ? '.next-dev' : '.next',
    output: 'standalone',
    serverExternalPackages: ['genkit', '@genkit-ai/googleai', '@genkit-ai/next'],
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '**',
        },
        {
          protocol: 'http',
          hostname: '**',
        },
      ],
    },
  };
}
