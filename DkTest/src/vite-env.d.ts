/// <reference types="vite/client" />

declare const __DK_APP_VERSION__: string;
declare const __DK_ANDROID_VERSION_CODE__: number;
declare const __DK_RELEASE_DATE__: string;
declare const __DK_BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_ANDROID_APK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace JSX {
  interface IntrinsicElements {
    'math-field': any;
  }
}
