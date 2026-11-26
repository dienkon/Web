import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'vn.dktest.student',
  appName: 'DkTEST',
  webDir: 'dist-mobile',
  // Assets are shipped inside the native bundle; never use server.url for production.
  server: { androidScheme: 'https', iosScheme: 'https' },
  android: { allowMixedContent: false, backgroundColor: '#f8fafc', minWebViewVersion: 103 },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    preferredContentMode: 'mobile',
    backgroundColor: '#f8fafc',
    scheme: 'DkTEST',
  },
  plugins: { SystemBars: { insetsHandling: 'native' } },
};

export default config;
