import Constants from 'expo-constants';

import { Platform } from 'react-native';

const isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__;

const readNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue || null;
};

const normalizeApiUrl = (url: string): string => {
  const normalizedUrl = url.trim().replace(/\/$/, '');
  return normalizedUrl.endsWith('/api') ? normalizedUrl : `${normalizedUrl}/api`;
};

const getApiUrl = (): string | null => {
  const configuredUrl =
    readNonEmptyString(process.env.EXPO_PUBLIC_API_URL) ||
    readNonEmptyString(Constants.expoConfig?.extra?.apiUrl);

  // If a production (non-local HTTP) URL is configured, always use it
  if (configuredUrl && !/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.)/i.test(configuredUrl)) {
    return normalizeApiUrl(configuredUrl);
  }

  // If running in Web browser during development, connect to localhost:5000
  if (Platform.OS === 'web' && isDevelopment) {
    return configuredUrl ? normalizeApiUrl(configuredUrl) : 'http://localhost:5000/api';
  }

  // Metro host discovery during local development (auto-detects current Wi-Fi IP)
  if (isDevelopment) {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
      (Constants as any).manifest?.debuggerHost;

    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:5000/api`;
      }
    }
  }

  // Fallback to configured local URL if available
  if (configuredUrl) {
    return normalizeApiUrl(configuredUrl);
  }

  // Android emulator fallback in development
  if (isDevelopment && Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  return null;
};

const apiUrl = getApiUrl();

export const API_CONFIG = {
  BASE_URL: apiUrl || 'https://api-url-not-configured.invalid/api',
  IS_CONFIGURED: Boolean(apiUrl),
  // Fail quickly when the API is unavailable instead of freezing every page
  // for 30 seconds. Image uploads keep their own longer timeout.
  TIMEOUT: 8000,
};
