import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // monorepo: let Next trace files from the workspace root
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
};

export default config;
