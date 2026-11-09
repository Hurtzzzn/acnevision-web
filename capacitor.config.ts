import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.acnevision.mobile',
  appName: 'AcneVision AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;

