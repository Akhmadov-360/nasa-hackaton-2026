import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // monorepo: let Next trace files from the workspace root
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
};

export default config;
