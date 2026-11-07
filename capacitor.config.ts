import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.earthi.izalife',
  appName: 'IZA Life',
  webDir: 'dist',
  server: {
    url: 'https://iza-life.ai.studio',
    androidScheme: 'https',
    cleartext: false,
  },
};

export default config;
