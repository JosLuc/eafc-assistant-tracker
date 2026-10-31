import type { NextConfig } from 'next';
const config: NextConfig = {
  images: { remotePatterns: [{ hostname: 'ratings-images-prod.pulse.ea.com' }, { hostname: 'drop-assets.ea.com' }] },
};
export default config;
