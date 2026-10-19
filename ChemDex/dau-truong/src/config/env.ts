export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

function getEnvVar(key: string, fallback: string = ''): string {
  // Vite client-side env
  if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env[key] === 'string') {
    return import.meta.env[key];
  }
  // Node.js server-side env
  if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string') {
    return process.env[key]!;
  }
  return fallback;
}

export const firebaseConfig: FirebaseClientConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', 'AIzaSyDDPIztE_5W21dxSmPP3hx6wtMQIhnByi8'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', 'chemdex-1710b.firebaseapp.com'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', 'chemdex-1710b'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', 'chemdex-1710b.firebasestorage.app'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', '514538842769'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', '1:514538842769:web:f2283b968401a1d2f2ed30'),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID', 'G-LMTDS0NZRG'),
};

export const serverConfig = {
  discordWebhookUrl: getEnvVar('DISCORD_WEBHOOK_URL'),
  cloudinaryCloudName: getEnvVar('CLOUDINARY_CLOUD_NAME', 'dys3wgutz'),
  cloudinaryUploadPreset: getEnvVar('CLOUDINARY_UPLOAD_PRESET', 'comic_raw_files_preset'),
  port: parseInt(getEnvVar('PORT', '3000'), 10),
};

export function validateClientEnv() {
  const missing: string[] = [];
  if (!firebaseConfig.apiKey) missing.push('VITE_FIREBASE_API_KEY');
  if (!firebaseConfig.projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (missing.length > 0) {
    console.warn(`[Config] Cảnh báo: Thiếu các biến môi trường Firebase: ${missing.join(', ')}`);
  }
}

export function validateServerEnv() {
  const warnings: string[] = [];
  if (!serverConfig.discordWebhookUrl) {
    warnings.push('DISCORD_WEBHOOK_URL chưa được cấu hình. Tính năng báo cáo lỗi qua Discord sẽ bị tắt.');
  }
  if (!serverConfig.cloudinaryUploadPreset) {
    warnings.push('CLOUDINARY_UPLOAD_PRESET chưa được cấu hình.');
  }
  warnings.forEach(w => console.warn(`[Config Server] ${w}`));
}

export function getApiBaseUrl(): string {
  const base = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : '/';
  return base.endsWith('/') ? base : `${base}/`;
}
