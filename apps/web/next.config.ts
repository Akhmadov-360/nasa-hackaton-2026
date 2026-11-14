import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // lets a production build live next to a running `next dev` (they would otherwise fight over `.next`)
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // monorepo: let Next trace files from the workspace root
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
};

export default config;
