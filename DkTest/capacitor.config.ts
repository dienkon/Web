import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'vn.dktest.student',
  appName: 'DkTEST',
  webDir: 'dist-mobile',
  // Assets are shipped inside the APK; never use server.url for production.
  server: { androidScheme: 'https' },
  android: { allowMixedContent: false, backgroundColor: '#0f172a', minWebViewVersion: 103 },
  plugins: { SystemBars: { insetsHandling: 'native' } },
};

export default config;
